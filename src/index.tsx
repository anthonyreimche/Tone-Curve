// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Registers the Develop "Tone Curve" panel with its mask instance,
// Preferences ▸ Tone Curve, and the curves' stage of this release's line. It
// was core's built-in `core.tone-curve` until Safelight 3.2.0 and keeps that
// panel id, so saved layouts keep it where it was.

import { TONE_CURVE_MASK_PANEL, ToneCurvePanel } from "./ToneCurvePanel";
import { initRuntime } from "./rt";
import type { Line, SafelightAPI } from "./safelight";
import { TONE_CURVE_SETTINGS } from "./settings";
import { toneCurveStage } from "./stages";

export const PANEL_ID = "core.tone-curve";

/** The release line: this release's major version (vite.config.ts). */
export const LINE = __SAFELIGHT_LINE__ as Line;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  host.registerProcessingStage(toneCurveStage(LINE));
  host.registerPanel({
    id: PANEL_ID,
    title: "Tone Curve",
    component: ToneCurvePanel,
    defaultDock: { module: "develop", direction: "right", order: 6, width: 280, height: 220 },
    onReset: () => void host.stores.useDevelopStore.getState().resetParams(["toneCurve"], "Reset Tone Curve"),
    mask: TONE_CURVE_MASK_PANEL,
  });
  host.registerSettings(TONE_CURVE_SETTINGS);
}
