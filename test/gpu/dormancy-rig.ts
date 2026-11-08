// The proof a dormantWhen rule needs, run on Safelight's real renderer: at the
// rule's values the stage changes nothing, so a live view that leaves it out
// draws the frame the full set draws; and once a slider moves, the stage is back
// and the frame changes. Runs through the host's harness (see run.cjs), with
// the shipped set of Essentials installed and this extension's own stages
// swapped in for the app's copies of them.

import { describe, expect, it } from "vitest";
import { DEFAULT_DEVELOP_PARAMS, type DevelopParams } from "@/catalog/types";
import type { ProcessingStageContribution } from "@/extensions/types";
import type { EssentialLine } from "@/rendering/webgl/essential-stages.fixtures";
import {
  OPEN_PROBE,
  builtinStages,
  floatImage,
  identityParams,
  withRenderer,
  worstDifference,
  type Frame,
} from "@/rendering/webgl/webgl.test-support";

export { DEFAULT_DEVELOP_PARAMS };

/** One half-float step, the bound the host's own dormancy spec holds a dormant
 *  frame to: leaving a stage out may differ by float rounding, and no more. */
const HALF_STEP = 2 ** -11;

/** A vignette in use, which scales the colour it is handed. */
const VIGNETTE_IN_USE: Partial<DevelopParams> = {
  vignette: { ...DEFAULT_DEVELOP_PARAMS.vignette, amount: -80 },
};

/** The process versions whose live view can leave a stage out. */
const PHOTO_VERSIONS = [2, 3] as const;

type Installed = ProcessingStageContribution & { extensionId: string };

/** The shipped set at release line `line`, this extension's stages in place of
 *  the app's copies of them. */
function shippedWith(extensionId: string, own: readonly ProcessingStageContribution[], line: EssentialLine): Installed[] {
  const mine = new Map(own.map((s) => [s.id, { ...s, extensionId }]));
  const set = builtinStages(line).map((s) => mine.get(s.id) ?? s);
  for (const id of mine.keys()) {
    if (!set.some((s) => s.id === id)) throw new Error(`the shipped set has no stage ${id}`);
  }
  return set as Installed[];
}

const noise = (x: number, y: number): number => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/** A scene-linear source with a dark corner, highlights past 1, saturated and
 *  near-neutral colour, fine texture, and one texel outside sRGB (a negative
 *  channel). */
const SOURCE = floatImage(32, 32, (x, y) => {
  const u = x / 31;
  const v = y / 31;
  const grain = (noise(x, y) - 0.5) * 0.08;
  if (x === 3 && y === 3) return [-0.02, 0.1, 0.3];
  return [
    0.02 + 2.4 * u * u + grain * (0.3 + u),
    0.03 + 0.8 * v + 0.4 * u * (1 - v) + grain,
    0.05 + 0.5 * (1 - u) * v + 0.1 * u + grain * (0.3 + v),
  ];
});

interface Drawn {
  frame: Frame;
  /** The stages the live view left out of the program, when it was asked to. */
  asleep: readonly string[];
}

function draw(stages: readonly ProcessingStageContribution[], params: DevelopParams, live: boolean): Drawn {
  return withRenderer(
    { stages: [...stages], pipeline: OPEN_PROBE, processVersionCap: 3, skipDormantStages: live },
    (renderer) => {
      renderer.setImage(SOURCE);
      renderer.setAsShotTemperature(6500);
      renderer.setParams(params);
      const frame = renderer.captureFloatFrame();
      if (!frame) throw new Error("captureFloatFrame returned null");
      return { frame, asleep: [...renderer.dormantStages] };
    },
  );
}

export interface DormancyCase {
  /** What the stage is called in the test titles. */
  title: string;
  stageId: string;
  /** The release lines whose text carries the rule. An installed release
   *  renders every photo with its one text, so each runs on a version 2 and a
   *  version 3 photo. */
  lines: readonly EssentialLine[];
  /** Params at which the stage is at rest, beyond the untouched photo. */
  rests?: Record<string, Partial<DevelopParams>>;
  /** Params that put a tool after the stage in use, so that the stage's output
   *  reaches it unclipped: the capture itself clips at 1, which would hide a
   *  stage that clips its input. A vignette scales the colour it is given, and
   *  is the default; `false` for the Vignette itself, which nothing follows. */
  context?: Partial<DevelopParams> | false;
  /** Params that wake the stage and change the frame, one move at a time. */
  moves: Record<string, Partial<DevelopParams>>;
}

/** Proves `c`'s rule on the shipped set with `own` (the extension's stages at
 *  `lineStages(line)`) installed. */
export function proveDormancy(
  extensionId: string,
  lineStages: (line: EssentialLine) => ProcessingStageContribution[],
  c: DormancyCase,
): void {
  describe(c.title, () => {
    const photos = c.lines.flatMap((line) => PHOTO_VERSIONS.map((processVersion) => ({ line, processVersion })));
    describe.each(photos)(
      "on line $line's text, a version $processVersion photo",
      ({ line, processVersion }) => {
        const stages = shippedWith(extensionId, lineStages(line), line);
        const without = stages.filter((s) => s.id !== c.stageId);
        const photo = (over: Partial<DevelopParams> = {}) => identityParams({ processVersion, ...over });
        // The frame with the stage out, drawn once for the moves to differ from.
        let restFrame: Frame | undefined;
        const restOf = (): Frame => (restFrame ??= draw(without, photo(), false).frame);

        const restVariants: Record<string, Partial<DevelopParams>> = {
          untouched: {},
          ...(c.context === false ? {} : { "a tool after it is in use": c.context ?? VIGNETTE_IN_USE }),
          ...c.rests,
        };
        it.each(Object.entries(restVariants))(
          "changes nothing when %s, awake or asleep",
          (_, over) => {
            const params = photo(over);
            const reference = draw(without, params, false).frame;
            expect(worstDifference(draw(stages, params, false).frame, reference)).toBeLessThanOrEqual(HALF_STEP);
            const live = draw(stages, params, true);
            expect(live.asleep).toContain(c.stageId);
            expect(worstDifference(live.frame, reference)).toBeLessThanOrEqual(HALF_STEP);
          },
        );

        it.each(Object.entries(c.moves))("wakes for %s, and the frame changes", (_, over) => {
          const live = draw(stages, photo(over), true);
          expect(live.asleep).not.toContain(c.stageId);
          expect(worstDifference(live.frame, restOf())).toBeGreaterThan(HALF_STEP);
        });
      },
    );
  });
}
