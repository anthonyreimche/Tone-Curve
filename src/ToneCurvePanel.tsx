// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The Develop "Tone Curve" panel and its per-mask instance, both core's
// CurveEditor: over the photo's curves, and over a mask's own. Preferences ▸
// Tone Curve's Show point values adds the selected point's In and Out boxes to
// both, live.

import { React, api } from "./rt";
import type { MaskPanelContribution, ToneCurves } from "./safelight";

export const SHOW_POINT_VALUES = "showPointValues";

const LINE = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];
const DEFAULT_CURVES: ToneCurves = { rgb: LINE, red: LINE, green: LINE, blue: LINE };

/** The preference, following changes while the panel is open. */
function useShowPointValues(): boolean {
  const read = () => api.settings.get(SHOW_POINT_VALUES, false);
  const [show, setShow] = React.useState(read);
  React.useEffect(() => api.settings.onChange(() => setShow(read())), []);
  return show;
}

export function ToneCurvePanel() {
  const { Panel } = api.components;
  return (
    <Panel title="Tone Curve">
      <GlobalCurveEditor />
    </Panel>
  );
}

// Its own component, so the editor mounts with the Panel's open state and
// draws its canvas each time it opens.
function GlobalCurveEditor() {
  const { CurveEditor } = api.components;
  const useDevelopStore = api.stores.useDevelopStore;
  const curves = useDevelopStore((s) => s.params.toneCurve);
  const setToneCurve = useDevelopStore((s) => s.setToneCurve);
  const commitEdit = useDevelopStore((s) => s.commitEdit);
  const showPointValues = useShowPointValues();
  return (
    <CurveEditor
      curves={curves}
      onChange={setToneCurve}
      onCommit={() => void commitEdit("Tone Curve")}
      showPointValues={showPointValues}
    />
  );
}

// A mask's curves start from the colour as developed (no base curve), and are
// absent until the sub-panel is added.
function ToneCurveMaskPanel() {
  const { CurveEditor } = api.components;
  const scope = api.develop.useMaskScope();
  const curves = scope.toneCurve ?? DEFAULT_CURVES;
  const showPointValues = useShowPointValues();
  return (
    <CurveEditor
      compact
      curves={curves}
      onChange={(channel, points) => scope.setToneCurve({ ...curves, [channel]: points })}
      onCommit={() => scope.commit("Mask Tone Curve")}
      showPointValues={showPointValues}
    />
  );
}

export const TONE_CURVE_MASK_PANEL: MaskPanelContribution = {
  component: ToneCurveMaskPanel,
  order: 30,
  owns: ["toneCurve"],
};
