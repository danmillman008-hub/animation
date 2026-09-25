// SVGO config safe for rigged parts: keep ids (pivots/clipPaths reference them), keep viewBox, no path merging across parts.
export default { multipass: true, plugins: [{ name: "preset-default", params: { overrides: { cleanupIds: false, removeViewBox: false, mergePaths: false, convertShapeToPath: false, removeHiddenElems: false } } }] };
