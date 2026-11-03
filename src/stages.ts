// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The tone curve's block of the develop program. Until Safelight 3.2.0 it was
// core's own; its GLSL is core's, moved as written. It runs at the develop
// program's tone-curve anchor, after Whites, Blacks and Contrast, and reads
// one 256×1 table per photo: the master curve composed into each channel's
// (curve.ts). Line 1 keeps the 8-bit table it was frozen with; lines 2 and 3
// use half floats for process version 2 and later photos, so a gentle curve
// is not quantized to 1/255, and the 8-bit table for version 1 photos. Line 1
// runs on every pixel, as core did for a version 1 photo; lines 2 and 3 skip
// straight curves. Both read the table at the colour clipped to [0, 1]; from
// process version 2, lines 2 and 3 add back what the clip took.

import { buildRGBCurveLUT, buildRGBCurveLUTFloat, isDefaultToneCurves } from "./curve";
import type { Line, ProcessingStageContribution, StageDerive } from "./safelight";

export const STAGE_ID = "safelight.tone-curve.curve";

const TONE_CURVE_HELPERS = `vec3 applyToneCurve(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  // Per-channel LUTs packed into RGBA (master curve already composed in).
  c.r = texture(uCurve, vec2(c.r, 0.5)).r;
  c.g = texture(uCurve, vec2(c.g, 0.5)).g;
  c.b = texture(uCurve, vec2(c.b, 0.5)).b;
  return c;
}`;

// The table covers [0, 1]. From process version 2 a colour past either end
// reads the table's edge and keeps its own excess, so highlights and colours
// outside sRGB pass a curve unclipped; version 1 photos keep line 1's clip.
const RANGED_TONE_CURVE_HELPERS = `vec3 applyToneCurve(vec3 c) {
#if SL_PROCESS_VERSION >= 2
  vec3 s = clamp(c, 0.0, 1.0);
  vec3 t = vec3(texture(uCurve, vec2(s.r, 0.5)).r, texture(uCurve, vec2(s.g, 0.5)).g, texture(uCurve, vec2(s.b, 0.5)).b);
  return t + (c - s);
#else
  c = clamp(c, 0.0, 1.0);
  // Per-channel LUTs packed into RGBA (master curve already composed in).
  c.r = texture(uCurve, vec2(c.r, 0.5)).r;
  c.g = texture(uCurve, vec2(c.g, 0.5)).g;
  c.b = texture(uCurve, vec2(c.b, 0.5)).b;
  return c;
#endif
}`;

/** Bumped for every table derived, so the renderer uploads each new one. */
let tableVersion = 0;

const table8: StageDerive = ({ toneCurve }) => ({
  uCurve: { data: buildRGBCurveLUT(toneCurve), width: 256, height: 1, format: "rgba8", version: ++tableVersion },
});

/** Half floats from process version 2; a version 1 photo keeps the 8-bit
 *  table it was edited with. */
const versionedTable: StageDerive = (params, ctx) =>
  params.processVersion >= 2
    ? {
        uCurve: { data: buildRGBCurveLUTFloat(params.toneCurve), width: 256, height: 1, format: "rgba16f", version: ++tableVersion },
      }
    : table8(params, ctx);

/** The stage of release line `line`. */
export function toneCurveStage(line: Line): ProcessingStageContribution {
  const base = {
    id: STAGE_ID,
    name: "Tone Curve",
    phase: "display-adjust",
    anchor: "tone-curve",
    textures: [{ key: "uCurve", kind: "photo" }],
  } as const;
  if (line === 1) {
    return { ...base, glsl: "c = applyToneCurve(c);", helpers: TONE_CURVE_HELPERS, uniforms: [], derive: table8 };
  }
  return {
    ...base,
    glsl: "if (uCurveActive) c = applyToneCurve(c);",
    helpers: RANGED_TONE_CURVE_HELPERS,
    uniforms: [{ key: "uCurveActive", glslType: "bool", default: false }],
    derive: (params, ctx) => ({ ...versionedTable(params, ctx), uCurveActive: !isDefaultToneCurves(params.toneCurve) }),
  };
}
