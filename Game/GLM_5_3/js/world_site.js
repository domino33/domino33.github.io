/* ============================================================
   РАБОЧАЯ ПЛОЩАДКА: стена с разметкой, опасная зона 15 м,
   ограждения, подмости и стремянка, урна, вода, поддон
   с кронштейнами, кучка гильз, рабочие за стеной.
   Ссылки на Pistol/Player — рантаймовые (модули ниже).
   ============================================================ */

const Site = (() => {
  const WZ = CONST.WALL_Z;

  /* ================= земля ================= */
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({ color: 0x8b887f, roughness: .95 }));
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    scene.add(g);
  }

  /* ================= стена (силикатный кирпич) ================= */
  {
    const side = new THREE.MeshStandardMaterial({ color: 0xc9c8c2, roughness: .85 });
    const face = new THREE.MeshStandardMaterial({ map: Tex.brick, roughness: .85 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.6, .45),
      [side, side, side, side, face, face]);   // ±Z — кирпичные грани
    wall.position.set(0, 1.8, WZ + .225);
    wall.castShadow = wall.receiveShadow = true;
    scene.add(wall);
    regOcc(wall);
    addCol(-6, 6, 0, 3.6, WZ, WZ + .45);
  }

  /* ============ разметка, точки крепления, кронштейны ============ */
  const points = [];
  const bracketMeshes = [];

  for (let bi = 0; bi < 2; bi++) {
    const cx = bi === 0 ? -1.2 : 1.2;

    /* пунктирный контур кронштейна на стене */
    const ol = sign(.9, .5, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,122,26,.95)';
      g.lineWidth = 5;
      g.setLineDash([14, 9]);
      g.strokeRect(12, 12, w - 24, h - 24);
      g.setLineDash([]);
      g.beginPath(); g.arc(w * .33, h * .5, 14, 0, 7); g.stroke();
      g.beginPath(); g.arc(w * .67, h * .5, 14, 0, 7); g.stroke();
      g.fillStyle = 'rgba(255,122,26,.95)';
      g.font = 'bold 30px Arial';
      g.fillText('№' + (bi + 1), 18, h - 18);
    });
    ol.material.transparent = true;
    ol.position.set(cx, 2.6, WZ - .006);
    ol.rotation.y = Math.PI;                  // лицом к игроку
    scene.add(ol);

    /* сам кронштейн (появится после установки) */
    const bm = new THREE.Group();
    bm.add(B(.5, .26, .04, matSteel));        // пластина
    const arm = B(.04, .04, .28, matSteel);   // консоль наружу от стены
    arm.position.set(0, -.1, -.15);
    bm.add(arm);
    bm.position.set(cx, 2.6, WZ - .02);
    bm.visible = false;
    bm.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(bm);
    bracketMeshes.push(bm);

    /* две точки пристрелки */
    for (const dx of [-.15, .15]) {
      const pt = { x: cx + dx, y: 2.6, bi, state: 'fresh', ring: null, zone: null };

      pt.ring = new THREE.Mesh(
        new THREE.RingGeometry(.026, .045, 24),
        new THREE.MeshBasicMaterial({ color: 0xff7a1a, side: THREE.DoubleSide }));
      pt.ring.position.set(pt.x, pt.y, WZ - .005);
      pt.ring.rotation.y = Math.PI;           // лицом к игроку
      scene.add(pt.ring);

      pt.zone = new THREE.Mesh(
        new THREE.CircleGeometry(.3, 20),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      pt.zone.position.set(pt.x, pt.y, WZ - .006);
      pt.zone.rotation.y = Math.PI;
      scene.add(pt.zone);
      regInter(pt.zone,
        () => (G.handItem && G.handItem.kind === 'bracket' && !G.brackets[pt.bi].placed)
          ? 'Установить кронштейн №' + (pt.bi + 1) : null,
        () => placeBracket(pt.bi));

      points.push(pt);
    }
  }

  const donePts = () => points.filter(p => p.state === 'done').length;

  function placeBracket(bi) {
    if (!G.handItem || G.handItem.kind !== 'bracket' || G.brackets[bi].placed) return;
    G.handItem = null;
    Pistol.updHand();
    G.brackets[bi].placed = true;
    bracketMeshes[bi].visible = true;
    SFX.clack();
    UI.toast('Кронштейн №' + (bi + 1) + ' установлен по разметке. Пристрелите его двумя дюбелями');
    UI.renderTasks();
  }

  /* декали результата выстрела (вызывает pistol.js) */
  function holeDecal(pt) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(.02, 12),
      new THREE.MeshBasicMaterial({ color: 0x3c3a36, side: THREE.DoubleSide }));
    c.position.set(pt.x, pt.y, WZ - .004);
    c.rotation.y = Math.PI;
    scene.add(c);
  }
  function halfDowel(pt) {                    // дюбель вошёл наполовину
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .08, 8), matSteel);
    m.rotation.x = Math.PI / 2;
    m.position.set(pt.x, pt.y, WZ - .01);
    scene.add(m);
  }

  /* ================= опасная зона 15 м ================= */
  {
    const tint = new THREE.Mesh(new THREE.CircleGeometry(15, 64),
      new THREE.MeshBasicMaterial({ color: 0xff5533, transparent: true, opacity: .05, depthWrite: false }));
    tint.rotation.x = -Math.PI / 2;
    tint.position.set(0, .015, 8.5);
    scene.add(tint);

    const ring = new THREE.Mesh(new THREE.RingGeometry(14.6, 15, 128),
      new THREE.MeshBasicMaterial({ color: 0xd23b2e, transparent: true, opacity: .85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, .02, 8.5);
    scene.add(ring);

    const s = sign(1.25, .85, (g, w, h) => {
      g.fillStyle = '#c2331f'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = 'bold 40px Arial'; g.fillText('ОПАСНАЯ ЗОНА', w / 2, 50);
      g.font = '32px Arial';
      g.fillText('пристрелочные', w / 2, 95);
      g.fillText('работы · 15 м', w / 2, 135);
    });
    s.position.set(0, 1.05, -4.4);
    s.rotation.y = Math.PI;                   // навстречу идущему со склада
    scene.add(s);
    for (const sx of [-.55, .55]) {
      const l = B(.06, 1.1, .06, matWood);
      l.position.set(sx, .55, -4.6);
      l.rotation.z = sx > 0 ? -.12 : .12;
      l.castShadow = true;
      scene.add(l);
    }
    addCol(-.6, .6, 0, 1.15, -4.75, -4.45);
  }

  /* ================= ограждения ================= */
  const fenceStack = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const p = B(2.3, 1.1, .06, new THREE.MeshStandardMaterial({ map: Tex.haz, roughness: .7 }));
    p.position.set((i % 2) * .12, .1 + i * .09, 0);
    p.rotation.z = (Math.random() - .5) * .05;
    p.castShadow = true;
    fenceStack.add(p);
  }
  fenceStack.position.set(-7, 0, 2);
  scene.add(fenceStack);
  const stackCol = addCol(-8.2, -5.8, 0, 1.1, 1.4, 2.6);
  const stackInter = regInter(fenceStack,
    () => G.fences ? null : 'Выставить ограждение опасной зоны (15 м)',
    placeFences);

  const fenceSegs = [];
  for (const deg of [-70, -52.5, -35, -17.5, 17.5, 35, 52.5, 70]) {
    const a = deg * Math.PI / 180;
    const g = new THREE.Group();
    const p = B(4.2, 1.15, .06, new THREE.MeshStandardMaterial({ map: Tex.haz, roughness: .7 }));
    p.position.y = .75;
    p.castShadow = true;
    g.add(p);
    for (const sx of [-1.9, 1.9]) {
      const l = B(.05, .75, .05, matSteel);
      l.position.set(sx, .37, 0);
      g.add(l);
    }
    g.position.set(14.4 * Math.sin(a), 0, 8.5 - 14.4 * Math.cos(a));
    g.rotation.y = -a;
    g.visible = false;
    scene.add(g);
    fenceSegs.push(g);
  }

  function placeFences() {
    G.fences = true;
    SFX.clack();
    fenceStack.visible = false;
    killInter(stackInter);
    remCol(stackCol);
    fenceSegs.forEach(s => {
      s.visible = true;
      regInter(s, () => (G.stage >= 4 && !G.fencesRemoved) ? 'Убрать ограждение' : null, removeFences);
    });
    UI.toast('Ограждение опасной зоны (15 м) выставлено');
    UI.renderTasks();
  }
  function removeFences() {
    if (G.fencesRemoved) return;
    G.fencesRemoved = true;
    SFX.clack();
    fenceSegs.forEach((s, i) => setTimeout(() =>
      FX.tween(.45, k => { s.rotation.x = -1.45 * k; }, () => { s.visible = false; }), i * 70));
    UI.toast('Ограждения убраны');
    UI.renderTasks();
  }

  /* ================= подмости (разрешено) ================= */
  {
    const deck = B(3.4, .12, 1.3, matWood);
    deck.position.set(0, .94, 7.15);
    deck.castShadow = deck.receiveShadow = true;
    scene.add(deck);
    regOcc(deck);
    addCol(-1.7, 1.7, 0, 1.0, 6.5, 7.8, 'platform');

    for (const [lx, lz] of [[-1.6, 6.6], [1.6, 6.6], [-1.6, 7.7], [1.6, 7.7]]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 8), matYel);
      l.position.set(lx, .5, lz);
      l.castShadow = true;
      scene.add(l);
    }
    /* перила: дальняя от стены сторона и западный торец (восток — вход по ступеням) */
    for (const y of [1.45, 1.9]) {
      const r1 = B(3.4, .05, .05, matYel); r1.position.set(0, y, 6.55); scene.add(r1);
      const r2 = B(.05, .05, 1.3, matYel); r2.position.set(-1.65, y, 7.15); scene.add(r2);
    }
    /* ступени с восточной стороны */
    for (let k = 0; k < 3; k++) {
      const top = 1.0 - (k + 1) * .25, x1 = 1.7 + k * .55;
      const st = B(.55, top, 1.3, matYel);
      st.position.set(x1 + .275, top / 2, 7.15);
      st.castShadow = st.receiveShadow = true;
      scene.add(st);
      regOcc(st);
      addCol(x1, x1 + .55, 0, top, 6.5, 7.8, 'stair');
    }
  }

  /* ================= стремянка (ЗАПРЕЩЕНО) ================= */
  const ladderPos = new THREE.Vector3(-3.2, 0, 7.0);
  let climbBusy = false;
  {
    const plat = B(.5, .07, .45, matYel);
    plat.position.set(-3.2, 1.115, 7.0);
    plat.castShadow = true;
    scene.add(plat);
    regOcc(plat);
    for (const s of [-1, 1]) {
      const l1 = B(.05, 1.35, .05, matYel);
      l1.position.set(-3.2 + s * .18, .62, 7.0 + s * .2);
      l1.rotation.x = s * .32;
      const l2 = B(.05, 1.35, .05, matYel);
      l2.position.set(-3.2 + s * .18, .62, 7.0 - s * .2);
      l2.rotation.x = -s * .32;
      scene.add(l1, l2);
    }
    addCol(-3.45, -2.95, 0, 1.15, 6.78, 7.22, 'ladder');

const z = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.5, .6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    z.position.set(-3.2, .8, 7.0);
    scene.add(z);
    regInter(z, () => climbBusy ? null
        : (Player.on === 'ladder' ? 'Спуститься со стремянки' : 'Подняться по стремянке'),
      climbLadder);
  }
  function climbLadder() {
    if (climbBusy) return;
    climbBusy = true;
    const from = Player.pos.clone();
    const to = Player.on === 'ladder'
      ? new THREE.Vector3(ladderPos.x + 1.1, 0, ladderPos.z)
      : new THREE.Vector3(ladderPos.x, 1.15, ladderPos.z);
    FX.tween(.6, k => Player.pos.lerpVectors(from, to, k),
      () => { climbBusy = false; Player.vy = 0; });
    if (Player.on !== 'ladder' && !G.ladderWarn) {
      G.ladderWarn = true;
      UI.toast('Работать с пиротехническим инструментом со СТРЕМЯНОК ЗАПРЕЩЕНО! Используйте подмости', 'warn', 6);
    }
  }

  /* ================= урна ================= */
  const trash = new THREE.Mesh(new THREE.CylinderGeometry(.34, .28, .95, 14),
    new THREE.MeshStandardMaterial({ color: 0x2e5a3a, roughness: .7 }));
  trash.position.set(4.5, .475, 3.8);
  trash.castShadow = true;
  scene.add(trash);
  addCol(4.16, 4.84, 0, .95, 3.46, 4.14);
  regInter(trash, () => {
    if (G.handItem && G.handItem.kind !== 'bracket') return 'Выбросить в урну';
    if (G.shellsTrash > 0) return 'Забрать гильзы из урны';
    return null;
  }, trashAct);

  function trashAct() {
    const h = G.handItem;
    if (h) {
      if (h.kind === 'dud') {                    // осечный патрон в мусор — пожар
        FX.fire(trash.position.clone().setY(1.1));
        UI.fail('ВОСПЛАМЕНЕНИЕ',
          'Осечный патрон, выброшенный в урну с мусором, воспламенился!',
          'Патрон, давший осечку, помещают в контейнер с водой.');
        return;
      }
      if (h.kind === 'shell') {
        G.shellsTrash++;
        G.handItem = null;
        Pistol.updHand();
        remark('Гильзы выброшены в мусор');
        UI.toast('Гильза выброшена в мусор — так делать не следует', 'warn');
        UI.renderTasks();
        return;
      }
      G.handItem = null;
      Pistol.updHand();
      UI.toast('Выброшено');
      return;
    }
    if (G.shellsTrash > 0) {                     // вернуть гильзы из урны в кейс
      for (let i = 0; i < G.shellsTrash; i++) Pistol.addShellVis();
      G.shellsCase += G.shellsTrash;
      G.shellsTrash = 0;
      remark('Гильзы пришлось доставать из мусора');
      UI.toast('Гильзы переложены из урны в кейс');
      UI.renderTasks(); UI.renderStatus();
    }
  }

  /* ================= контейнер с водой ================= */
  const waterB = new THREE.Mesh(new THREE.CylinderGeometry(.3, .24, .6, 14),
    new THREE.MeshStandardMaterial({ color: 0x4a6f8a, roughness: .6 }));
  waterB.position.set(5.6, .3, 4.9);
  waterB.castShadow = true;
  scene.add(waterB);
  addCol(5.3, 5.9, 0, .62, 4.6, 5.2);

  const waterS = new THREE.Mesh(new THREE.CircleGeometry(.26, 20),
    new THREE.MeshStandardMaterial({ color: 0x3f7fa8, roughness: .15 }));
  waterS.rotation.x = -Math.PI / 2;
  waterS.position.set(5.6, .56, 4.9);
  scene.add(waterS);

  const dudFloat = new THREE.Group();            // патрон, плавающий в воде
  {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .05, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a4a20, roughness: .7 }));
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.0092, .0092, .013, 8),
      new THREE.MeshStandardMaterial({ color: 0xcf3526 }));
    t.position.y = .03;
    dudFloat.add(b, t);
  }
  dudFloat.rotation.z = 1.2;
  dudFloat.position.set(5.6, .58, 4.9);
  dudFloat.visible = false;
  scene.add(dudFloat);

  regInter(waterB, () => {
    if (G.handItem && G.handItem.kind === 'dud') return 'Поместить патрон в воду';
    if (G.dudIn === 'water') return 'Забрать патрон из воды';
    return null;
  }, waterAct);

  function waterAct() {
    if (G.handItem && G.handItem.kind === 'dud') {
      G.handItem = null;
      G.dudIn = 'water';
      dudFloat.visible = true;
      Pistol.updHand();
      SFX.splash();
      UI.toast('Осечный патрон помещён в контейнер с водой — правильно');
      UI.renderTasks();
      return;
    }
    if (G.dudIn === 'water') {
      G.dudIn = 'hand';
      G.handItem = { kind: 'dud' };
      dudFloat.visible = false;
      Pistol.updHand();
      SFX.splash();
      UI.toast('Патрон взят из воды — уберите его в кейс для сдачи на склад');
    }
  }

  /* ================= поддон с кронштейнами ================= */
  {
    const pallet = B(1.3, .14, 1.1, matWood);
    pallet.position.set(-5.2, .07, 3.6);
    pallet.castShadow = true;
    scene.add(pallet);
    addCol(-5.85, -4.55, 0, .35, 3.05, 4.15);
  }
  let bracketsLeft = 2;
  const palletItems = [];
  for (let i = 0; i < 2; i++) {
    const bg = new THREE.Group();
    bg.add(B(.24, .1, .02, matSteel));
    const a = B(.02, .02, .14, matSteel);
    a.position.set(.1, -.03, .07);
    bg.add(a);
    bg.position.set(-5.4 + i * .4, .22, 3.6);
    bg.rotation.y = .4 + i * .3;
    bg.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(bg);
    palletItems.push(bg);
    regInter(bg, () => (G.handItem || bracketsLeft <= 0) ? null : 'Взять кронштейн', takeBracket);
  }
  function takeBracket() {
    if (G.handItem || bracketsLeft <= 0) return;
    bracketsLeft--;
    palletItems[bracketsLeft].visible = false;
    G.handItem = { kind: 'bracket' };
    Pistol.updHand();
    SFX.clack();
    UI.toast('Кронштейн взят. Установите его по оранжевой разметке на стене');
    UI.renderTasks();
  }

  /* ================= штабель кирпича + табличка ================= */
  {
    const bt = Tex.brick.clone();
    bt.needsUpdate = true;
    bt.repeat.set(2, 1.4);                       // своя плотность, не как у стены
    const bs = B(1.4, .9, 1, new THREE.MeshStandardMaterial({ map: bt, roughness: .9 }));
    bs.position.set(6.8, .45, 6.2);
    bs.castShadow = true;
    scene.add(bs);
    addCol(6.1, 7.5, 0, .95, 5.7, 6.7);

    const s = sign(1.1, .38, (g, w, h) => {
      g.fillStyle = '#f4efe4'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3c3a36'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#26241f'; g.textAlign = 'center';
      g.font = 'bold 34px Arial'; g.fillText('СТЕНА', w / 2, 34);
      g.font = '26px Arial'; g.fillText('силикатный кирпич', w / 2, 68);
    });
    s.position.set(6.8, 1.15, 5.69);             // лицом к подходу (+Z)
    scene.add(s);
  }

  /* ================= кучка гильз на земле ================= */
  const shellPile = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .026, 8), matBrass);
    s.position.set((Math.random() - .5) * .15, .012, (Math.random() - .5) * .15);
    s.rotation.z = Math.PI / 2;
    s.rotation.y = Math.random() * Math.PI;
    shellPile.add(s);
  }
  shellPile.visible = false;
  scene.add(shellPile);

  regInter(shellPile, () => shellPile.visible ? 'Собрать гильзы с пола' : null, () => {
    if (G.dudIn === 'floor') {                   // осечный патрон на полу — пожар при сборе
      FX.fire(shellPile.position.clone().setY(.2));
      UI.fail('ВОСПЛАМЕНЕНИЕ',
        'При сборе гильз воспламенился осечный патрон, брошенный на землю!',
        'Патрон, давший осечку, помещают в воду, а не оставляют на полу.');
      return;
    }
    for (let i = 0; i < G.shellsFloor; i++) Pistol.addShellVis();
    G.shellsCase += G.shellsFloor;
    G.shellsFloor = 0;
    shellPile.visible = false;
    SFX.tink();
    UI.toast('Гильзы собраны и убраны в кейс');
    UI.renderTasks(); UI.renderStatus();
  });

  function showShellPile(pos) {                  // вызывается из pistol.js (бросок гильзы)
    shellPile.position.copy(pos);
    shellPile.position.y = 0;
    shellPile.visible = true;
  }

  /* ================= рабочие за стеной ================= */
  const workers = [];
  for (const [x, z] of [[-1.5, 10.3], [1.8, 11]]) {
    const w = NPC.make(0xe07818, 0xf2c400);
    w.g.position.set(x, 0, z);
    w.g.rotation.y = Math.PI + (x > 0 ? .3 : -.3);   // лицом к стене
    w.col = addCol(x - .3, x + .3, 0, 1.8, z - .3, z + .3);
    workers.push(w);
    regInter(w.g, () => w.leaving ? null : 'Попросить уйти из опасной зоны',
      () => npcLeave(w), true);
  }
  function npcLeave(w) {
    if (w.leaving) return;
    w.leaving = true;
    remCol(w.col);
    SFX.clack();
    const z0 = w.g.position.z, T = 10;
    FX.tween(T, k => {
      w.g.position.z = z0 + 1.5 * k * T;       // уходят от стены (+Z)
      w.g.rotation.y = 0;
      w.arms[0].rotation.x = Math.sin(k * T * 7) * .6;
      w.arms[1].rotation.x = -Math.sin(k * T * 7) * .6;
    }, () => NPC.remove(w));
    UI.toast('Рабочий выведен из опасной зоны');
    if (workers.every(v => v.leaving)) {
      G.peopleRemoved = true;
      UI.toast('Все люди выведены из опасной зоны');
      UI.renderTasks();
    }
  }

  /* ================= экспорт ================= */
  return {
    points, workers, donePts,
    holeDecal, halfDowel, showShellPile,
    trash, waterB, fenceSegs
  };
})();