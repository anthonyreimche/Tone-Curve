# Tone Curve for Safelight

The Develop **Tone Curve** panel: point curves for the whole image (RGB) and
for red, green and blue.

- Click the curve to add a point, drag to move it, double-click to remove it.
  The master RGB curve applies first, then each channel's own.
- Preferences ▸ Tone Curve ▸ **Show point values** adds In and Out boxes for
  the selected point, in 0–255 levels, to read or type exact values. With
  Accessibility ▸ Keyboard canvas editing on, the curve also takes the arrow
  keys.
- Masks get the same editor, over the mask's own curves.

Each drag is one Undo step. Right-click the panel's header and choose
**Reset to defaults** to straighten every curve as one step.

Until Safelight 3.2.0 this panel was built in. It keeps the built-in panel's
id (`core.tone-curve`), so layouts saved before then keep it where it was, and
photos keep their curves. While the extension is off or uninstalled, those
photos show without them; Develop says so and offers to bring it back. Masks'
own curves keep rendering either way.

## Resting block

From 3.1.0, on Safelight 3.2.1 or newer, the live view leaves the Tone Curve block out of the develop shader while every curve is straight, on lines 2 and 3 (line 1 looks every pixel up in its 8-bit table). The picture is the same either way, and thumbnails and exports always run it.

## Release lines

A release's major version is its line: the process version its curve block
was written for. Line 1 runs every pixel through the table, as Safelight's
first process version did. Lines 2 and 3 skip straight curves, so an
unedited photo keeps colours outside the displayable range. The installed
release draws every photo with its line, so picking a 1.x release in the
Extensions store brings back the first look for all photos.

To build another line, set `version` in both `safelight.json` and
`package.json` to that major version; `vite.config.ts` reads the line from it.

## Development

```bash
npm install
npm run typecheck
npm run build    # dist/index.js, the file Safelight loads
npm test         # vitest; the bundle checks read dist/, so build first
npm run check    # all three, in that order
```

`test/stages.test.ts` pins each line's stage text with the same hashes as
Safelight's own copy (`src/rendering/webgl/essential-stages.test.ts` in the
app). Change both together. `src/curve.ts` is core's curve maths; core's
curve editor and the masks use the same, so keep them in step.
