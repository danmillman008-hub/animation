// Choreo layout solver — relations → positions.
//
// Deliberately simple (Phase 1): layout statements execute in order, each
// assigning/adjusting an entity's center position. No general constraint
// optimization — the verifier is the safety net for layout errors.
// Every entity gets { cx, cy } (center) in scene coordinates.

export function solveLayout(ast) {
  const { scene, entities, layout } = ast;
  const byName = Object.fromEntries(entities.map((e) => [e.name, e]));
  // default: center of scene
  for (const e of entities) { e.cx = scene.width / 2; e.cy = scene.height / 2; }

  const box = (e) => ({ x: e.cx - e.w / 2, y: e.cy - e.h / 2, w: e.w, h: e.h });

  for (const l of layout) {
    const E = byName[l.e];
    const R = l.ref ? byName[l.ref] : null;
    switch (l.op) {
      case 'center': {
        if (R) { E.cx = R.cx; E.cy = R.cy; }
        else { E.cx = scene.width / 2; E.cy = scene.height / 2; }
        break;
      }
      case 'inside': {
        const rb = box(R);
        E.cx = R.cx; E.cy = R.cy;
        if (l.anchor === 'top') E.cy = rb.y + l.margin + E.h / 2;
        if (l.anchor === 'bottom') E.cy = rb.y + rb.h - l.margin - E.h / 2;
        if (l.anchor === 'left') E.cx = rb.x + l.margin + E.w / 2;
        if (l.anchor === 'right') E.cx = rb.x + rb.w - l.margin - E.w / 2;
        break;
      }
      case 'below': { E.cx = R.cx; E.cy = R.cy + R.h / 2 + l.gap + E.h / 2; break; }
      case 'above': { E.cx = R.cx; E.cy = R.cy - R.h / 2 - l.gap - E.h / 2; break; }
      case 'rightOf': { E.cy = R.cy; E.cx = R.cx + R.w / 2 + l.gap + E.w / 2; break; }
      case 'leftOf': { E.cy = R.cy; E.cx = R.cx - R.w / 2 - l.gap - E.w / 2; break; }
      case 'at': { E.cx = l.x; E.cy = l.y; break; }
      case 'offset': { E.cx += l.dx; E.cy += l.dy; break; }
    }
  }
  return byName;
}
