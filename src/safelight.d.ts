// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The slice of Safelight's extension API this extension touches, mirrored from
// the app's src/extensions/types.ts, src/catalog/types.ts,
// src/state/develop-store.ts, src/modules/develop/mask-scope.tsx and
// src/ui/components/{Panel,CurveEditor}.tsx. Extensions are standalone
// bundles, so the host's source is not on the type path; React types come
// from @types/react (dev only).

import type { ComponentType, ReactNode } from "react";

/** A release line: the process version its stage text was written for, and
 *  the extension's major version. */
export type Line = 1 | 2 | 3;

export interface StoreApi<T> {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState(): T;
  setState(partial: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export interface CurvePoint {
  /** 0..1 input. */
  x: number;
  /** 0..1 output. */
  y: number;
}

export type ToneCurveChannel = "rgb" | "red" | "green" | "blue";

/** The master curve, applied to every channel first, and each channel's. */
export type ToneCurves = Record<ToneCurveChannel, CurvePoint[]>;

/** The develop params this extension reads. Core's carry many more fields. */
export interface DevelopParams {
  toneCurve: ToneCurves;
  /** The photo's process version: 1, 2 or 3. */
  processVersion: number;
}

export interface DevelopStoreState {
  params: DevelopParams;
  /** Replace one channel's points, live (no history step). */
  setToneCurve(channel: ToneCurveChannel, points: CurvePoint[]): void;
  /** End a gesture: one undoable history step under `label`. */
  commitEdit(label: string): Promise<void>;
  /** Put `keys` back to their defaults as one undoable step under `label`. */
  resetParams(keys: (keyof DevelopParams)[], label: string): Promise<void>;
}

export interface PanelDockDefault {
  module: "library" | "develop";
  direction: "left" | "right" | "bottom";
  order?: number;
  width?: number;
  height?: number;
}

/** A panel's per-mask variant, listed among a mask's sub-panels. */
export interface MaskPanelContribution {
  component: ComponentType;
  /** Sort position among a mask's sub-panels (lower = higher up). */
  order?: number;
  /** The mask values this sub-panel edits ("toneCurve": the mask's own curves). */
  owns: readonly string[];
}

export interface PanelContribution {
  /** Globally unique, e.g. "core.tone-curve" or "my-ext.fancy-curves". */
  id: string;
  title: string;
  component: ComponentType;
  defaultDock?: PanelDockDefault;
  /** Right-clicking the panel's dock header offers "Reset to defaults". */
  onReset?: () => void;
  mask?: MaskPanelContribution;
}

export interface SettingsContribution {
  title?: string;
  fields: { key: string; label: string; hint?: string; type: "boolean"; default: boolean }[];
  /** Sort position in Preferences (lower = higher up). */
  order?: number;
  /** Extra words that find this section in the Preferences search. */
  keywords?: string[];
}

export interface UniformDeclaration {
  key: string;
  glslType: "bool";
  default: boolean;
}

/** A per-photo table a stage's derive fills. */
export type StageTextureData = {
  width: number;
  height: number;
  /** Changes whenever the data does, so the renderer uploads it again. */
  version: number;
} & ({ data: Uint8Array; format: "rgba8" } | { data: Float32Array; format: "rgba16f" });

export type StageValue = number | boolean | number[] | StageTextureData;

export interface StageDeriveContext {
  /** One of this extension's settings, or `fallback`. */
  settings<T>(key: string, fallback: T): T;
}

export type StageDerive = (params: DevelopParams, ctx: StageDeriveContext) => Record<string, StageValue>;

export interface ProcessingStageContribution {
  id: string;
  name: string;
  phase: "display-adjust";
  priority?: number;
  /** Where in the develop program the block runs (official stages only). */
  anchor?: "tone-curve";
  /** The stage's block in the develop program; `c` is the display colour. */
  glsl: string;
  /** Functions the block calls, declared ahead of main(). */
  helpers?: string;
  uniforms: UniformDeclaration[];
  /** Uniform values at which the stage changes nothing: while every one holds,
   *  the live view leaves the stage out of its program (Safelight 3.2.1). */
  dormantWhen?: Readonly<Record<string, number | boolean>>;
  /** Textures the block samples; a "photo" one is filled by derive. */
  textures?: readonly { key: string; kind: "photo" }[];
  /** The uniforms' and photo textures' values for a photo (official
   *  extensions only). */
  derive?: StageDerive;
}

export interface PanelProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export interface CurveEditorProps {
  curves: ToneCurves;
  onChange(channel: ToneCurveChannel, points: CurvePoint[]): void;
  onCommit(): void;
  /** For a mask sub-panel. */
  compact?: boolean;
  /** Show the selected point's In and Out boxes. */
  showPointValues?: boolean;
}

/** The mask a mask sub-panel instance belongs to. */
export interface MaskScope {
  toneCurve: ToneCurves | undefined;
  setToneCurve(value: ToneCurves): void;
  /** End a gesture: one undoable step under `label`. */
  commit(label: string): void;
}

export interface SafelightAPI {
  version: 1;
  extensionId: string;
  react: typeof import("react");
  registerPanel(c: PanelContribution): void;
  registerProcessingStage(c: ProcessingStageContribution): void;
  registerSettings(c: SettingsContribution): void;
  settings: {
    get<T>(key: string, fallback: T): T;
    /** Fires when any of this extension's settings change (any window). */
    onChange(cb: (key: string, value: unknown) => void): () => void;
  };
  components: {
    /** Core's collapsible panel; inside a dock panel of the same title it
     *  draws its content only. */
    Panel: ComponentType<PanelProps>;
    /** Core's RGB and per-channel curve editor. */
    CurveEditor: ComponentType<CurveEditorProps>;
  };
  stores: {
    useDevelopStore: StoreApi<DevelopStoreState>;
  };
  develop: {
    /** The mask a PanelContribution.mask component belongs to. */
    useMaskScope(): MaskScope;
  };
}

export interface ExtensionModule {
  activate(api: SafelightAPI): void;
  deactivate?(): void;
}
