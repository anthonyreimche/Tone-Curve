// The stage each release line registers, and the table it reads. Its text is
// pinned with the hashes Safelight's own tests hold for its copy of it
// (src/rendering/webgl/essential-stages.test.ts in the app): a change here
// fails until the app's copy changes the same way, so the program a line
// builds stays the one the app froze for that line's process version.

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildRGBCurveLUT, buildRGBCurveLUTFloat, isDefaultToneCurves } from "../src/curve";
import type { Line, ProcessingStageContribution, StageDeriveContext, StageTextureData, ToneCurves } from "../src/safelight";
import { STAGE_ID, toneCurveStage } from "../src/stages";
import { DEFAULT_CURVES } from "./support/fake-api";

const LINE_HASHES: Record<Line, string> = {
  1: "08fe7f3021f135193e885c5e352722c697401e2755e075b93c476718a8495863",
  2: "f7592ca5128d47f9e5c97a5ad7f41224760ee3fd07cc7737000240ebee6d98b1",
  3: "f7592ca5128d47f9e5c97a5ad7f41224760ee3fd07cc7737000240ebee6d98b1",
};

/** What a line's hash covers, as the app's stageText writes it. */
const stageText = (s: ProcessingStageContribution): string =>
  JSON.stringify([s.id, s.phase, s.priority ?? null, s.anchor ?? null, s.glsl, s.helpers ?? null, s.uniforms, s.textures ?? null]);

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

const CTX: StageDeriveContext = { settings: (_key, fallback) => fallback };

/** The source as the host's GLSL preprocessor leaves it for a photo at
 *  `version`: the `#if SL_PROCESS_VERSION >= n` branches resolved and the
 *  directive lines gone. */
function forVersion(src: string, version: number): string {
  const taking: boolean[] = [];
  const out: string[] = [];
  for (const line of src.split("\n")) {
    const open = /^\s*#if SL_PROCESS_VERSION >= (\d+)\s*$/.exec(line);
    if (open) taking.push(version >= Number(open[1]));
    else if (/^\s*#else\s*$/.test(line)) taking.push(!taking.pop());
    else if (/^\s*#endif\s*$/.test(line)) taking.pop();
    else if (taking.every(Boolean)) out.push(line);
  }
  expect(taking).toEqual([]);
  return out.join("\n");
}

const S_CURVE: ToneCurves = {
  ...DEFAULT_CURVES,
  rgb: [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.18 },
    { x: 0.75, y: 0.82 },
    { x: 1, y: 1 },
  ],
};

const tableOf = (stage: ProcessingStageContribution, curves: ToneCurves, processVersion = 2) =>
  stage.derive?.({ toneCurve: curves, processVersion }, CTX).uCurve as StageTextureData;

describe("toneCurveStage", () => {
  it.each([1, 2, 3] as const)("registers line %i's text as the app froze it", (line) => {
    expect(sha256(stageText(toneCurveStage(line)))).toBe(LINE_HASHES[line]);
  });

  it("runs at the tone-curve anchor and reads one photo table", () => {
    expect(toneCurveStage(3)).toMatchObject({
      id: STAGE_ID,
      phase: "display-adjust",
      anchor: "tone-curve",
      textures: [{ key: "uCurve", kind: "photo" }],
    });
  });

  it.each([2, 3] as const)("keeps the range past the table on line %i for process version 2 and later", (line) => {
    const helpers = forVersion(toneCurveStage(line).helpers ?? "", 2);
    expect(helpers).not.toMatch(/\bc\s*=\s*clamp\(c\b/);
    expect(helpers).toMatch(/vec3 s = clamp\(c, 0\.0, 1\.0\);/);
    for (const ch of ["r", "g", "b"]) expect(helpers).toContain(`texture(uCurve, vec2(s.${ch}, 0.5)).${ch}`);
    expect(helpers).toMatch(/return \w+ \+ \(c - s\);\s*\}$/);
    expect(forVersion(toneCurveStage(line).helpers ?? "", 3)).toBe(helpers);
  });

  it.each([2, 3] as const)("gives a process version 1 photo line 1's clipping lookup on line %i", (line) => {
    expect(forVersion(toneCurveStage(line).helpers ?? "", 1)).toBe(toneCurveStage(1).helpers);
  });

  it("puts each directive on its own line, and none in line 1's frozen text", () => {
    expect(toneCurveStage(1).helpers).not.toContain("#");
    const helpers = toneCurveStage(3).helpers ?? "";
    expect(helpers).toContain("#if SL_PROCESS_VERSION >= 2");
    for (const l of helpers.split("\n").filter((x) => x.trim().startsWith("#"))) {
      expect(l).toMatch(/^(#if SL_PROCESS_VERSION >= 2|#else|#endif)$/);
    }
  });

  it("runs on every pixel on line 1, and only for a bent curve from line 2", () => {
    expect(toneCurveStage(1).glsl).toBe("c = applyToneCurve(c);");
    expect(toneCurveStage(1).uniforms).toEqual([]);
    expect(toneCurveStage(3).glsl).toBe("if (uCurveActive) c = applyToneCurve(c);");
    expect(toneCurveStage(3).derive?.({ toneCurve: S_CURVE, processVersion: 2 }, CTX)).toMatchObject({ uCurveActive: true });
    expect(toneCurveStage(3).derive?.({ toneCurve: DEFAULT_CURVES, processVersion: 2 }, CTX)).toMatchObject({ uCurveActive: false });
  });

  it("fills line 1's 8-bit table from the photo's curves, as it was frozen", () => {
    const table = tableOf(toneCurveStage(1), S_CURVE);
    expect(table).toMatchObject({ width: 256, height: 1, format: "rgba8" });
    expect(table.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(table.data)).toEqual(Array.from(buildRGBCurveLUT(S_CURVE)));
  });

  it.each([2, 3] as const)("fills line %i's table in half floats, so the curve is not quantized", (line) => {
    const table = tableOf(toneCurveStage(line), S_CURVE);
    expect(table).toMatchObject({ width: 256, height: 1, format: "rgba16f" });
    expect(table.data).toBeInstanceOf(Float32Array);
    expect(Array.from(table.data)).toEqual(Array.from(buildRGBCurveLUTFloat(S_CURVE)));
  });

  // A process version 1 photo keeps the 8-bit table every line read before
  // the half-float one, so its curve renders as it was edited.
  it.each([1, 2, 3] as const)("fills line %i's table in 8 bits for a process version 1 photo", (line) => {
    const table = tableOf(toneCurveStage(line), S_CURVE, 1);
    expect(table).toMatchObject({ width: 256, height: 1, format: "rgba8" });
    expect(table.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(table.data)).toEqual(Array.from(buildRGBCurveLUT(S_CURVE)));
  });

  it.each([2, 3] as const)("fills line %i's table in half floats for process versions 2 and 3", (line) => {
    for (const processVersion of [2, 3]) {
      expect(tableOf(toneCurveStage(line), S_CURVE, processVersion)).toMatchObject({ format: "rgba16f" });
    }
  });

  it("gives every table a new version, so the renderer uploads it", () => {
    const stage = toneCurveStage(3);
    expect(tableOf(stage, S_CURVE).version).not.toBe(tableOf(stage, S_CURVE).version);
  });

  it("derives line 1's table only, and line 3's table and switch", () => {
    expect(Object.keys(toneCurveStage(1).derive?.({ toneCurve: S_CURVE, processVersion: 2 }, CTX) ?? {})).toEqual(["uCurve"]);
    expect(Object.keys(toneCurveStage(3).derive?.({ toneCurve: S_CURVE, processVersion: 2 }, CTX) ?? {}).sort()).toEqual([
      "uCurve",
      "uCurveActive",
    ]);
  });
});

describe("buildRGBCurveLUT", () => {
  // The baseline look lives in the program (baselineTone), so the table
  // carries only what the user drew: straight curves leave every level alone.
  it("composes straight curves to the identity", () => {
    const lut = buildRGBCurveLUT(DEFAULT_CURVES);
    expect(lut).toHaveLength(256 * 4);
    for (let i = 0; i < 256; i++) expect([lut[i * 4], lut[i * 4 + 1], lut[i * 4 + 2], lut[i * 4 + 3]]).toEqual([i, i, i, 255]);
  });

  it("applies the master curve before the channel's", () => {
    // The master halves, then red maps 0..1 onto 0.5..1: red = 0.5 + 0.25·x.
    // The other order would give 0.25 + 0.25·x, which the ends tell apart.
    const lut = buildRGBCurveLUT({
      ...DEFAULT_CURVES,
      rgb: [
        { x: 0, y: 0 },
        { x: 1, y: 0.5 },
      ],
      red: [
        { x: 0, y: 0.5 },
        { x: 1, y: 1 },
      ],
    });
    expect(lut[0]).toBe(128);
    expect(lut[255 * 4]).toBe(191);
    expect(lut[255 * 4 + 1]).toBe(128);
    expect(lut[255 * 4 + 2]).toBe(128);
  });
});

describe("buildRGBCurveLUTFloat", () => {
  it("composes straight curves to the identity at full precision", () => {
    const lut = buildRGBCurveLUTFloat(DEFAULT_CURVES);
    expect(lut).toBeInstanceOf(Float32Array);
    expect(lut).toHaveLength(256 * 4);
    for (let i = 0; i < 256; i++) {
      for (let c = 0; c < 3; c++) expect(lut[i * 4 + c]).toBeCloseTo(i / 255, 6);
      expect(lut[i * 4 + 3]).toBe(1);
    }
  });

  it("keeps a difference smaller than 1/255 that the 8-bit table rounds away", () => {
    const gentle: ToneCurves = {
      ...DEFAULT_CURVES,
      rgb: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5015 },
        { x: 1, y: 1 },
      ],
    };
    const mid = 128;
    const float = buildRGBCurveLUTFloat(gentle)[mid * 4];
    const drift = float - mid / 255;
    expect(drift).toBeGreaterThan(0.0005);
    expect(drift).toBeLessThan(1 / 255);
    expect(buildRGBCurveLUT(gentle)[mid * 4]).toBe(mid);
  });

  it("applies the master curve before the channel's", () => {
    const lut = buildRGBCurveLUTFloat({
      ...DEFAULT_CURVES,
      rgb: [
        { x: 0, y: 0 },
        { x: 1, y: 0.5 },
      ],
      red: [
        { x: 0, y: 0.5 },
        { x: 1, y: 1 },
      ],
    });
    expect(lut[0]).toBeCloseTo(0.5, 6);
    expect(lut[255 * 4]).toBeCloseTo(0.75, 6);
    expect(lut[255 * 4 + 1]).toBeCloseTo(0.5, 6);
  });
});

describe("isDefaultToneCurves", () => {
  it("is true only for four straight lines", () => {
    expect(isDefaultToneCurves(DEFAULT_CURVES)).toBe(true);
    expect(isDefaultToneCurves(S_CURVE)).toBe(false);
  });
});
