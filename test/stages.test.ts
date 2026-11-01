// The stage each release line registers, and the table it reads. Its text is
// pinned with the hashes Safelight's own tests hold for its copy of it
// (src/rendering/webgl/essential-stages.test.ts in the app): a change here
// fails until the app's copy changes the same way, so the program a line
// builds stays the one the app froze for that line's process version.

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildRGBCurveLUT, isDefaultToneCurves } from "../src/curve";
import type { Line, ProcessingStageContribution, StageDeriveContext, StageTextureData, ToneCurves } from "../src/safelight";
import { STAGE_ID, toneCurveStage } from "../src/stages";
import { DEFAULT_CURVES } from "./support/fake-api";

const LINE_HASHES: Record<Line, string> = {
  1: "08fe7f3021f135193e885c5e352722c697401e2755e075b93c476718a8495863",
  2: "e0e565669513c7ad8e0eed360bad2e453ce20785f486b6e63c783e466ecd2203",
  3: "e0e565669513c7ad8e0eed360bad2e453ce20785f486b6e63c783e466ecd2203",
};

/** What a line's hash covers, as the app's stageText writes it. */
const stageText = (s: ProcessingStageContribution): string =>
  JSON.stringify([s.id, s.phase, s.priority ?? null, s.anchor ?? null, s.glsl, s.helpers ?? null, s.uniforms, s.textures ?? null]);

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

const CTX: StageDeriveContext = { settings: (_key, fallback) => fallback };

const S_CURVE: ToneCurves = {
  ...DEFAULT_CURVES,
  rgb: [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.18 },
    { x: 0.75, y: 0.82 },
    { x: 1, y: 1 },
  ],
};

const tableOf = (stage: ProcessingStageContribution, curves: ToneCurves) =>
  stage.derive?.({ toneCurve: curves }, CTX).uCurve as StageTextureData;

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

  it("runs on every pixel on line 1, and only for a bent curve from line 2", () => {
    expect(toneCurveStage(1).glsl).toBe("c = applyToneCurve(c);");
    expect(toneCurveStage(1).uniforms).toEqual([]);
    expect(toneCurveStage(3).glsl).toBe("if (uCurveActive) c = applyToneCurve(c);");
    expect(toneCurveStage(3).derive?.({ toneCurve: S_CURVE }, CTX)).toMatchObject({ uCurveActive: true });
    expect(toneCurveStage(3).derive?.({ toneCurve: DEFAULT_CURVES }, CTX)).toMatchObject({ uCurveActive: false });
  });

  it.each([1, 3] as const)("fills line %i's table from the photo's curves", (line) => {
    const table = tableOf(toneCurveStage(line), S_CURVE);
    expect(table).toMatchObject({ width: 256, height: 1, format: "rgba8" });
    expect(Array.from(table.data)).toEqual(Array.from(buildRGBCurveLUT(S_CURVE)));
  });

  it("gives every table a new version, so the renderer uploads it", () => {
    const stage = toneCurveStage(3);
    expect(tableOf(stage, S_CURVE).version).not.toBe(tableOf(stage, S_CURVE).version);
  });

  it("derives line 1's table only, and line 3's table and switch", () => {
    expect(Object.keys(toneCurveStage(1).derive?.({ toneCurve: S_CURVE }, CTX) ?? {})).toEqual(["uCurve"]);
    expect(Object.keys(toneCurveStage(3).derive?.({ toneCurve: S_CURVE }, CTX) ?? {}).sort()).toEqual([
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

describe("isDefaultToneCurves", () => {
  it("is true only for four straight lines", () => {
    expect(isDefaultToneCurves(DEFAULT_CURVES)).toBe(true);
    expect(isDefaultToneCurves(S_CURVE)).toBe(false);
  });
});
