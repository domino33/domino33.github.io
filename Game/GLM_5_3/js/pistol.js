/* ============================================================
   ПИСТОЛЕТ, КЕЙС, ПРЕДМЕТЫ В РУКЕ, ЗАРЯЖАНИЕ, ВЫСТРЕЛЫ,
   ОСЕЧКА, ОБМЕН И СДАЧА ИНСТРУМЕНТА.
   Зависимости (рантайм): Site, Warehouse, Player, UI, FX, SFX.
   ============================================================ */

const Pistol = (() => {
  const WZ = CONST.WALL_Z;

  /* ================= модель пистолета ================= */
  const pistol = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3d4f42, roughness: .5, metalness: .25 });
  {
    const body = B(.075, .095, .2, bodyMat); body.position.set(0, .01, .03); pistol.add(body);
    const grip = B(.05, .15, .07, matDark); grip.position.set(0, -.09, .1); grip.rotation.x = .32; pistol.add(grip);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(.028, .007, 8, 16), matDark);
    guard.position.set(0, -.04, .02); guard.rotation.y = Math.PI / 2; pistol.add(guard);
  }
  /* передняя часть — вращается при переломлении */
  const pFront = new THREE.Group(); pFront.position.set(0, .01, -.07); pistol.add(pFront);
  {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .3, 14), matSteel);
    barrel.rotation.x = Math.PI / 2; barrel.position.z = -.16; pFront.add(barrel);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .07, 14), bodyMat);
    sleeve.rotation.x = Math.PI / 2; sleeve.position.z = -.09; pFront.add(sleeve);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, .045, 14), matDark);
    nose.rotation.x = Math.PI / 2; nose.position.z = -.305; pFront.add(nose);
  }
  /* дюбель, выглядывающий из дула */
  const vDowel = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .05, 8), matSteel);
  vDowel.rotation.x = Math.PI / 2; vDowel.position.z = -.345;
  vDowel.visible = false; pFront.add(vDowel);
  /* патрон в патроннике (виден при переломлении) */
  const vCart = new THREE.Group();
  {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .045, 10), matBrass);
    b.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(.0115, .0115, .012, 10),
      new THREE.MeshStandardMaterial({ color: 0x35a34a }));
    tip.rotation.x = Math.PI / 2; tip.position.z = .028;
    vCart.add(b, tip);
  }
  vCart.position.set(0, .07, -.02); vCart.visible = false; pistol.add(vCart);
  /* вспышка выстрела */
  const muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: Tex.fire, transparent: true, opacity: 0, depthWrite: false }));
  muzzleFlash.scale.setScalar(.3); muzzleFlash.position.set(0, .01, -.42); pFront.add(muzzleFlash);
  const muzzleLight = new THREE.PointLight(0xffb45e, 0, 6, 2); muzzleFlash.add(muzzleLight);

  /* ================= кейс ================= */
  const caseG = new THREE.Group(); let lidG;
  {
    const cm = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: .55 });
    const ym = new THREE.MeshStandardMaterial({ color: 0xd9a112, roughness: .5 });
    const base = B(.6, .1, .4, cm); base.position.y = .05; base.castShadow = true; caseG.add(base);
    lidG = new THREE.Group(); lidG.position.set(0, .1, -.2); caseG.add(lidG);
    const lid = B(.6, .03, .4, cm); lid.position.set(0, .015, .2); lid.castShadow = true; lidG.add(lid);
    const latch = B(.09, .022, .035, ym); latch.position.set(0, .032, .17); lidG.add(latch);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 8, 16, Math.PI), ym);
    handle.position.set(0, .03, .02); lidG.add(handle);
    /* содержимое: пачки патронов 4 цветов, дюбели, отсек гильз */
    const slot = new THREE.Group(); slot.position.y = .105; caseG.add(slot);
    [0xe8c832, 0x35a34a, 0xcf3526, 0x232323].forEach((c, i) => {
      const p = B(.09, .035, .07, new THREE.MeshStandardMaterial({ color: c, roughness: .6 }));
      p.position.set(-.2 + (i % 2) * .12, 0, .05); slot.add(p);
    });
    const db = B(.12, .03, .12, new THREE.MeshStandardMaterial({ color: 0x565b63, roughness: .6 }));
    db.position.set(.2, 0, .05); slot.add(db);
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .11, 6), matSteel);
      p.rotation.z = Math.PI / 2; p.position.set(.2, .028, .05 + (i - 1) * .03); slot.add(p);
    }
    const sb = B(.14, .028, .12, new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .7 }));
    sb.position.set(-.02, 0, .08); slot.add(sb);
    caseG.userData.shellsRow = new THREE.Group();
    caseG.userData.shellsRow.position.set(-.02, .03, .08); slot.add(caseG.userData.shellsRow);
    caseG.userData.pistolSlot = new THREE.Group();
    caseG.userData.pistolSlot.position.set(0, .02, -.1); slot.add(caseG.userData.pistolSlot);
  }
  caseG.position.copy(Warehouse.caseSpot);          // на стеллаже склада
  scene.add(caseG);
  regInter(caseG, () => G.caseCarried ? null : 'Взять кейс [F]',
    () => { if (!G.caseCarried) toggleCase(); });

  /* ================= левая рука (viewmodel) ================= */
  const vmHand = new THREE.Group(); camera.add(vmHand); vmHand.position.set(-.3, -.34, -.52);
  const vmShell = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .05, 10), matBrass); vmHand.add(vmShell);
  const vmCartM = new THREE.Group();
  {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .045, 10), matBrass);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.0092, .0092, .013, 10),
      new THREE.MeshStandardMaterial({ color: 0x35a34a }));
    t.position.y = .028; vmCartM.add(b, t); vmCartM.userData.tip = t;
  }
  vmHand.add(vmCartM);
  const vmDud = new THREE.Group();
  {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .05, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a4a20, roughness: .7 }));
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.0092, .0092, .013, 10),
      new THREE.MeshStandardMaterial({ color: 0xcf3526 }));
    t.position.y = .03; vmDud.add(b, t);
  }
  vmHand.add(vmDud);
  const vmBracket = new THREE.Group();
  {
    vmBracket.add(B(.24, .1, .02, matSteel));
    const a = B(.02, .02, .14, matSteel); a.position.set(.1, -.04, .07); vmBracket.add(a);
  }
  vmHand.add(vmBracket);

  /* ================= служебное ================= */
  let recoil = 0, splitDone = false;

  function layoutPistol() {
    if (G.pistolCarried) {
      camera.add(pistol);
      pistol.position.set(.26, -.28, -.55); pistol.rotation.set(0, -.05, .02);
      pistol.visible = true;
    } else if (G.pistolInCase) {
      caseG.userData.pistolSlot.add(pistol);
      pistol.position.set(0, 0, 0); pistol.rotation.set(0, Math.PI / 2, 1.3);
      pistol.visible = true;
    } else pistol.visible = false;
  }
  layoutPistol();                                   // на старте пистолет в кейсе

  function setCartTip() {
    if (!G.chamber) { vCart.visible = false; return; }
    vCart.visible = G.brokenOpen;
    vCart.children[1].material.color.set(
      G.chamber === 'dud' ? 0x555555
      : { yellow: 0xe8c832, green: 0x35a34a, red: 0xcf3526, black: 0x232323 }[G.chamber]);
  }

  function caseNear() {
    if (G.caseCarried) return true;
    return caseG.position.distanceTo(new THREE.Vector3(Player.pos.x, 0, Player.pos.z)) < 2.5;
  }

  /* ================= кейс: взять / положить ================= */
  function takeCase() {
    if (G.handItem) { UI.toast('Руки заняты'); return; }
    camera.add(caseG);
    caseG.position.set(-.38, -.5, -.8);
    caseG.rotation.set(.9, .42, .08);
    G.caseCarried = true;
    FX.tween(.3, k => { lidG.rotation.x = -1.9 * k; });   // крышка открывается
    SFX.clack();
    UI.toast('Кейс взят. Внутри пачки патронов и дюбели');
    UI.renderStatus();
  }
  function dropCase() {
    scene.add(caseG);
    caseG.rotation.set(0, 0, 0);
    const f = new THREE.Vector3(-Math.sin(Player.yaw), 0, -Math.cos(Player.yaw));
    caseG.position.set(Player.pos.x + f.x * .8, 0, Player.pos.z + f.z * .8);
    if (Math.abs(caseG.position.x) < 6.6 && caseG.position.z > WZ - .7) caseG.position.z = WZ - .7;
    G.caseCarried = false; G.caseGroundT = 0;
    SFX.thud();
    UI.renderStatus();
  }
  function toggleCase() {
    if (G.caseCarried) { dropCase(); return; }
    if (G.handItem) { UI.toast('Руки заняты'); return; }
    if (caseNear()) takeCase(); else UI.toast('Подойдите к кейсу');
  }

  /* гильза в отсек кейса (вызывается и из world_site) */
  function addShellVis() {
    const row = caseG.userData.shellsRow;
    const n = Math.min(row.children.length, 7);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .024, 8), matBrass);
    s.position.x = -.05 + n * .02;
    row.add(s);
  }

  /* обновление предмета в руке */
  function updHand() {
    const h = G.handItem;
    vmShell.visible = vmCartM.visible = vmDud.visible = vmBracket.visible = false;
    if (h) {
      if (h.kind === 'shell') vmShell.visible = true;
      else if (h.kind === 'cartridge') {
        vmCartM.visible = true;
        vmCartM.userData.tip.material.color.set(
          { yellow: 0xe8c832, green: 0x35a34a, red: 0xcf3526, black: 0x232323 }[h.color]);
      }
      else if (h.kind === 'dud') vmDud.visible = true;
      else if (h.kind === 'bracket') vmBracket.visible = true;
    }
    UI.renderStatus();
  }

  /* ================= X: пистолет ↔ кейс ================= */
  function togglePistol() {
   /* разваленный пистолет нельзя убрать в кейс — только сдать кладовщику;
       до переломления дефект неизвестен — носить можно */
    if (G.pistolDead && !G.exchanged && G.pistolSplit) {
      UI.toast('Пистолет развален на две части — сдайте его кладовщику', 'warn');
      return;
    }
    if (G.misfire && !G.misfireOk) {
      accidentalShot('СЛУЧАЙНЫЙ ВЫСТРЕЛ',
        'Пистолет с осечным патроном убран от стены — произошёл выстрел!',
        'При осечке не отводите инструмент от стены.');
      return;
    }
    if (G.pistolCarried) {
      if (G.brokenOpen) { UI.toast('Сначала закройте пистолет [R]'); return; }
      if (G.chamber && G.stage >= 4) {                       // сдача заряженного
        SFX.shot(); UI.flashRed();
        UI.fail('ВЫСТРЕЛ В КЕЙСЕ',
          'Вы убрали в кейс заряженный пистолет — произошёл выстрел!',
          'Перед сдачей инструмента убедитесь, что он разряжен.');
        return;
      }
      if (G.chamber) {
        UI.toast('При перерывах в работе пистолет следует разрядить', 'warn');
        remark('Заряженный пистолет убран в кейс');
      }
      G.pistolCarried = false; G.pistolInCase = true;
    } else {
      if (!G.pistolInCase) { UI.toast('Пистолета нет в кейсе'); return; }
      if (G.handItem) { UI.toast('Руки заняты — освободите [G]'); return; }
      if (G.caseTrap) {                                     // не проверили на складе
        G.caseTrap = false;
        accidentalShot('СЛУЧАЙНЫЙ ВЫСТРЕЛ',
          'При доставании пистолета из кейса произошёл выстрел — инструмент не был проверен на складе!',
          'При получении пистолета убедитесь, что он не заряжен.');
        return;
      }
      G.pistolCarried = true; G.pistolInCase = false;
    }
    layoutPistol(); SFX.clack();
    UI.renderStatus(); UI.renderTasks();
  }

  /* ================= R: переломить / закрыть ================= */
  function pistolKeys() {
    if (!G.pistolCarried) return;
    /* переломить раньше минуты после осечки */
    if (G.misfire && !G.misfireOk) {
      SFX.shot(); UI.flashRed();
      UI.fail('ВЫСТРЕЛ ПРИ РАЗРЯДКЕ',
        'Вы переломили пистолет раньше, чем прошла минута после осечки, — произошёл выстрел, гильза отлетела в лицо!',
        'Разряжать инструмент допускается не ранее чем через 1 минуту после осечки.');
      return;
    }
    if (!G.brokenOpen) {
      /* первый пистолет разваливается */
      if (G.pistolDead) {
  if (!splitDone) {
          splitDone = true;
          G.pistolSplit = true;
          FX.tween(.4, k => { pFront.rotation.x = 1.35 * k; });
          SFX.buzz();
          UI.toast('Пистолет РАЗВАЛИЛСЯ на две части! Инструмент неисправен — сдайте его кладовщику.', 'danger', 7);
          remark('Получен неисправный инструмент');
          UI.renderTasks();
        } else UI.toast('Пистолет развален — сдайте его кладовщику', 'warn');
        return;
      }
      G.brokenOpen = true;
      FX.tween(.15, k => { pFront.rotation.x = -.9 * k; });
      SFX.clack();
      if (G.chamber === 'dud') UI.toast('В патроннике ОСЕЧНЫЙ ПАТРОН — извлеките [E]', 'warn');
      else if (G.chamber) UI.toast('В патроннике ПАТРОН — пистолет был заряжен! Извлеките [E]', 'warn');
      else if (G.spentShell) UI.toast('В патроннике гильза — извлеките [E]');
      setCartTip(); UI.renderStatus();
      return;
    }
    /* закрыть */
if (G.spentShell) { UI.toast('Сначала извлеките стреляную гильзу [E]', 'warn'); return; }
    G.brokenOpen = false;
    FX.tween(.15, k => { pFront.rotation.x = -.9 * (1 - k); });
    SFX.clack(); setCartTip(); UI.renderStatus();
  }

  /* ================= E: извлечь патрон / гильзу ================= */
  function extractE() {
    if (!G.pistolCarried || !G.brokenOpen) return false;
 if (G.handItem) { UI.toast('Рука занята — сначала уберите предмет в кейс или контейнер'); return false; }
    if (G.chamber === 'dud') {
      G.handItem = { kind: 'dud' }; G.dudIn = 'hand';
      G.chamber = null; G.misfire = false; G.misfireOk = true;
      UI.misfire(false);
      UI.toast('Осечный патрон извлечён. Немедленно поместите его в контейнер с водой!', 'warn', 6);
    } else if (G.chamber) {
      G.handItem = { kind: 'cartridge', color: G.chamber };
      G.chamber = null;
      if (!G.inspected) {
        G.inspected = true; G.caseTrap = false;
        UI.toast('Патрон извлечён — инструмент осмотрен и разряжен');
      } else UI.toast('Патрон извлечён');
    } else if (G.spentShell) {
      G.handItem = { kind: 'shell' }; G.spentShell = false;
      UI.toast('Гильза в руке — уберите её в кейс [E]');
    } else return false;
    SFX.tink();
    updHand(); setCartTip(); UI.renderTasks(); UI.renderStatus();
    return true;
  }

  /* ================= 1: дюбель в ствол ================= */
  function takeDowel() {
    if (!G.pistolCarried) { UI.toast('Возьмите пистолет [X]'); return; }
    if (G.pistolDead) { UI.toast('Пистолет неисправен', 'warn'); return; }
    if (!G.brokenOpen) { UI.toast('Сначала переломите пистолет [R]'); return; }
    if (G.barrelDowel) { UI.toast('Дюбель уже в стволе'); return; }
    if (!caseNear()) { UI.toast('Подойдите к кейсу — дюбели лежат в нём'); return; }
    G.barrelDowel = true; vDowel.visible = true;
    SFX.tink();
    if (Site.points.some(p => p.state === 'half'))
      UI.toast('Дюбель в стволе. Для ДОБИВАНИЯ недобитого дюбеля новый дюбель НЕ нужен', 'warn', 5);
    else UI.toast('Дюбель установлен в ствол. Теперь зарядите патрон [2]');
    UI.renderStatus();
  }

  /* ================= 2: выбор патрона ================= */
  function openCartPanel() {
    if (!G.pistolCarried) { UI.toast('Возьмите пистолет [X]'); return; }
    if (G.pistolDead) { UI.toast('Пистолет неисправен', 'warn'); return; }
    if (!G.brokenOpen) { UI.toast('Сначала переломите пистолет [R]'); return; }
    if (G.chamber) { UI.toast('Патрон уже в патроннике — сначала извлеките [E]', 'warn'); return; }
    if (!caseNear()) { UI.toast('Подойдите к кейсу — пачки патронов в нём'); return; }
    const ready = G.atSite && G.fences && G.peopleRemoved;
    UI.carts(true, ready
      ? 'Стена: силикатный кирпич. Помните: сначала дюбель, затем патрон.'
      : 'ВНИМАНИЕ: рабочее место ещё не подготовлено — заряжать ЗАПРЕЩЕНО!');
  }

  function chooseCart(i) {
    UI.carts(false);
    const col = ['yellow', 'green', 'red', 'black'][i];
    /* заряжание до подготовки места */
    if (!(G.atSite && G.fences && G.peopleRemoved)) {
      SFX.shot(); UI.flashRed();
      const p = new THREE.Vector3(); muzzleFlash.getWorldPosition(p); FX.smoke(p, 2);
      UI.fail('СЛУЧАЙНЫЙ ВЫСТРЕЛ',
        'Вы зарядили пистолет до полной подготовки рабочего места — произошёл случайный выстрел!',
        'Запрещается заряжать инструмент до полной подготовки рабочего места.');
      return;
    }
    /* патрон до дюбеля (для повторного выстрела по недобитому дюбель не нужен) */
    const halfExists = Site.points.some(p => p.state === 'half');
    if (!G.barrelDowel && !halfExists) {
      SFX.shot(); UI.flashRed();
      const p = new THREE.Vector3(); muzzleFlash.getWorldPosition(p); FX.smoke(p, 2);
      UI.fail('СЛУЧАЙНЫЙ ВЫСТРЕЛ',
        'Вы зарядили патрон до установки дюбеля — произошёл преждевременный выстрел!',
        'Сначала установите дюбель в ствол, затем заряжайте патрон.');
      return;
    }
    G.chamber = col; setCartTip(); SFX.tink();
    UI.toast('Патрон ' + CONST.COLN[col] + ' заряжен. Закройте пистолет [R] и прижмите к стене');
    UI.renderStatus();
  }

  /* ================= G: бросить предмет ================= */
  function dropHand() {
    const h = G.handItem; if (!h) return;
    if (h.kind === 'bracket') { UI.toast('Кронштейн установите на стену по разметке [E]'); return; }
    const f = new THREE.Vector3(-Math.sin(Player.yaw), 0, -Math.cos(Player.yaw));
    const p = new THREE.Vector3(Player.pos.x + f.x * .6, 0, Player.pos.z + f.z * .6);
    if (h.kind === 'shell') {
      G.shellsFloor++; Site.showShellPile(p);
      remark('Гильзы бросались на пол');
      UI.toast('Гильза брошена на пол — соберите её в конце работ', 'warn');
    } else if (h.kind === 'dud') {
      G.dudIn = 'floor'; Site.showShellPile(p);
      remark('Осечный патрон брошен на пол');
      UI.toast('Осечный патрон брошен на пол — это опасно!', 'danger');
    } else {
      remark('Патрон утерян');
      UI.toast('Патрон выброшен и утерян', 'warn');
    }
    G.handItem = null; updHand(); UI.renderTasks();
  }

  /* ================= E: убрать предмет в кейс ================= */
  function putToCase() {
    const h = G.handItem;
    if (!h || !caseNear()) return false;
    if (h.kind === 'shell') {
      G.shellsCase++; addShellVis();
      UI.toast('Гильза убрана в кейс — правильно');
    } else if (h.kind === 'dud') {
      G.dudIn = 'case';
      UI.toast('Осечный патрон убран в кейс для сдачи на склад');
    } else if (h.kind === 'cartridge') {
      UI.toast('Патрон убран обратно в кейс');
    } else return false;
    G.handItem = null; SFX.tink();
    updHand(); UI.renderTasks(); UI.renderStatus();
    return true;
  }

  /* ================= прицеливание в точку крепления ================= */
  function aimPoint() {
    const cf = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const eye = camera.position;
    let best = null;
    for (const pt of Site.points) {
      if (pt.state === 'done') continue;
      const to = new THREE.Vector3(pt.x - eye.x, pt.y - eye.y, WZ - eye.z);
      const d = to.length();
      if (d > 1.35) continue;                 // дуло должно касаться стены
      to.normalize();
      if (cf.dot(to) < .995) continue;        // смотрим точно в кольцо
      if (!best || d < best.d) best = { pt, d };
    }
    return best;
  }

  /* ================= ЛКМ: выстрел ================= */
  function tryShoot() {
    if (!G.pistolCarried) return false;       // → обычное взаимодействие
    if (G.brokenOpen) { UI.prompt('Закройте пистолет [R]'); return true; }
    if (G.chamber === 'dud') { SFX.click(); UI.prompt('Патрон дал осечку — держите инструмент у стены!'); return true; }
    if (!G.chamber) { SFX.click(); UI.prompt('Патрона нет — зарядите [2]'); return true; }
    /* выстрел со стремянки */
    if (Player.on === 'ladder') {
      SFX.shot(); UI.flashRed();
      UI.fail('ПАДЕНИЕ СО СТРЕМЯНКИ',
        'Выстрел со стремянки! Отдача сбила вас — падение.',
        'Работать с пиротехническим инструментом со стремянок запрещается.');
      return true;
    }
    const cf = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const ap = aimPoint();
    if (ap) {
      /* прижатие с перекосом */
      if (cf.z < .88) {
        SFX.shot(); UI.flashRed();
        FX.tracer(new THREE.Vector3(ap.pt.x, ap.pt.y, WZ),
          new THREE.Vector3(Math.sign(cf.x) || 1, .25, -.6));
        UI.fail('РИКОШЕТ',
          'Вы прижали пистолет к стене с перекосом — дюбель рикошетировал!',
          'Дульную часть прижимают к рабочей поверхности под прямым углом.');
        return true;
      }
      fireAtPoint(ap.pt);
      return true;
    }
    /* луч попадает в стену мимо точки? */
    if (cf.z > .3) {
      const t = (WZ - camera.position.z) / cf.z;
      const hx = camera.position.x + cf.x * t, hy = camera.position.y + cf.y * t;
      if (t < 3.5 && Math.abs(hx) < 6 && hy > 0 && hy < 3.6) {
        if (cf.z >= .88) { fireAtWall(hx, hy); return true; }   // перпендикулярно, но мимо разметки
        if (camera.position.z > WZ - 2.2) {                      // вплотную к стене наискось
          SFX.shot(); UI.flashRed();
          FX.tracer(new THREE.Vector3(hx, hy, WZ),
            new THREE.Vector3(Math.sign(cf.x) || 1, .25, -.6));
          FX.debris(new THREE.Vector3(hx, hy, WZ - .05), 8, new THREE.Vector3(0, .4, -1));
          UI.fail('РИКОШЕТ',
            'Пистолет прижат к стене сбоку с перекосом — дюбель рикошетировал!',
            'Встаньте напротив точки крепления и прижмите пистолет перпендикулярно.');
          return true;
        }
      }
    }
    SFX.click();
    UI.prompt('Прижмите дульную часть к месту крепления под прямым углом');
    return true;
  }

  /* ---- проверки перед любым выстрелом (СИЗ, ограждение, люди) ---- */
  function preFireChecks(pt) {
    if (!ppeOk()) {
      SFX.shot(); UI.flashRed();
      const miss = [];
      if (!G.ppe.ears) miss.push('без защиты органов слуха — баротравма');
      if (G.ppe.eyes !== 'glasses') miss.push('без защитных очков — травма глаза осколком');
      if (!G.ppe.hands) miss.push('без краг — травма руки');
      UI.fail('ТРАВМА',
        'Выстрел без полного комплекта СИЗ: ' + miss.join('; ') + '.',
        'При работе с пиротехническим инструментом обязательны наушники, защитные очки и краги.');
      return false;
    }
    if (!G.fences) {                       // в неограждённую зону входит посторонний
      if (pt) doShotFX(pt.x, pt.y);
      const intr = NPC.make(0x6a8a4a, 0xd8d4ca);
      intr.g.position.set(11, 0, 1.5); intr.g.rotation.y = -Math.PI / 2;
      let fell = false;
      FX.tween(2.4, k => {
        intr.g.position.x = 11 - 9 * k;
        if (k > .55 && !fell) {
          fell = true; NPC.fall(intr);
          if (pt) FX.tracer(new THREE.Vector3(pt.x, pt.y, WZ), new THREE.Vector3(1, -.3, -.7));
        }
      }, () => NPC.remove(intr));
      setTimeout(() => UI.fail('РИКОШЕТ: ТРАВМИРОВАН ПОСТОРОННИЙ',
        'Опасная зона не была ограждена — в неё вошёл человек, дюбель рикошетировал в его сторону!',
        'Перед пристрелками выставьте защитные ограждения и удалите людей из зоны.'), 1500);
      return false;
    }
    if (!G.peopleRemoved) {                // за стеной рабочие
      if (pt) doShotFX(pt.x, pt.y);
      Site.workers.forEach(w => NPC.fall(w));
      if (pt) FX.debris(new THREE.Vector3(pt.x, pt.y, WZ + .3), 14, new THREE.Vector3(0, .4, 1));
      setTimeout(() => UI.fail('ЛЮДИ ТРАВМИРОВАНЫ ОСКОЛКАМИ',
        'За стеной находились рабочие — осколки кирпича травмировали их!',
        'Убедитесь, что в опасной зоне по другую сторону стены нет людей.'), 1200);
      return false;
    }
    return true;
  }

  /* ---- выстрел в стену вне разметки ---- */
  function fireAtWall(hx, hy) {
    if (!preFireChecks(null)) return;
    doShotFX(hx, hy);
    G.shots++;
    UI.toast('Дюбель забит ВНЕ разметки — крепление не выполнено', 'warn');
    remark('Выстрел вне разметки');
    Site.holeDecal({ x: hx, y: hy });
    finishShot();
  }

  /* ---- выстрел по точке крепления ---- */
  function fireAtPoint(pt) {
    /* скриптовая осечка на первом выстреле второго кронштейна */
    if (G.misfireNext && pt.state === 'fresh') {
      G.misfireNext = false;
      G.misfire = true; G.misfireT = 60;
      G.chamber = 'dud'; setCartTip();
      UI.misfire(true);
      SFX.click();
      UI.toast('ОСЕЧКА! Держите пистолет прижатым к стене. Не переломливайте его 60 секунд!', 'danger', 8);
      return;
    }
    if (!preFireChecks(pt)) return;
    doShotFX(pt.x, pt.y);
    G.shots++;
    const col = G.chamber;

    /* выстрел без дюбеля — впустую */
    if (pt.state === 'fresh' && !G.barrelDowel) {
      UI.toast('Выстрел БЕЗ ДЮБЕЛЯ — патрон израсходован впустую', 'warn');
      remark('Выстрел без дюбеля');
      Site.holeDecal(pt);
      finishShot();
      return;
    }
    /* избыточная мощность */
    if (col === 'red' || col === 'black') {
      FX.debris(new THREE.Vector3(pt.x, pt.y, WZ - .05), col === 'black' ? 22 : 14, new THREE.Vector3(0, .6, -1));
      FX.crackDecal(pt.x, pt.y, WZ - .008, col === 'black' ? 1.3 : 1);
      UI.fail(col === 'black' ? 'КИРПИЧ РАЗРУШЕН' : 'КИРПИЧ РАСКОЛОЛСЯ',
        'Мощность патрона (' + CONST.COLN[col] + ') избыточна для силикатного кирпича — материал разрушен!',
        'Мощность патрона выбирают в соответствии с материалом, в который забивают дюбель.');
      return;
    }
    if (pt.state === 'fresh') {
      if (col === 'yellow') {              // недобой
        pt.state = 'half'; Site.halfDowel(pt);
        UI.toast('Дюбель вошёл только наполовину. Добейте ЖЁЛТЫМ патроном — новый дюбель НЕ ставьте', 'warn', 6);
      } else {                             // зелёный — норма
        pt.state = 'done'; Site.holeDecal(pt); pt.ring.material.color.set(0x39c46a);
        UI.toast('Дюбель пристрелен заподлицо — точка крепления готова');
      }
      finishShot();
    } else if (pt.state === 'half') {      // добивание
      if (col === 'yellow') {
        pt.state = 'done'; Site.holeDecal(pt); pt.ring.material.color.set(0x39c46a);
        UI.toast('Дюбель добит — точка крепления готова');
      } else {
        FX.debris(new THREE.Vector3(pt.x, pt.y, WZ - .05), 14, new THREE.Vector3(0, .6, -1));
        FX.crackDecal(pt.x, pt.y, WZ - .008, 1);
        UI.fail('КРОНШТЕЙН РАЗРУШЕН',
          'Повторный выстрел патроном ' + CONST.COLN[col] + ' разрушил кирпич!',
          'Недобитый дюбель добивают только жёлтым (слабым) патроном.');
        return;
      }
      finishShot();
    }
  }

  function finishShot() {
    G.chamber = null; G.spentShell = true;
    G.barrelDowel = false; vDowel.visible = false;
    setCartTip(); UI.renderStatus();
    afterShot();
  }

  function afterShot() {
    for (let i = 0; i < 2; i++)
      G.brackets[i].done = Site.points.filter(p => p.bi === i && p.state === 'done').length === 2;
    /* осечка при переходе ко второму кронштейну */
    if (Site.donePts() >= 2 && Site.donePts() < 4) G.misfireNext = true;
    /* всё пристрелено → этап 4, дождь */
    if (G.brackets.every(b => b.done) && G.stage < 4) {
      G.stage = 4;
      UI.toast('Оба кронштейна пристрелены. Этап 4: окончание работ', 'info', 6);
      setTimeout(() => {
        FX.startRain();
        UI.toast('Начался дождь. Поднимите кейс с патронами [F], чтобы вода не попала внутрь', 'warn', 6);
      }, 2500);
    }
    UI.renderTasks();
  }

  function doShotFX(x, y) {
    SFX.shot(); recoil = 1; UI.flashRed();
    muzzleFlash.material.opacity = 1; muzzleLight.intensity = 8;
    FX.tween(.15, k => {
      muzzleFlash.material.opacity = 1 - k;
      muzzleLight.intensity = 8 * (1 - k);
    });
    const hp = new THREE.Vector3(x, y, WZ - .05);
    FX.smoke(hp, 3);
    FX.debris(hp, 5, new THREE.Vector3(0, .3, -1));
  }

  /* случайный выстрел (нарушения при переноске/осечке/наведении) */
  function accidentalShot(title, msg, req) {
    SFX.shot(); UI.flashRed();
    const p = new THREE.Vector3();
    muzzleFlash.getWorldPosition(p);
    FX.smoke(p, 3);
    FX.debris(p, 4, new THREE.Vector3(0, .5, -1));
    UI.fail(title, msg, req);
  }

  /* ================= кладовщик: обмен неисправного ================= */
  function exchange() {
     G.exchanged = true; G.pistolDead = false; G.pistolSplit = false;
    G.pistolCarried = false; G.pistolInCase = true;
    G.brokenOpen = false; G.chamber = 'green';   // исправный, но ЗАРЯЖЕН
    G.spentShell = false; G.barrelDowel = false; G.inspected = false;
    pFront.rotation.x = 0; vDowel.visible = false; splitDone = false;
    layoutPistol(); setCartTip();
    SFX.clack();
    UI.toast('Кладовщик выдал исправный пистолет и уложил его в кейс. Достаньте [X], переломите [R] — он ЗАРЯЖЕН, извлеките патрон [E]!', 'warn', 8);
    UI.renderTasks(); UI.renderStatus();
  }

  /* ================= кладовщик: сдача (этап 4) ================= */
  function handIn() {
    const bad = [];
    if (!G.pistolInCase) bad.push('пистолет не в кейсе');
    if (G.chamber || G.spentShell) bad.push('пистолет не разряжен');
    if (G.shellsFloor > 0) bad.push('гильзы на земле не собраны');
    if (G.shellsTrash > 0) bad.push('гильзы остались в урне');
    if (G.dudIn === 'water') bad.push('патрон с осечкой остался в воде');
    if (G.dudIn === 'hand' || (G.handItem && G.handItem.kind === 'dud')) bad.push('патрон с осечкой не убран в кейс');
    if (G.dudIn === 'floor') bad.push('патрон с осечкой брошен на земле');
    if (G.handItem) bad.push('в руке остался предмет');
    if (!G.fencesRemoved) bad.push('ограждения не убраны');
    if (bad.length) {
      UI.toast('НАРУШЕНИЕ при сдаче: ' + bad.join('; '), 'warn', 7);
      return;
    }
    UI.win();
  }

  /* ================= покадровое (viewmodel, отдача) ================= */
  function update(dt) {
    recoil = Math.max(0, recoil - dt * 6);
    let press = 0;
    if (G.pistolCarried && !G.brokenOpen && !G.over) press = aimPoint() ? 1 : 0;
    if (G.pistolCarried)
      pistol.position.lerp(
        new THREE.Vector3(.26 - press * .15, -.28 - press * .1, -.55 - press * .12), .2);
    camera.rotation.x += recoil * .09;      // подброс камеры от отдачи
  }

  return {
    layoutPistol, toggleCase, togglePistol, pistolKeys, extractE,
    takeDowel, openCartPanel, chooseCart, dropHand, putToCase,
    tryShoot, aimPoint, updHand, addShellVis, caseNear,
    exchange, handIn, accidentalShot, update
  };
})();