/* ============================================================
   NPC: примитивные персонажи, падения, idle-анимация
   NPC.make(цветЖилета, цветКаски) -> {g, arms, down, leaving, col}
   ============================================================ */

const NPC = (() => {
  const list = [];
  let T = 0; // внутреннее время для idle

  function make(vest = 0x4a5f78, helm = 0xf2c400) {
    const g = new THREE.Group();
    const legMat  = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: .8 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vest, roughness: .7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8ab84, roughness: .6 });
    const helmMat = new THREE.MeshStandardMaterial({ color: helm, roughness: .5 });

    const l1 = B(.15, .78, .16, legMat); l1.position.set(-.1, .39, 0);
    const l2 = l1.clone(); l2.position.x = .1;
    const torso = B(.42, .6, .24, vestMat); torso.position.y = 1.06;
    const a1 = B(.1, .52, .11, vestMat); a1.position.set(-.27, 1.2, 0);
    const a2 = a1.clone(); a2.position.x = .27;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), skinMat);
    head.position.y = 1.55;
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), helmMat);
    helmet.position.y = 1.56;

    g.add(l1, l2, torso, a1, a2, head, helmet);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);

    const npc = { g, arms: [a1, a2], down: false, leaving: false, col: null, ph: Math.random() * 6.28 };
    list.push(npc);
    return npc;
  }

  /* падение (травмирован рикошетом/осколками) */
  function fall(n) {
    if (n.down) return;
    n.down = true;
    FX.tween(.5, k => { n.g.rotation.x = -1.5 * k; }, () => SFX.thud());
  }

  function remove(n) {
    scene.remove(n.g);
    const i = list.indexOf(n);
    if (i >= 0) list.splice(i, 1);
  }

  /* лёгкая idle-анимация: покачивание рук и корпуса */
  function update(dt) {
    T += dt;
    for (const n of list) {
      if (n.down || n.leaving) continue;
      const s = Math.sin(T * 1.3 + n.ph);
      n.arms[0].rotation.x = s * .05;
      n.arms[1].rotation.x = -s * .05;
      n.g.rotation.z = s * .012;
    }
  }

  return { make, fall, remove, update };
})();