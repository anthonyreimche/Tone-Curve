// Preferences ▸ Tone Curve names no other program: its hint and search words
// describe the control itself.

import { describe, expect, it } from "vitest";
import { TONE_CURVE_SETTINGS } from "../src/settings";

describe("Tone Curve settings", () => {
  it("names no other program in its hint or search words", () => {
    const text = JSON.stringify([TONE_CURVE_SETTINGS.keywords, TONE_CURVE_SETTINGS.fields.map((f) => [f.label, f.hint])]);
    expect(text).not.toMatch(/lightroom/i);
  });
});
