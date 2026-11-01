// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Runtime bindings. JSX in every module compiles (classic transform) to
// React.createElement, resolved against the `React` re-exported here: the
// instance the host injects at activate(). A second React would break hooks.

import type { SafelightAPI } from "./safelight";

export let React!: typeof import("react");
export let api!: SafelightAPI;

export function initRuntime(host: SafelightAPI): void {
  api = host;
  React = host.react;
}
