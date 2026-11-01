// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Preferences ▸ Tone Curve, as core's built-in registered it. The key is
// core's, which Safelight 3.2.0 moved under this extension's id with the rest
// of its settings.

import type { SettingsContribution } from "./safelight";
import { SHOW_POINT_VALUES } from "./ToneCurvePanel";

export const TONE_CURVE_SETTINGS: SettingsContribution = {
  title: "Tone Curve",
  order: 50,
  keywords: ["curve", "point", "input", "output", "levels", "numbers", "exact", "lightroom"],
  fields: [
    {
      key: SHOW_POINT_VALUES,
      label: "Show point values",
      hint: "Show In and Out boxes under the curve for the selected point, in 0–255 levels like Lightroom, to read or type exact values.",
      type: "boolean",
      default: false,
    },
  ],
};
