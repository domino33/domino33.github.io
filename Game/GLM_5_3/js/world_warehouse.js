/* ============================================================
   СКЛАД: здание, прилавок, стол СИЗ (надевание/смена),
   стеллаж под кейс, кладовщик и мастер.
   Обмен неисправного пистолета и сдача делегируются модулю
   Pistol (объявлен ниже — вызывается только в рантайме).
   ============================================================ */

const Warehouse = (() => {

  /* ---------------- здание ---------------- */
  {
    const floor = B(16.6, .06, 9.6, new THREE.MeshStandardMaterial({ color: 0xa5a59f, roughness: .9 }));
    floor.position.set(0, .03, -17.5);
    floor.receiveShadow = true;
    scene.add(floor);

    const wm = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: .8 });
    const mk = (w, h, d, x, y, z) => {
      const m = B(w, h, d, wm);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      regOcc(m);                                   // стены перекрывают луч
      return m;
    };
    mk(16.6, 4,  .35,   0,    2,    -22.15);       // задняя
    mk(.35,   4,  9,   -8.15, 2,    -17.5);        // левая
    mk(.35,   4,  9,    8.15, 2,    -17.5);        // правая
    mk(5.6,  3.4, .35, -5.5,  1.7,  -12.85);       // фронт слева от проёма
    mk(5.6,  3.4, .35,  5.5,  1.7,  -12.85);       // фронт справа
    mk(16.6, .9,  .35,  0,    3.55, -12.85);       // перемычка над проёмом

    const roof = B(17, .25, 10.2, wm);
    roof.position.set(0, 4.15, -17.4);
    roof.castShadow = true;
    scene.add(roof);

    /* коллизии: проём ворот x ∈ (−3, 3), над ним перемычка с y=3.2 */
    addCol(-8.3,  8.3, 0,   4, -22.4, -22.0);
    addCol(-8.3, -8.0, 0,   4, -22.0, -13.0);
    addCol( 8.0,  8.3, 0,   4, -22.0, -13.0);
    addCol(-8.3, -3.0, 3.2, 4, -13.1, -12.6);
    addCol( 3.0,  8.3, 3.2, 4, -13.1, -12.6);

    const s1 = sign(4, .8, (g, w, h) => {
      g.fillStyle = '#15202b'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffb400'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#ffb400'; g.font = 'bold 72px Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('СКЛАД', w / 2, h / 2 + 4);
    });
    s1.position.set(0, 3.5, -12.62);
    s1.rotation.y = Math.PI;                       // лицом внутрь, к игроку
    scene.add(s1);
  }

  /* ---------------- антураж: ящики, огнетушитель ---------------- */
  {
    const cm = new THREE.MeshStandardMaterial({ color: 0x7a6a4e, roughness: .9 });
    const c1 = B(.8, .8, .8, cm); c1.position.set(-7.3, .4, -19.6);
    const c2 = B(.8, .8, .8, cm); c2.position.set(-7.3, 1.2, -19.6);
    const c3 = B(.8, .8, .8, cm); c3.position.set(-6.35, .4, -19.9);
    [c1, c2, c3].forEach(c => { c.castShadow = true; scene.add(c); });
    addCol(-7.75, -5.9, 0, 2.0, -20.35, -19.5);

    const ext = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .5, 10),
      new THREE.MeshStandardMaterial({ color: 0xb02818, roughness: .5 }));
    ext.position.set(-7.5, .55, -13.5);
    ext.castShadow = true;
    scene.add(ext);
  }

  /* ---------------- прилавок кладовщика ---------------- */
  {
    const counter = B(4.2, 1.05, .9, matWood);
    counter.position.set(0, .525, -20.4);
    counter.castShadow = true;
    scene.add(counter);
    regOcc(counter);
    addCol(-2.1, 2.1, 0, 1.05, -20.9, -19.9);
  }

  /* ---------------- стол СИЗ ---------------- */
  {
    const top = B(4.6, .07, 1.2, matWood);
    top.position.set(4.6, .92, -16.2);
    top.castShadow = true;
    scene.add(top);
    regOcc(top);
    for (const [lx, lz] of [[-2.1, -.5], [2.1, -.5], [-2.1, .5], [2.1, .5]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .9, 8), matSteel);
      l.position.set(4.6 + lx, .45, -16.2 + lz);
      scene.add(l);
    }
    addCol(2.3, 6.9, 0, .98, -16.8, -15.6);

    const post = B(.03, .3, .03, matDark);
    post.position.set(4.6, 1.1, -16.55);
    scene.add(post);
    const s = sign(1.4, .4, (g, w, h) => {
      g.fillStyle = '#3c4a58'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.font = 'bold 64px Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('СИЗ', w / 2, h / 2);
    });
    s.position.set(4.6, 1.32, -16.55);             // лицом к игроку (+Z)
    scene.add(s);
  }

  /* ---------------- предметы СИЗ ---------------- */
  function ppeItem(x, z, build, label, act) {
    const g = new THREE.Group();
    build(g);
    g.position.set(x, 1.02, z);
    scene.add(g);
    regInter(g, () => g.visible ? label : null, act); 
    return g;
  }

  const ppeEars = ppeItem(3.1, -16.3, g => {
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xf2c400, roughness: .5 })));
    for (const s of [-1, 1]) {
      const m = B(.04, .06, .09, matDark);
      m.position.set(s * .12, .02, 0);
      g.add(m);
    }
  }, 'Надеть: каска с наушниками', () => equipHead(true));

  const ppePlain = ppeItem(4.3, -16.3, g => {
    g.add(new THREE.Mesh(
      new THREE.SphereGeometry(.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: .5 })));
  }, 'Надеть: каска (БЕЗ наушников)', () => equipHead(false));

  const ppeMask = ppeItem(5.4, -16.3, g => {
    const m = B(.16, .13, .07, new THREE.MeshStandardMaterial({ color: 0x5b84a0, roughness: .35 }));
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .06, 10), matDark);
    f.rotation.x = Math.PI / 2; f.position.z = .06;
    g.add(m, f);
  }, 'Надеть: полнолицевую маску', () => equipEyes('mask'));

  const ppeGlasses = ppeItem(6.2, -16.3, g => {
    const l = B(.08, .045, .015, new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: .2 }));
    const t = B(.14, .008, .008, matDark);
    g.add(l, t);
  }, 'Надеть: защитные очки', () => equipEyes('glasses'));

  const ppeGloves = ppeItem(3.6, -15.85, g => {
    for (const s of [-1, 1]) {
      const gl = B(.09, .16, .05, new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: .8 }));
      gl.position.x = s * .08;
      gl.rotation.z = s * .12;
      g.add(gl);
    }
  }, 'Надеть: краги', equipGloves);

  /* надевание со сменой: прежний головной убор/маска возвращается на стол */
  function equipHead(withEars) {
    ppeEars.visible = true;
    ppePlain.visible = true;
    G.ppe.ears = withEars;
    G.ppe.headWorn = true;
    (withEars ? ppeEars : ppePlain).visible = false;
    SFX.tick();
    UI.toast(withEars ? 'Каска с наушниками надета — слух защищён'
                      : 'Каска без наушников — органы слуха НЕ защищены',
             withEars ? 'info' : 'warn');
    UI.renderStatus(); UI.renderTasks();
  }
  function equipEyes(kind) {
    ppeGlasses.visible = true;
    ppeMask.visible = true;
    G.ppe.eyes = kind;
    (kind === 'glasses' ? ppeGlasses : ppeMask).visible = false;
    SFX.tick();
    UI.toast(kind === 'glasses' ? 'Защитные очки надеты'
      : 'Полнолицевая маска надета — для этих работ она НЕ подходит: нужны защитные очки',
      kind === 'glasses' ? 'info' : 'warn');
    UI.renderStatus(); UI.renderTasks();
  }
  function equipGloves() {
    G.ppe.hands = true;
    ppeGloves.visible = false;
    SFX.tick();
    UI.toast('Краги надеты');
    UI.renderStatus(); UI.renderTasks();
  }

  /* ---------------- стеллаж под кейс ---------------- */
  const caseSpot = new THREE.Vector3(-4.6, .955, -16.2);   // pistol.js ставит кейс сюда
  {
    const top = B(4.6, .07, 1.2, matSteel);
    top.position.set(-4.6, .92, -16.2);
    top.castShadow = true;
    scene.add(top);
    for (const [lx, lz] of [[-2.1, -.5], [2.1, -.5], [-2.1, .5], [2.1, .5]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .9, 8), matSteel);
      l.position.set(-4.6 + lx, .45, -16.2 + lz);
      scene.add(l);
    }
    addCol(-6.9, -2.3, 0, .98, -16.8, -15.6);
  }

  /* ---------------- кладовщик ---------------- */
  const storeman = NPC.make(0x35507a, 0xd8d4ca);
  storeman.g.position.set(0, 0, -21.3);              // за прилавком, лицом к игроку

  const STORE_TIPS = [
    'Возьмите кейс со стеллажа слева, достаньте пистолет и обязательно осмотрите его.',
    'СИЗ для этих работ: каска с наушниками, защитные очки и краги. Маска с патроном не подходит.',
    'Пистолет переносите к месту работ в кейсе. На площадке выставьте ограждение и уберите людей из зоны.'
  ];
  let tipI = 0;

regInter(storeman.g, () => {
    if (G.pistolDead && !G.exchanged && G.pistolSplit) return 'Сдать неисправный пистолет';
    if (G.stage >= 4) return 'Сдать инструмент, гильзы и патрон';
    return 'Спросить у кладовщика';
  }, () => {
    if (G.pistolDead && !G.exchanged) {
      if (!G.pistolSplit) {
        UI.toast('Кладовщик: «Сначала осмотрите инструмент: достаньте пистолет [X] и переломите [R]»');
        return;
      }
      Pistol.exchange();
      return;
    }
    if (G.stage >= 4) { Pistol.handIn(); return; }
    UI.toast('Кладовщик: «' + STORE_TIPS[tipI++ % STORE_TIPS.length] + '»');
  }, true);

  /* ---------------- мастер у выхода ---------------- */
  const foreman = NPC.make(0xc26b1f, 0xe8e4da);
  foreman.g.position.set(3.4, 0, -12.2);
  foreman.g.rotation.y = Math.PI;                    // лицом к выходу склада
  addCol(3.1, 3.7, 0, 1.8, -12.5, -11.9);

  const FORE_TIPS = [
    'Для силикатного кирпича подходит ЗЕЛЁНЫЙ патрон. Жёлтый — слабый, красный и чёрный разрушат кирпич.',
    'Сначала дюбель в ствол, потом патрон. Заряжать — только на полностью подготовленном месте.',
    'При осечке держи пистолет прижатым к стене не менее минуты, потом патрон — в воду.',
    'Гильзы и осечный патрон собираем и сдаём на склад в конце работ.',
    'Не направляй пистолет на людей, даже разряженный.'
  ];
  let fTip = 0;
  regInter(foreman.g, () => 'Спросить у мастера',
    () => UI.toast('Мастер: «' + FORE_TIPS[fTip++ % FORE_TIPS.length] + '»'), true);

  return { caseSpot, storeman, foreman };
})();