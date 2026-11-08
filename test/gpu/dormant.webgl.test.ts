// The Tone Curve stage on the real renderer (run via `npm run test:gpu`): with
// every curve straight it leaves the frame as it would be without the stage,
// and the live view leaves it out; bend the master or one channel's curve and
// it is back in and the frame changes. Line 1 looks every pixel up and
// declares no rule.

import { DEFAULT_DEVELOP_PARAMS, proveDormancy } from "./dormancy-rig";
import { STAGE_ID, toneCurveStage } from "@ext/stages";

const CURVES = DEFAULT_DEVELOP_PARAMS.toneCurve;
const BENT = [
  { x: 0, y: 0 },
  { x: 0.25, y: 0.1 },
  { x: 0.75, y: 0.9 },
  { x: 1, y: 1 },
];

proveDormancy("safelight.tone-curve", (line) => [toneCurveStage(line)], {
  title: "Tone Curve",
  stageId: STAGE_ID,
  lines: [2, 3],
  moves: {
    "the master curve": { toneCurve: { ...CURVES, rgb: BENT } },
    "the red curve": { toneCurve: { ...CURVES, red: BENT } },
    "the blue curve": { toneCurve: { ...CURVES, blue: BENT } },
  },
});
