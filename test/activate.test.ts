// What activate() registers: the Tone Curve panel under core's old panel id,
// title, dock spot, reset and mask instance (so saved layouts and masks keep
// it), Preferences ▸ Tone Curve as core had it, and the curves' stage of this
// release's line.

import { describe, expect, it } from "vitest";
import { LINE, PANEL_ID, activate } from "../src/index";
import type { ProcessingStageContribution } from "../src/safelight";
import { TONE_CURVE_SETTINGS } from "../src/settings";
import { toneCurveStage } from "../src/stages";
import { TONE_CURVE_MASK_PANEL, ToneCurvePanel } from "../src/ToneCurvePanel";
import manifest from "../safelight.json";
import { fakeApi } from "./support/fake-api";

const text = ({ derive: _, ...rest }: ProcessingStageContribution) => rest;

describe("activate", () => {
  it("registers the Tone Curve panel, as core's core.tone-curve did", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.panels).toEqual([
      {
        id: "core.tone-curve",
        title: "Tone Curve",
        component: ToneCurvePanel,
        defaultDock: { module: "develop", direction: "right", order: 6, width: 280, height: 220 },
        onReset: expect.any(Function),
        mask: TONE_CURVE_MASK_PANEL,
      },
    ]);
    expect(PANEL_ID).toBe("core.tone-curve");
    expect(TONE_CURVE_MASK_PANEL).toMatchObject({ order: 30, owns: ["toneCurve"] });
  });

  it("resets the curves as one step from the dock header", () => {
    const rig = fakeApi();
    activate(rig.api);
    rig.panels[0].onReset?.();
    expect(rig.calls).toEqual([{ resetParams: ["toneCurve"], label: "Reset Tone Curve" }]);
  });

  it("registers Preferences ▸ Tone Curve with core's key", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.settingsSections).toEqual([TONE_CURVE_SETTINGS]);
    expect(TONE_CURVE_SETTINGS.fields.map((f) => [f.key, f.default])).toEqual([["showPointValues", false]]);
  });

  it("registers the stage of the line its major version names", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(LINE).toBe(Number(manifest.version.split(".")[0]));
    expect(rig.stages.map(text)).toEqual([text(toneCurveStage(LINE))]);
  });

  it("is a line 3 release", () => {
    expect(LINE).toBe(3);
  });
});
