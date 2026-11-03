// A stand-in Safelight API over real React and zustand. The develop store holds
// the curves the way core's does and records every write; the settings are a
// plain map that tells its listeners; core's Panel draws its children and core's
// CurveEditor is replaced by a stub that keeps the props it was last rendered
// with, so a test can drive an edit and its commit the way the real one would.

import * as React from "react";
import { create } from "zustand";
import type {
  CurveEditorProps,
  CurvePoint,
  DevelopParams,
  DevelopStoreState,
  MaskScope,
  PanelContribution,
  PanelProps,
  ProcessingStageContribution,
  SafelightAPI,
  SettingsContribution,
  StoreApi,
  ToneCurveChannel,
  ToneCurves,
} from "../../src/safelight";

export type DevelopCall =
  | { setToneCurve: ToneCurveChannel; points: CurvePoint[] }
  | { commitEdit: string }
  | { resetParams: (keyof DevelopParams)[]; label: string };

const LINE = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];
export const DEFAULT_CURVES: ToneCurves = { rgb: LINE, red: LINE, green: LINE, blue: LINE };

export interface Rig {
  api: SafelightAPI;
  develop: StoreApi<DevelopStoreState>;
  calls: DevelopCall[];
  panels: PanelContribution[];
  stages: ProcessingStageContribution[];
  settingsSections: SettingsContribution[];
  /** Set one of the extension's settings, telling its listeners. */
  setSetting(key: string, value: unknown): void;
  /** The props core's CurveEditor was last rendered with. */
  editor(): CurveEditorProps;
  mask: { toneCurve: ToneCurves | undefined; commits: string[] };
}

export function fakeApi(toneCurve: ToneCurves = DEFAULT_CURVES): Rig {
  const calls: DevelopCall[] = [];
  const panels: PanelContribution[] = [];
  const stages: ProcessingStageContribution[] = [];
  const settingsSections: SettingsContribution[] = [];
  const settings = new Map<string, unknown>();
  const listeners = new Set<(key: string, value: unknown) => void>();
  const mask: Rig["mask"] = { toneCurve: undefined, commits: [] };
  const maskStore = create<{ toneCurve: ToneCurves | undefined }>(() => ({ toneCurve: undefined }));
  let lastEditor: CurveEditorProps | null = null;

  const develop: StoreApi<DevelopStoreState> = create<DevelopStoreState>()((set) => ({
    params: { toneCurve, processVersion: 2 },
    setToneCurve: (channel, points) => {
      calls.push({ setToneCurve: channel, points });
      set((s) => ({ params: { ...s.params, toneCurve: { ...s.params.toneCurve, [channel]: points } } }));
    },
    commitEdit: async (label) => {
      calls.push({ commitEdit: label });
    },
    resetParams: async (keys, label) => {
      calls.push({ resetParams: keys, label });
      set((s) => ({ params: { ...s.params, toneCurve: DEFAULT_CURVES } }));
    },
  }));

  function Panel({ children, title }: PanelProps) {
    return React.createElement("section", { "aria-label": title }, children);
  }

  function CurveEditor(props: CurveEditorProps) {
    lastEditor = props;
    return React.createElement("div", { "data-testid": "curve-editor" }, props.showPointValues ? "values" : "");
  }

  const api: SafelightAPI = {
    version: 1,
    extensionId: "safelight.tone-curve",
    react: React,
    registerPanel: (c) => void panels.push(c),
    registerProcessingStage: (c) => void stages.push(c),
    registerSettings: (c) => void settingsSections.push(c),
    settings: {
      get: <T,>(key: string, fallback: T) => (settings.has(key) ? (settings.get(key) as T) : fallback),
      onChange: (cb) => {
        listeners.add(cb);
        return () => void listeners.delete(cb);
      },
    },
    components: { Panel, CurveEditor },
    stores: { useDevelopStore: develop },
    develop: {
      useMaskScope: (): MaskScope => {
        const value = maskStore((s) => s.toneCurve);
        return {
          toneCurve: value,
          setToneCurve: (next) => {
            mask.toneCurve = next;
            maskStore.setState({ toneCurve: next });
          },
          commit: (label) => void mask.commits.push(label),
        };
      },
    },
  };

  return {
    api,
    develop,
    calls,
    panels,
    stages,
    settingsSections,
    setSetting: (key, value) => {
      settings.set(key, value);
      for (const cb of listeners) cb(key, value);
    },
    editor: () => {
      if (!lastEditor) throw new Error("CurveEditor has not rendered");
      return lastEditor;
    },
    mask,
  };
}
