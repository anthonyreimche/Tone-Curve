// The panel and its mask instance: core's CurveEditor over the photo's curves
// (each drag one "Tone Curve" step) and over the mask's own, both following
// Preferences ▸ Tone Curve ▸ Show point values live, without reopening.

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { React, initRuntime } from "../src/rt";
import { TONE_CURVE_MASK_PANEL, ToneCurvePanel } from "../src/ToneCurvePanel";
import { DEFAULT_CURVES, fakeApi } from "./support/fake-api";

const BENT = [
  { x: 0, y: 0.1 },
  { x: 1, y: 0.9 },
];

afterEach(cleanup);

describe("the Tone Curve panel", () => {
  it("edits the photo's curves and commits each drag as one step", () => {
    const rig = fakeApi();
    initRuntime(rig.api);
    render(<ToneCurvePanel />);
    expect(rig.editor()).toMatchObject({ curves: DEFAULT_CURVES, showPointValues: false });
    expect(rig.editor().compact).toBeUndefined();
    act(() => {
      rig.editor().onChange("green", BENT);
      rig.editor().onCommit();
    });
    expect(rig.calls).toEqual([{ setToneCurve: "green", points: BENT }, { commitEdit: "Tone Curve" }]);
    expect(rig.editor().curves.green).toEqual(BENT);
  });

  it("shows the point values as soon as the preference turns them on", () => {
    const rig = fakeApi();
    initRuntime(rig.api);
    render(<ToneCurvePanel />);
    act(() => rig.setSetting("showPointValues", true));
    expect(rig.editor().showPointValues).toBe(true);
  });
});

describe("the mask instance", () => {
  it("edits the mask's own curves, compact, from straight lines", () => {
    const rig = fakeApi();
    initRuntime(rig.api);
    const Mask = TONE_CURVE_MASK_PANEL.component;
    render(<Mask />);
    expect(rig.editor()).toMatchObject({ curves: DEFAULT_CURVES, compact: true });
    act(() => {
      rig.editor().onChange("rgb", BENT);
      rig.editor().onCommit();
    });
    expect(rig.mask.toneCurve).toEqual({ ...DEFAULT_CURVES, rgb: BENT });
    expect(rig.mask.commits).toEqual(["Mask Tone Curve"]);
    expect(rig.calls).toEqual([]);
  });

  it("follows the point-values preference too", () => {
    const rig = fakeApi();
    rig.setSetting("showPointValues", true);
    initRuntime(rig.api);
    const Mask = TONE_CURVE_MASK_PANEL.component;
    render(<Mask />);
    expect(rig.editor().showPointValues).toBe(true);
  });
});
