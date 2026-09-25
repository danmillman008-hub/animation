# Human-in-the-loop editors

## film_editor/  (Vite + @remotion/player)
Media-player UI over the real Western composition (west/remotion/Main.tsx).
Pause anywhere → joint dots appear → drag = correction key (offset on top of code motion),
stored per scene / per character with scene-local time. Blue dot = move character; hands/feet = 2-bone IK.
`Save` / Ctrl+S writes `film_editor/overrides.json` ONLY (nothing runs). Edits also persist in localStorage.
Bake: pass the file as `overrides` in props →  `--props='{"...","overrides":<json>}'`, or `Main.tsx applyOverrides()`.
Restore: `cd film_editor && npm install && npx vite --host 0.0.0.0 --port 5173` (src/west is a symlink to
OpenMontage/projects/west/remotion; needs node ≥ 20, remotion 4.0.484).

## pose_editor/  (static html)
Rig-level editor: pose sliders + IK drag, pivot mode (fix joints), named keys with times, onion skin.
Exports poses.json / rig_patch.json → `import_poses.py poses.json VAR` prints TS poses + applies pivot patch.
`python3 -m http.server 8765` in pose_editor/ (needs rigs.json regenerated from characters.ts).
