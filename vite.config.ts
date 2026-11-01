import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Classic JSX bound to the `React` binding each module imports from ./rt: the
// host's React instance, never a bundled one (a second React breaks hooks).
const JSX = { runtime: "classic", pragma: "React.createElement", pragmaFrag: "React.Fragment" } as const;

// The release line is the manifest's major version: a 1.x release registers
// line 1's stage text (src/stages.ts).
const manifest = JSON.parse(readFileSync(new URL("./safelight.json", import.meta.url), "utf8")) as { version: string };
const LINE = Number(manifest.version.split(".")[0]);
if (![1, 2, 3].includes(LINE)) throw new Error(`safelight.json version ${manifest.version} names no release line`);

export default defineConfig({
  define: { __SAFELIGHT_LINE__: JSON.stringify(LINE) },
  oxc: { jsx: JSX },
  build: {
    lib: { entry: "src/index.tsx", formats: ["es"], fileName: "index" },
    rollupOptions: { external: ["react", "react-dom"] },
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
  },
});
