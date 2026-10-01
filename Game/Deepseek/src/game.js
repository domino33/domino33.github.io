/* ============================================================================
 *  game.js — игровой автомат тренажёра: весь геймплей по сценарию
 *  «Пиротехнический пистолет» (получение СИЗ, проверка пистолета, перенос,
 *  ограждение опасной зоны, вывод людей, подъём на высоту, заряжание,
 *  выбор патрона, выстрел, перезарядка, осечка, дождь, уборка, сдача).
 * ========================================================================== */
const CARTRIDGE_NAMES = { yellow: 'Жёлтый', green: 'Зелёный', red: 'Красный', black: 'Чёрный' };

class Game {
  constructor(opts) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.player = opts.player;
    this.world = opts.world;
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.state = {};
    this.resetState();
    this._bind();
  }

  resetState() {
    this.state = {
      ppe: { helmet: false, goggles: false, suit: false, kraga: false },
      gun: {
        inHands: false, inspected: false, broken: false, open: false,
        hasCartridge: false, cartridge: null, hasDowel: false, hasShell: false,
        misfired: false, misfireT: 0, misfireHappened: false, misfireCartridge: null,
        taken: false, loadedByPlayer: false, placedInCase: false
      },
      ammo: { yellow: 4, green: 6, red: 2, black: 2, dowels: 6 },
      inv: { shells: 0, shellsInBox: 0, shellsInBin: 0, boxTaken: false,
        cartridgesTaken: false, dowelsTaken: false,
        misfireCartridgeInHand: false, misfireCartridgeTarget: null, waterCollected: false },
      site: { arrived: false, fence: false, peopleCleared: 0, onScaffold: false, onLadder: false, warnedPeople: false },
      caseOpen: false,
      floorSeq: 0,
      waterCartridge: false,
      caseWaterWarned: false,
      misfireReadyLogged: false,
      misfirePos: null,
      floorShells: [],
      floorCartridge: null,
      pointsDone: 0,
      shotsFired: 0,
      stage4: false,
      ended: false,
      fatal: null,
      violations: [],
      elapsed: 0,
      caseWaterWarned: false
    };
    // в пистолете с завода уже стоит патрон (его нужно извлечь при проверке)
    this.state.gun.hasCartridge = true;
    this.state.gun.cartridge = 'yellow';
  }

  /* ---------------------- Инициализация сцены/подписок ---------------------- */
  start() {
    const w = this.world;
    this.player.reset(w.spawn.x, w.spawn.y, w.spawn.z, w.spawnYaw);
    this.syncGunVisual();
    this.setCaseOpen(false, true);
    UI.clearLog();
    UI.showLoad(false);
    UI.log('Этап 1. Склад: получите СИЗ и проверьте пистолет.', 'ok');
  }

  /** Перезапуск: тренажёр заново на новой сцене. */
  rebind(world) {
    this.world = world;
    this.resetState();
    this.start();
	 window.location.reload();
  }

  _bind() {
    const self = this;
    window.addEventListener('mousedown', function (e) {
      if (!self.player.locked) return;
      if (e.button === 0) self.onAction();
      if (e.button === 2) self.reload();
    });
    window.addEventListener('contextmenu', function (e) { if (self.player.locked) e.preventDefault(); });
    window.addEventListener('keydown', function (e) {
      if (self.state.ended) return;
      switch (e.code) {
        case 'KeyE': self.onAction(); break;
        case 'KeyR': self.reload(); break;
        case 'KeyQ': self.toggleLoadPanel(); break;
        case 'KeyF': self.dropToFloor(); break;
        case 'KeyH': {
          const opened = document.getElementById('help-panel').classList.contains('hidden');
          UI.showHelp(opened);
          if (opened) { if (document.pointerLockElement) document.exitPointerLock(); }
          else self.player.lock();
          break;
        }
        case 'Digit1': self.loadCartridge('yellow'); break;
        case 'Digit2': self.loadCartridge('green'); break;
        case 'Digit3': self.loadCartridge('red'); break;
        case 'Digit4': self.loadCartridge('black'); break;
        case 'Escape': /* pointer lock снимет браузер */ break;
      }
    });
    UI.bindButtons(function (action) { self.onPanelAction(action); });
  }

  /* ------------------------------ Логи/нарушения ---------------------------- */
  log(text, kind) { UI.log(text, kind); }

  violation(key, text) {
    if (this.state.violations.some(function (v) { return v.key === key; })) return;
    this.state.violations.push({ key: key, text: text });
  }

  fiasko(title, reason) {
    if (this.state.ended) return;
    this.state.ended = true;
    this.state.fatal = { title: title, reason: reason };
    this.log('ФИАСКО: ' + reason, 'danger');
    this.end(true, title, reason);
  }

  finish() {
    this.state.ended = true;
    this.end(false, 'ТРЕНАЖЁР ПРОЙДЕН', 'Работы выполнены, инструмент и расходные материалы сданы на склад.');
  }

  end(fatal, title, reason) {
    this.player.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock();
    const list = this.state.violations.map(function (v) {
      return { text: v.text, kind: 'fatal' };
    });
    if (!fatal && list.length === 0) list.push({ text: 'Нарушений не зафиксировано — отличная работа!', kind: 'ok' });
    const m = Math.floor(this.state.elapsed / 60), s = Math.floor(this.state.elapsed % 60);
    const stats = 'Время: ' + m + ' мин ' + s + ' с · выстрелов: ' + this.state.shotsFired +
      ' · точек закреплено: ' + this.state.pointsDone + '/4 · патронов израсходовано: ' + this.cartridgesUsed();
    UI.showEnd({ title: title, reason: reason, stats: stats, list: list, fatal: fatal });
  }

  cartridgesUsed() {
    const a = this.state.ammo;
    return (4 + 6 + 2 + 2) - (a.yellow + a.green + a.red + a.black);
  }

  /* ------------------------------ Проверки --------------------------------- */
  ppeComplete() {
    const p = this.state.ppe;
    return p.helmet && p.goggles && p.suit && p.kraga;
  }

  ppeText() {
    const p = this.state.ppe;
    const parts = [];
    if (p.helmet) parts.push('каска');
    if (p.goggles) parts.push('очки');
    if (p.suit) parts.push('спецодежда');
    if (p.kraga) parts.push('краги');
    return parts.length ? parts.join(', ') : 'нет';
  }

  /* --------------------------- Визуализация пистолета ---------------------- */
  cartridgeColor(c) {
    return { yellow: 0xd8c33a, green: 0x54b25b, red: 0xc1443c, black: 0x4a4a4a }[c] || 0xd8c33a;
  }

  syncGunVisual() {
    const w = this.world, g = this.state.gun, p = w.gunParts;
    p.cart.visible = g.hasCartridge && !g.misfired;
    if (g.cartridge) p.cart.material.color.set(this.cartridgeColor(g.cartridge));
    p.shell.visible = g.hasShell;
    p.dowel.visible = g.hasDowel;
    p.barrelGroup.rotation.x = g.broken ? -1.35 : (g.open ? -0.55 : 0);
    const cb = w.getInteractable('cart_in_barrel');
    if (cb) cb.enabled = this.state.caseOpen && g.hasCartridge && !g.inHands;
  }

  attachGunToCamera() {
    const w = this.world;
    this.camera.add(w.gun);
    w.gun.position.set(0.30, -0.30, -0.62);
    w.gun.rotation.set(0, 0.10, 0.04);
    ['gun_inspect', 'gun_take', 'cart_in_barrel'].forEach(function (id) {
      const it = w.getInteractable(id);
      if (it) it.enabled = false;
    });
  }

  putGunToCase() {
    const w = this.world;
    w.caseGroup.add(w.gun);
    w.gun.position.set(0.05, -0.005, 0);
    w.gun.rotation.set(0, -Math.PI / 2, 0);
    this.setCaseOpen(this.state.caseOpen, true);
  }

  setCaseOpen(open, silent) {
    const w = this.world, st = this.state;
    st.caseOpen = open;
    w.caseLid.rotation.x = open ? -1.95 : 0;
    const lid = w.getInteractable('case_lid');
    if (lid) lid.prompt = open ? 'Закрыть кейс' : 'Открыть кейс';
    ['gun_inspect', 'gun_take', 'ammo_cartridges', 'ammo_dowels', 'case_body'].forEach(function (id) {
      const it = w.getInteractable(id);
      if (it) it.enabled = open && !it.hidden;
    });
    this.syncGunVisual();
    if (!silent) this.log(open ? 'Кейс открыт.' : 'Кейс закрыт.');
  }

  /* ------------------------ Поиск интерактивного объекта ------------------- */
  pickInteractable() {
    const list = [];
    this.world.interactables.forEach(function (it) {
      if (it.enabled) it.meshes.forEach(function (m) { list.push(m); });
    });
    if (!list.length) return null;
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(list, true);
    for (let i = 0; i < hits.length; i++) {
      let o = hits[i].object;
      while (o && !o.userData.interactId) o = o.parent;
      if (!o) continue;
      const it = this.world.getInteractable(o.userData.interactId);
      if (!it || !it.enabled) continue;
      if (hits[i].distance > it.range) return null;
      return { it: it, distance: hits[i].distance, point: hits[i].point };
    }
    return null;
  }

  /** Пересечение прицела со стеной (плоскость z = -8.85). */
  wallHit() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    if (dir.z > -0.15) return null;
    const origin = this.camera.position;
    const t = (-8.85 - origin.z) / dir.z;
    if (t <= 0 || t > 6) return null;
    const hx = origin.x + dir.x * t;
    const hy = origin.y + dir.y * t;
    if (hx < -1.2 || hx > 5.2 || hy < 0 || hy > 3.2) return null;
    return { x: hx, y: hy, dist: t, dir: dir };
  }

  /** Точка крепления под прицелом: {point, d, offset}. */
  targetPoint() {
    const h = this.wallHit();
    if (!h) return null;
    let best = null, bestD = 1e9;
    this.world.points.forEach(function (p) {
      const d = Math.hypot(h.x - p.x, h.y - p.y);
      if (d < bestD) { bestD = d; best = p; }
    });
    if (!best) return null;
    return { point: best, d: bestD, wall: h, offset: Math.abs(this.player.pos.x - best.x) };
  }

  /* ------------------------------ Действие (ЛКМ/E) ------------------------- */
  onAction() {
    if (this.state.ended) return;
    if (!document.getElementById('load-panel').classList.contains('hidden')) return;
    if (!document.getElementById('help-panel').classList.contains('hidden')) return;
    const hit = this.pickInteractable();
    if (hit) { this.interact(hit.it); return; }
    if (this.state.gun.inHands) { this.fire(); return; }
    if (this.state.inv.shells > 0) { this.dropShellsOnFloor(); return; }
    this.log('Наведите прицел на объект и нажмите ЛКМ (или E).');
  }

  /* ------------------------------ Обработка действий ----------------------- */
  interact(it) {
    const st = this.state, w = this.world, g = st.gun;
    // «При перерывах в работе ручной пиротехнический инструмент следует разрядить»
    if (g.inHands && g.hasCartridge) {
      this.violation('loaded_' + it.handler,
        'Действия выполнялись с заряженным пистолетом в руках. Требование: «При перерывах в работе ручной пиротехнический инструмент следует разрядить».');
      this.log('При перерывах в работе ручной пиротехнический инструмент следует разрядить (R — переломить и извлечь патрон).', 'warn');
    }
    switch (it.handler) {
      case 'sign':
        this.log('Место работ — стена из силикатного кирпича, разметка под кронштейны уже нанесена.');
        return;

      /* ---------------- Этап 1: СИЗ, проверка пистолета ---------------- */
      case 'ppe': {
        const d = it.data;
        if (!d.ok) {
          this.log('Неверный выбор: ' + it.label + '. ' +
            (d.item === 'helmet_bad' ? 'Каска без наушников не защищает органы слуха.'
              : 'Полнолицевая маска с патроном не заменяет очки и наушники.'), 'warn');
          return;
        }
        if (st.ppe[d.item]) { this.log('Эти СИЗ уже получены.'); return; }
        st.ppe[d.item] = true;
        w.setVisible(it.id, false);
        this.log('Получено: ' + it.label + '.', 'ok');
        if (this.ppeComplete()) this.log('СИЗ укомплектованы: каска с наушниками, очки, спецодежда, краги.', 'ok');
        return;
      }
      case 'case':
        this.setCaseOpen(!st.caseOpen);
        return;
      case 'gun_inspect': {
        if (g.inHands) { this.log('Пистолет у вас в руках.'); return; }
        if (g.broken) { this.log('Пистолет развалился — сдайте его на столе обменного фонда.', 'warn'); return; }
        if (!st.caseOpen) { this.log('Сначала откройте кейс.', 'warn'); return; }
        if (g.inspected) { this.log('Пистолет уже осмотрен и проверен.'); return; }
        g.inspected = true;
        g.open = true;
        if (g.hasCartridge) {
          this.log('Полуповорот, переламывание: в стволе патрон! Извлеките его (ЛКМ по патрону в стволе).', 'warn');
          w.setVisible('cart_in_barrel', true);
        } else {
          this.log('Полуповорот, переламывание: пистолет не заряжен.', 'ok');
        }
        this.syncGunVisual();
        return;
      }
      case 'gun_take': {
        if (g.broken) { this.log('Пистолет неисправен. Сдайте его на столе обменного фонда и получите исправный.', 'warn'); return; }
        if (g.inHands) { this.log('Пистолет уже в руках.'); return; }
        if (!st.caseOpen) { this.log('Сначала откройте кейс.', 'warn'); return; }
        if (!g.inspected) {
          g.broken = true; g.taken = true;
          this.violation('gun_broken', 'Пистолет взят из кейса без осмотра и развалился на две части.');
          this.log('Взяли пистолет, не осмотрев его: инструмент развалился на две части. Работать нельзя — сдайте его и получите исправный.', 'danger');
          this.syncGunVisual();
          return;
        }
        if (g.hasCartridge && st.site.arrived) {
          this.fiasko('Самопроизвольный выстрел',
            'Заряженный инструмент достали из кейса на месте работ — произошёл случайный выстрел.');
          return;
        }
        g.taken = true; g.inHands = true; g.open = false;
        this.attachGunToCamera();
        this.log(g.hasCartridge ? 'Пистолет в руках (в стволе патрон!).' : 'Пистолет в руках.', g.hasCartridge ? 'warn' : 'ok');
        this.syncGunVisual();
        return;
      }
      case 'remove_cartridge': {
        if (!g.hasCartridge) { this.log('В стволе нет патрона.'); return; }
        const color = g.cartridge;
        g.hasCartridge = false; g.cartridge = null;
        st.ammo[color] = (st.ammo[color] || 0) + 1;
        w.setVisible('cart_in_barrel', false);
        this.log('Патрон извлечён из ствола (' + CARTRIDGE_NAMES[color] + ') и убран к остальным патронам.', 'ok');
        this.syncGunVisual();
        return;
      }
      case 'take_cartridges': {
        if (!st.caseOpen) { this.log('Сначала откройте кейс.', 'warn'); return; }
        if (st.inv.cartridgesTaken) { this.log('Патроны уже получены.'); return; }
        st.inv.cartridgesTaken = true;
        w.setVisible('ammo_cartridges', false);
        this.log('Получены патроны: жёлтый ' + st.ammo.yellow + ', зелёный ' + st.ammo.green +
          ', красный ' + st.ammo.red + ', чёрный ' + st.ammo.black + '.', 'ok');
        return;
      }
      case 'take_dowels': {
        if (!st.caseOpen) { this.log('Сначала откройте кейс.', 'warn'); return; }
        if (st.inv.dowelsTaken) { this.log('Дюбели уже получены.'); return; }
        st.inv.dowelsTaken = true;
        w.setVisible('ammo_dowels', false);
        this.log('Получены дюбели: ' + st.ammo.dowels + ' шт.', 'ok');
        return;
      }
    }
    this.interactPart2(it);
  }

  /* ------------- Действия: инструмент, место работ, люди, высота ----------- */
  interactPart2(it) {
    const st = this.state, w = this.world, g = st.gun;
    switch (it.handler) {
      case 'replace_gun': {
        if (!g.broken) { this.log('Обмен не требуется: инструмент исправен.'); return; }
        g.broken = false; g.inspected = true; g.taken = true; g.inHands = true;
        g.open = false; g.hasCartridge = false; g.cartridge = null; g.hasShell = false;
        this.attachGunToCamera();
        this.log('Неисправный пистолет сдан, получен исправный (осмотрен, не заряжен).', 'ok');
        this.syncGunVisual();
        return;
      }
      case 'case_body': {
        if (!st.caseOpen) { this.log('Откройте кейс (ЛКМ по кейсу).', 'warn'); return; }
        if (st.inv.misfireCartridgeInHand) {
          st.inv.misfireCartridgeInHand = false;
          st.inv.misfireCartridgeTarget = 'case';
          this.violation('misfire_cart_case', 'Патрон после осечки положен в кейс (по инструкции — в контейнер с водой).');
          this.log('Патрон после осечки положен в кейс. По инструкции его следует поместить в контейнер с водой.', 'warn');
          return;
        }
        if (!g.inHands) {
          if (st.inv.shells > 0) {
            st.inv.shellsInBox += st.inv.shells;
            this.log('Гильзы (' + st.inv.shells + ' шт.) уложены в кейс от пистолета.', 'ok');
            st.inv.shells = 0;
            return;
          }
          this.log('Кейс от пистолета: в нём патроны, дюбели и ложемент под инструмент.');
          return;
        }
        if (g.misfired) {
          this.log('После осечки разряжать инструмент допускается не ранее чем через 1 минуту. Не отрывайте пистолет от стены!', 'warn');
          return;
        }
        if (g.hasCartridge) {
          if (st.stage4) {
            this.fiasko('Выстрел в кейсе',
              'Инструмент убран в кейс заряженным — при укладке произошёл выстрел. Инструмент должен быть разряжен!');
            return;
          }
          this.violation('loaded_put_case', 'Заряженный инструмент положен в кейс (требуется разрядить).');
        }
        if (g.hasShell) {
          this.log('В стволе осталась гильза — извлеките её (R), прежде чем убирать инструмент в кейс.', 'warn');
          return;
        }
        g.inHands = false; g.placedInCase = true;
        this.putGunToCase();
        this.log('Пистолет убран в кейс.', 'ok');
        return;
      }
      case 'fence_deploy': {
        if (st.site.fence) { this.log('Ограждение уже выставлено.'); return; }
        st.site.fence = true;
        w.fenceGroup.visible = true;
        w.dangerRing.visible = true;
        w.setVisible('fence_stack', false);
        const fd = w.getInteractable('fence_deployed');
        if (fd) fd.enabled = true;
        this.log('Опасная зона 15 м ограждена защитными ограждениями.', 'ok');
        return;
      }
      case 'fence_remove': {
        if (!st.site.fence) { this.log('Ограждение не выставлено.'); return; }
        st.site.fence = false;
        w.fenceGroup.visible = false;
        w.dangerRing.visible = false;
        const fd = w.getInteractable('fence_deployed');
        if (fd) fd.enabled = false;
        w.setVisible('fence_stack', true);
        this.log('Ограждение опасной зоны убрано.', 'ok');
        return;
      }
      case 'remove_person': {
        if (w.removeWorker(it.id)) {
          st.site.peopleCleared++;
          this.log('Работник выведен из опасной зоны (' + st.site.peopleCleared + '/2).', 'ok');
        }
        return;
      }
      case 'person_idle':
        this.log('Это работник. Направлять ручной пиротехнический инструмент на людей запрещено.', 'warn');
        return;
      case 'climb_scaffold': {
        if (g.misfired) { this.log('После осечки не отрывайте пистолет от стены!', 'danger'); return; }
        if (this.player.pos.y > 0.4) {
          this.player.climbTo(1.45, 0, -6.5);
          st.site.onScaffold = false;
          this.log('Вы спустились с подмостей.');
        } else {
          const x = Math.max(-0.2, Math.min(3.1, this.player.pos.x));
          this.player.climbTo(x, 0.9, -7.8);
          st.site.onScaffold = true;
          this.log('Подъём на подмости выполнен. Прижмите ствол к стене под прямым углом и произведите выстрел.', 'ok');
        }
        return;
      }
      case 'climb_ladder': {
        if (g.misfired) { this.log('После осечки не отрывайте пистолет от стены!', 'danger'); return; }
        if (this.player.pos.y > 0.4) {
          this.player.climbTo(-3.3, 0, -6.4);
          st.site.onLadder = false;
          this.log('Вы спустились со стремянки.');
        } else {
          this.player.climbTo(-3.3, 1.15, -7.6);
          st.site.onLadder = true;
          this.log('Вы на стремянке. ВНИМАНИЕ: работать с ручным пиротехническим инструментом с приставных лестниц и стремянок запрещается!', 'danger');
        }
        return;
      }
    }
    this.interactPart3(it);
  }

  /** Действия на месте работ: контейнер с водой, мусорка, сбор гильз. */
  interactPart3(it) {
    const st = this.state, w = this.world, g = st.gun;
    switch (it.handler) {
      case 'water_barrel': {
        if (st.inv.misfireCartridgeInHand) {
          st.inv.misfireCartridgeInHand = false;
          st.inv.misfireCartridgeTarget = 'water';
          st.waterCartridge = true;
          this.log('Патрон, давший осечку, помещён в контейнер с водой — как требует инструкция.', 'ok');
          return;
        }
        if (st.inv.waterCollected) { this.log('В контейнере патрона уже нет.'); return; }
        if (st.waterCartridge) {
          st.waterCartridge = false;
          st.inv.waterCollected = true;
          this.log('Патрон после осечки забран из контейнера с водой.', 'ok');
          return;
        }
        this.log('Контейнер с водой — для патронов, давших осечку.');
        return;
      }
      case 'trash_bin': {
        if (st.inv.misfireCartridgeInHand) {
          this.fiasko('Воспламенение',
            'Патрон, давший осечку, выброшен в мусорку вместе с отходами — произошло воспламенение.');
          return;
        }
        if (st.inv.shells > 0) {
          const n = st.inv.shells;
          st.inv.shellsInBin += n;
          st.inv.shells = 0;
          this.log('Гильзы (' + n + ' шт.) выброшены в мусорку. Правильнее складывать их в одно место — в ящик или кейс.', 'warn');
          this.violation('shells_trash', 'Стреляные гильзы выброшены в мусорку вместо сбора в одно место.');
          return;
        }
        if (st.inv.shellsInBin > 0) {
          const n = st.inv.shellsInBin;
          st.inv.shells += n;
          st.inv.shellsInBin = 0;
          this.log('Гильзы (' + n + ' шт.) забраны из мусорки.', 'ok');
          return;
        }
        this.log('Мусорка пуста.');
        return;
      }
      case 'shell_box': {
        if (st.inv.misfireCartridgeInHand) {
          this.log('Патрон после осечки нельзя бросать к гильзам — его место в контейнере с водой.', 'warn');
          return;
        }
        if (st.inv.shells > 0) {
          const n = st.inv.shells;
          st.inv.shellsInBox += n;
          st.inv.shells = 0;
          this.log('Гильзы (' + n + ' шт.) уложены в ящик для гильз.', 'ok');
          const t = w.getInteractable('shell_box_take');
          if (t) { t.enabled = true; t.hidden = false; }
          return;
        }
        this.log(st.inv.shellsInBox > 0
          ? 'В ящике гильз: ' + st.inv.shellsInBox + '. Забрать ящик — ЛКМ по крышке.'
          : 'Ящик для гильз пуст — сначала извлеките гильзу (R).');
        return;
      }
      case 'shell_box_take': {
        if (st.inv.shellsInBox <= 0) { this.log('В ящике нет гильз.'); return; }
        const n = st.inv.shellsInBox;
        st.inv.shells += n;
        st.inv.shellsInBox = 0;
        st.inv.boxTaken = true;
        w.setVisible('shell_box_take', false);
        this.log('Ящик с гильзами (' + n + ' шт.) забран — будет сдан на склад.', 'ok');
        return;
      }
      case 'pick_shell': {
        const s = st.floorShells.filter(function (x) { return x.id === it.id; })[0];
        if (!s) return;
        st.inv.shells++;
        s.mesh.visible = false;
        w.removeInteractable(it.id);
        st.floorShells = st.floorShells.filter(function (x) { return x.id !== it.id; });
        this.log('Гильза поднята с пола.', 'ok');
        return;
      }
      case 'pick_cartridge': {
        if (!st.floorCartridge) return;
        this.fiasko('Воспламенение при сборе гильз',
          'Патрон после осечки, оставленный на полу, воспламенился при сборе стреляных гильз.');
        return;
      }
    }
    this.interactHandover(it);
  }

  /* ------------------------- Сдача инструмента на склад -------------------- */
  interactHandover(it) {
    const st = this.state, w = this.world, g = st.gun;
    if (st.pointsDone < 4) {
      this.log('Работы не завершены: закреплено точек ' + st.pointsDone + '/4. Сдавать инструмент рано.', 'warn');
      return;
    }
    if (g.inHands) { this.log('Уберите пистолет в кейс и убедитесь, что он разряжен.', 'warn'); return; }
    if (g.hasCartridge || g.hasShell || g.misfired) {
      this.log('Инструмент не разряжен: извлеките патрон и гильзу (возьмите пистолет, R — переломить).', 'warn');
      return;
    }
    if (st.floorCartridge) {
      this.violation('left_cartridge', 'Патрон после осечки оставлен на объекте (на полу).');
      this.log('На полу остался патрон после осечки — его нужно поместить в контейнер с водой.', 'warn');
      return;
    }
    const remaining = st.inv.shellsInBox + st.inv.shellsInBin + st.floorShells.length;
    if (remaining > 0) {
      this.violation('shells_not_collected', 'Гильзы не собраны при сдаче инструмента на склад.');
      this.log('Не собраны стреляные гильзы (' + remaining + ' шт.). Оператор обязан оформить сдачу гильз на склад.', 'danger');
      return;
    }
    if (st.waterCartridge) {
      this.violation('water_not_collected', 'Патрон после осечки не забран из контейнера с водой перед сдачей.');
      this.log('В контейнере с водой остался патрон после осечки — заберите его (ЛКМ по контейнеру).', 'warn');
      return;
    }
    if (w.fenceGroup.visible) {
      this.violation('fence_left', 'Ограждение опасной зоны не убрано по окончании работ.');
      this.log('Ограждение опасной зоны не убрано — по инструкции его снимают по окончании работ.', 'warn');
    }
    if (st.caseOpen) {
      this.violation('case_water', 'Кейс с патронами оставлен открытым — в него попала дождевая вода.');
      this.log('Кейс с патронами не был закрыт — вода попала в патроны.', 'warn');
    }
    this.finish();
  }

  /* --------------------------- Гильзы и патрон на полу --------------------- */
  raycastGround() {
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(this.world.groundMeshes, false);
    return hits.length ? hits[0].point : null;
  }

  dropShellsOnFloor() {
    const st = this.state, w = this.world;
    const n = st.inv.shells;
    if (n <= 0) return;
    const p = this.raycastGround() || new THREE.Vector3(this.player.pos.x, 0, this.player.pos.z - 0.8);
    st.inv.shells = 0;
    for (let i = 0; i < n; i++) {
      const id = 'floor_shell_' + (++st.floorSeq);
      const grp = new THREE.Group();
      grp.position.set(p.x + (Math.random() - 0.5) * 0.7, 0.03, p.z + (Math.random() - 0.5) * 0.7);
      grp.rotation.set(Math.PI / 2, 0, Math.random() * 3.1);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 12),
        World.mat(0xb08d3a, { metalness: 0.5, roughness: 0.5 }));
      mesh.castShadow = true;
      grp.add(mesh);
      w.group.add(grp);
      const it = w.addInteractable({ id: id, label: 'Гильза на полу', handler: 'pick_shell',
        prompt: 'Поднять гильзу', meshes: [grp], range: 3.0 });
      st.floorShells.push({ id: id, mesh: grp, interact: it });
    }
    this.log('Гильзы (' + n + ' шт.) выброшены на пол — их придётся собирать на этапе сбора гильз.', 'warn');
    this.violation('shells_floor', 'Стреляные гильзы выброшены на пол вместо сбора в одно место.');
  }

  /** Клавиша F: выбросить патрон после осечки или гильзы на пол. */
  dropToFloor() {
    const st = this.state;
    if (st.inv.misfireCartridgeInHand) {
      st.inv.misfireCartridgeInHand = false;
      st.inv.misfireCartridgeTarget = 'floor';
      const grp = new THREE.Group();
      grp.position.set(this.player.pos.x, 0.03, this.player.pos.z - 0.7);
      grp.rotation.set(Math.PI / 2, 0, 0.4);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.055, 12),
        World.mat(0x8a8f96, { metalness: 0.4, roughness: 0.6 }));
      mesh.castShadow = true;
      grp.add(mesh);
      this.world.group.add(grp);
      const it = this.world.addInteractable({ id: 'floor_misfire_card', label: 'Патрон после осечки',
        handler: 'pick_cartridge', prompt: 'Поднять патрон после осечки', meshes: [grp], range: 3.0 });
      st.floorCartridge = { mesh: grp, interact: it };
      this.violation('misfire_cart_floor', 'Патрон после осечки оставлен на полу (при сборе гильз возможно воспламенение).');
      this.log('Патрон после осечки оставлен на полу. При сборе гильз это может привести к воспламенению!', 'danger');
      return;
    }
    if (st.inv.shells > 0) { this.dropShellsOnFloor(); return; }
    this.log('В руках нет гильзы или патрона. Гильзу можно извлечь клавишей R.');
  }

  /* ------------------------------- Выстрел --------------------------------- */
  fire() {
    const st = this.state, w = this.world, g = st.gun;
    if (st.ended) return;
    if (!g.inHands) { this.log('Возьмите пистолет в руки.'); return; }
    if (g.misfired) { this.log('Осечка! Не отрывайте пистолет от стены и не переламывайте его минимум 1 минуту.', 'danger'); return; }
    if (st.site.onLadder) {
      this.fiasko('Падение со стремянки',
        'Работать с ручным пиротехническим инструментом с приставных лестниц или стремянок запрещается — работник упал со стремянки.');
      return;
    }
    if (!this.ppeComplete()) {
      this.fiasko('Травма при работе без СИЗ',
        'Выстрел произведён без полного комплекта СИЗ — работник получил травму.');
      return;
    }
    if (!g.inspected) {
      this.fiasko('Самопроизвольный выстрел',
        'Пистолет не был проверен: патрон остался в стволе — произошёл случайный выстрел.');
      return;
    }
    if (!st.site.fence) {
      w.spawnEnteringWorker();
      this.fiasko('Опасная зона не ограждена',
        'Ограждение не выставлено: в момент выстрела в опасную зону вошёл работник — рикошет дюбеля в его сторону.');
      return;
    }
    if (st.site.peopleCleared < 2) {
      this.fiasko('Травма работников',
        'Люди не выведены из опасной зоны за стеной — осколки кирпича травмировали работников.');
      return;
    }
    const tp = this.targetPoint();
    if (!tp || tp.d > 0.4) {
      this.log('Выстрел невозможен, пока дульная часть не будет с силой прижата к рабочей поверхности: наведите прицел на размеченную точку.', 'warn');
      return;
    }
    if (this.player.supportTop < 0.5) {
      this.log('Для работы на высоте поднимитесь на подмости (ЛКМ по подмостям).', 'warn');
      return;
    }
    if (tp.wall.dir.z > -0.6) {
      this.fiasko('Рикошет',
        'Перекос при прижатии: ствол прижат не под прямым углом — рикошет дюбеля и вылет осколков.');
      return;
    }
    if (tp.offset > 1.0) {
      this.fiasko('Рикошет',
        'Выстрел произведён стоя сбоку от точки крепления — дюбель срикошетил от стены.');
      return;
    }
    if (tp.offset > 0.55) {
      this.log('Вы стоите со смещением ' + tp.offset.toFixed(2) + ' м от метки. Встаньте точно напротив — иначе рикошет.', 'warn');
      return;
    }
    if (!g.hasCartridge) {
      this.log('Патрон не заряжен — выстрела не будет. Заряжание: Q (сначала дюбель, затем патрон).', 'warn');
      return;
    }
    if (!st.inv.cartridgesTaken) {
      this.log('Патроны и дюбели не получены на складе — заряжать нечем.', 'warn');
      return;
    }
    if (st.pointsDone >= 2 && !g.misfireHappened) { this.startMisfire(tp.point); return; }
    this.resolveShot(tp);
  }

  resolveShot(tp) {
    const st = this.state, g = st.gun, p = tp.point;
    const color = g.cartridge;
    const hadDowel = g.hasDowel;
    g.hasCartridge = false; g.cartridge = null; g.hasDowel = false; g.hasShell = true;
    st.shotsFired++;
    this.syncGunVisual();
    if (!hadDowel) {
      this.log('Выстрел без дюбеля — результата нет. Гильза в стволе: извлеките её (R).', 'warn');
      return;
    }
    if (p.state === 'half') {
      if (color !== 'yellow') {
        this.fiasko('Разрушение материала',
          'Повторный выстрел произведён патроном «' + CARTRIDGE_NAMES[color] + '» — материал разрушен. Повторный выстрел производится только жёлтым патроном и без дюбеля.');
        return;
      }
      p.halfDowel.visible = false;
      p.dowel.visible = true;
      p.state = 'done';
      this.completePoint(p);
      return;
    }
    if (color === 'green') {
      p.dowel.visible = true;
      p.state = 'done';
      this.completePoint(p);
      return;
    }
    if (color === 'yellow') {
      p.halfDowel.visible = true;
      p.state = 'half';
      p.ring.material.color.set(0xd8a03a);
      this.log('Жёлтый патрон слабый: дюбель торчит до половины. Добейте его повторным выстрелом жёлтым патроном без дюбеля.', 'warn');
      return;
    }
    if (color === 'red') {
      this.fiasko('Разрушение материала', 'Красный патрон избыточен для силикатного кирпича — материал раскололся.');
      return;
    }
    this.fiasko('Разрушение материала', 'Чёрный патрон — материал разрушен полностью.');
  }

  completePoint(p) {
    const st = this.state;
    if (p.counted) return;
    p.counted = true;
    st.pointsDone++;
    p.ring.material.color.set(0x2fbf4f);
    this.log('Дюбель забит: точка ' + p.id + ' закреплена (' + st.pointsDone + '/4). Гильза в стволе — извлеките её (R).', 'ok');
    if (st.pointsDone === 4) this.startStage4();
  }

  startMisfire(point) {
    const g = this.state.gun;
    g.misfireHappened = true;
    g.misfired = true;
    g.misfireT = 0;
    g.misfireCartridge = g.cartridge;
    g.cartridge = null;
    g.hasCartridge = false;
    this.state.misfirePos = { x: this.player.pos.x, z: this.player.pos.z };
    this.log('ОСЕЧКА! Пистолет не выстрелил. Не отрывайте его от стены и не разряжайте раньше чем через 1 минуту.', 'danger');
    this.syncGunVisual();
  }

  /* ------------------------------- Перезарядка ----------------------------- */
  reload() {
    const st = this.state, g = st.gun;
    if (st.ended || !g.inHands) return;
    if (g.misfired) {
      if (g.misfireT < 60) {
        this.fiasko('Выстрел при разряжании',
          'Инструмент разряжен раньше истечения 1 минуты после осечки — произошёл выстрел, гильза вылетела в работника.');
        return;
      }
      g.misfired = false;
      g.open = true;
      g.misfireCartridge = null;
      g.hasDowel = false;
      st.inv.misfireCartridgeInHand = true;
      this.log('Инструмент разряжен. Патрон после осечки в руке — опустите его в контейнер с водой (ЛКМ по контейнеру).', 'ok');
      this.syncGunVisual();
      return;
    }
    if (g.hasShell) {
      g.hasShell = false;
      g.open = true;
      st.inv.shells++;
      this.log('Пистолет переломлен, гильза извлечена и осталась в руке. Уберите её в ящик для гильз или в кейс.', 'ok');
      this.syncGunVisual();
      return;
    }
    if (g.hasCartridge) {
      const color = g.cartridge;
      g.hasCartridge = false; g.cartridge = null; g.open = true;
      st.ammo[color] = (st.ammo[color] || 0) + 1;
      this.log('Извлечён неиспользованный патрон (' + CARTRIDGE_NAMES[color] + ') и возвращён к остальным.', 'ok');
      this.syncGunVisual();
      return;
    }
    g.open = !g.open;
    this.log(g.open ? 'Пистолет переломлен.' : 'Пистолет закрыт.');
    this.syncGunVisual();
  }

  /* ---------------------------- Заряжание (Q) ------------------------------ */
  toggleLoadPanel() {
    if (this.state.ended) return;
    if (!this.state.gun.inHands) { this.log('Возьмите пистолет в руки.', 'warn'); return; }
    const hidden = document.getElementById('load-panel').classList.contains('hidden');
    this.showLoadPanel(hidden);
  }

  showLoadPanel(visible, keepLock) {
    const st = this.state, g = st.gun;
    UI.showLoad(visible, g.hasCartridge
      ? 'Пистолет заряжен патроном «' + CARTRIDGE_NAMES[g.cartridge] + '». Прижмите ствол к точке и стреляйте (ЛКМ).'
      : 'Патроны: Ж ' + st.ammo.yellow + ' · З ' + st.ammo.green + ' · К ' + st.ammo.red + ' · Ч ' + st.ammo.black +
        ' · Дюбели: ' + st.ammo.dowels, g.hasDowel);
    if (visible && !keepLock) {
      if (document.pointerLockElement) document.exitPointerLock();
    } else if (!visible && !st.ended) {
      this.player.lock();
    }
  }

  loadDowel() {
    const st = this.state, g = st.gun;
    if (!g.inHands) { this.log('Пистолет не в руках.', 'warn'); return; }
    if (g.misfired) { this.log('Сначала разрядите инструмент после осечки (не ранее 1 минуты).', 'warn'); return; }
    if (g.hasDowel) { this.log('Дюбель уже установлен в ствол.'); return; }
    if (g.hasCartridge) { this.log('Сначала извлеките патрон: дюбель устанавливают до заряжания патрона.', 'warn'); return; }
    if (!st.inv.dowelsTaken) { this.log('Дюбели не получены: возьмите их в кейсе на складе.', 'warn'); return; }
    if (st.ammo.dowels <= 0) { this.log('Дюбели закончились.', 'warn'); return; }
    st.ammo.dowels--;
    g.hasDowel = true;
    this.showLoadPanel(true, true);
    this.log('Дюбель установлен в ствол.', 'ok');
    this.syncGunVisual();
  }

  loadCartridge(color) {
    const st = this.state, g = st.gun;
    if (st.ended) return;
    if (!g.inHands) { this.log('Пистолет не в руках.', 'warn'); return; }
    if (g.misfired) { this.log('Сначала разрядите инструмент после осечки (не ранее 1 минуты).', 'warn'); return; }
    if (g.hasCartridge) { this.log('Пистолет уже заряжен патроном «' + CARTRIDGE_NAMES[g.cartridge] + '».', 'warn'); return; }
    if (!st.site.arrived || !st.site.fence || st.site.peopleCleared < 2) {
      this.fiasko('Случайный выстрел',
        'Запрещается заряжать ручной пиротехнический инструмент до полной подготовки рабочего места (прибытие на место работ, ограждение опасной зоны, вывод людей).');
      return;
    }
    if (!g.hasDowel) {
      this.fiasko('Выстрел',
        'Патрон заряжен до установки дюбеля — произошёл выстрел. Порядок: сначала дюбель в ствол, затем патрон.');
      return;
    }
    if (!st.inv.cartridgesTaken) { this.log('Патроны не получены: возьмите патроны в кейсе на складе.', 'warn'); return; }
    if ((st.ammo[color] || 0) <= 0) { this.log('Патроны «' + CARTRIDGE_NAMES[color] + '» закончились.', 'warn'); return; }
    st.ammo[color]--;
    g.hasCartridge = true; g.cartridge = color; g.open = false; g.loadedByPlayer = true;
    this.log('Пистолет заряжен патроном «' + CARTRIDGE_NAMES[color] + '». Прижмите ствол к стене под прямым углом и выстрелите (ЛКМ).', 'ok');
    this.showLoadPanel(false);
    this.syncGunVisual();
  }

  onPanelAction(action) {
    switch (action) {
      case 'dowel': this.loadDowel(); break;
      case 'cart-yellow': this.loadCartridge('yellow'); break;
      case 'cart-green': this.loadCartridge('green'); break;
      case 'cart-red': this.loadCartridge('red'); break;
      case 'cart-black': this.loadCartridge('black'); break;
      case 'close': this.showLoadPanel(false); break;
      case 'close-help': UI.showHelp(false); break;
    }
  }

  /* ------------------------- Этап 4 и прибытие на место ------------------- */
  startStage4() {
    const st = this.state, w = this.world;
    st.stage4 = true;
    w.rain.visible = true;
    this.log('Этап 4. Окончание работ: все точки закреплены. Начался дождь — вода попадает в открытый кейс с патронами.', 'ok');
    if (st.caseOpen) this.log('Кейс с патронами открыт! Закройте его, иначе вода попадёт в патроны.', 'danger');
  }

  onArrive() {
    const st = this.state, g = st.gun;
    this.log('Вы прибыли на место работ. Нужно оградить опасную зону 15 м и вывести людей из-за стены.', 'ok');
    if (g.taken && !g.inspected) {
      this.fiasko('Самопроизвольный выстрел',
        'Инструмент не был осмотрен и проверен — при прибытии на место работ произошёл случайный выстрел.');
      return;
    }
    if (g.inHands && g.hasCartridge) {
      this.fiasko('Самопроизвольный выстрел',
        'Инструмент переносили заряженным — при прибытии на место работ произошёл случайный выстрел.');
      return;
    }
  }

  /** Направление ствола на работника во время переноски. */
  checkAimAtPeople() {
    const st = this.state, g = st.gun;
    const list = [];
    (this.world.workers || []).forEach(function (wk) { if (!wk.removed) list.push(wk.group); });
    const idle = this.world.getInteractable('worker_pass');
    if (idle && idle.enabled) list.push(idle.meshes[0]);
    if (!list.length) return;
    this.raycaster.setFromCamera(this.center, this.camera);
    const hits = this.raycaster.intersectObjects(list, true);
    if (!hits.length || hits[0].distance > 20) return;
    if (!g.inspected && g.hasCartridge) {
      this.fiasko('Самопроизвольный выстрел',
        'Пистолет не проверен, а ствол направлен на работника — произошёл случайный выстрел.');
      return;
    }
    if (!st.site.warnedPeople) {
      st.site.warnedPeople = true;
      this.log('Запрещается направлять ручной пиротехнический инструмент на себя или в сторону других лиц, даже если он не заряжен патроном.', 'warn');
      this.violation('aim_people', 'Инструмент направлялся в сторону людей при переноске.');
    }
  }

  /* ------------------------------- Обновление ------------------------------ */
  update(dt) {
    const st = this.state, w = this.world;
    if (st.ended) { w.updateNpc(dt); w.updateRain(dt); return; }
    st.elapsed += dt;
    w.updateNpc(dt);
    w.updateRain(dt);

    st.site.onScaffold = this.player.pos.y > 0.5 && this.player.pos.x > -0.6 && this.player.pos.x < 3.5 &&
      this.player.pos.z > -8.3 && this.player.pos.z < -6.8;
    st.site.onLadder = this.player.pos.y > 0.5 && Math.abs(this.player.pos.x + 3.3) < 0.9 &&
      this.player.pos.z > -8.5 && this.player.pos.z < -6.8;

    if (!st.site.arrived && this.player.pos.x > -11 && this.player.pos.z < 2) {
      st.site.arrived = true;
      this.onArrive();
      if (st.ended) return;
    }
    if (st.gun.inHands) this.checkAimAtPeople();
    if (st.ended) return;

    if (st.gun.misfired) {
      st.gun.misfireT += dt;
      if (st.misfirePos) {
        const d = Math.hypot(this.player.pos.x - st.misfirePos.x, this.player.pos.z - st.misfirePos.z);
        if (d > 1.0) {
          this.fiasko('Выстрел', 'Пистолет убран от стены во время осечки — произошёл выстрел.');
          return;
        }
      }
      UI.setTimer('ОСЕЧКА · разряжать не ранее чем через ' + Math.max(0, Math.ceil(60 - st.gun.misfireT)) + ' с', true);
      if (st.gun.misfireT >= 60 && !st.misfireReadyLogged) {
        st.misfireReadyLogged = true;
        this.log('Прошло более 1 минуты после осечки — можно разрядить инструмент (R) и опустить патрон в контейнер с водой.', 'ok');
      }
    } else {
      UI.setTimer('');
    }

    if (st.stage4 && st.caseOpen && !st.caseWaterWarned) {
      st.caseWaterWarned = true;
      this.violation('case_water_open', 'Кейс с патронами оставался открытым под дождём — вода попала в патроны.');
      this.log('Дождь! В открытый кейс с патронами попадает вода — закройте кейс (ЛКМ по кейсу).', 'danger');
    }
    this.refreshHud();
  }

  /* ------------------------------- Задание в HUD --------------------------- */
  stageTitle(num) {
    const s = SCENARIO.stages.filter(function (x) { return x.num === num; })[0];
    return s ? s.title : '';
  }

  mk(stage, id, hintOverride) {
    const t = scenarioTask(stage, id);
    return {
      stage: stage, stageTitle: this.stageTitle(stage), title: t.title,
      hint: hintOverride || t.hint, req: t.requirement
    };
  }

  objective() {
    const st = this.state, g = st.gun, w = this.world;
    if (g.misfired) {
      return this.mk(3, 'misfire',
        'Осечка! Не отрывайте пистолет от стены и не переламывайте его раньше 1 минуты. Затем разрядите (R) и опустите патрон в контейнер с водой.');
    }
    if (!this.ppeComplete()) return this.mk(1, 'ppe');
    if (!g.inspected || g.broken || (g.hasCartridge && !st.site.arrived && !g.loadedByPlayer)) return this.mk(1, 'gun_check');
    if (!st.inv.cartridgesTaken || !st.inv.dowelsTaken) return this.mk(1, 'ammo');
    if (!st.site.arrived) return this.mk(2, 'move');
    if (!st.site.fence && !st.stage4) return this.mk(2, 'fence');
    if (st.site.peopleCleared < 2) return this.mk(2, 'people');
    if (st.pointsDone < 4) {
      if (this.player.supportTop < 0.5) return this.mk(2, 'height');
      return this.mk(3, 'brackets', 'Зарядите пистолет (Q: дюбель, затем патрон), прижмите ствол к размеченной точке и выстрелите (ЛКМ). Осталось точек: ' + (4 - st.pointsDone) + '.');
    }
    if (!g.placedInCase) return this.mk(4, 'put_gun');
    if (w.fenceGroup.visible) return this.mk(4, 'remove_fence');
    const remaining = st.inv.shellsInBox + st.inv.shellsInBin + st.floorShells.length;
    if (remaining > 0 || st.waterCartridge || st.inv.misfireCartridgeInHand) return this.mk(4, 'collect');
    return this.mk(4, 'collect', 'Гильзы собраны. Сдайте инструмент, патроны и гильзы на складе — стойка приёма инструмента.');
  }

  refreshHud() {
    const st = this.state, g = st.gun;
    const obj = this.objective();
    UI.setTask('Этап ' + obj.stage + '. ' + obj.stageTitle, obj.title, obj.hint, obj.req);

    const hit = this.pickInteractable();
    UI.setPrompt(hit ? '[ЛКМ] ' + (typeof hit.it.prompt === 'function' ? hit.it.prompt(this) : hit.it.prompt) : '');

    if (g.inHands && !g.misfired) {
      const tp = this.targetPoint();
      if (tp && tp.d <= 1.2) {
        const ok = tp.d <= 0.4 && tp.offset <= 0.55 && this.player.supportTop >= 0.5 && tp.wall.dir.z <= -0.6;
        UI.setTarget('Метка ' + tp.point.id + ' · смещение ' + tp.offset.toFixed(2) + ' м · прижатие ' +
          tp.d.toFixed(2) + ' м · ' + (ok ? '✔ выстрел возможен' : '✖ выровняйтесь и прижмите ствол'));
      } else {
        UI.setTarget('Прижмите дульную часть к размеченной точке стены');
      }
    } else {
      UI.setTarget('');
    }

    const rows = [
      { label: 'СИЗ', value: this.ppeComplete() ? '✔ комплект' : this.ppeText(), bad: !this.ppeComplete() },
      { label: 'Пистолет', value: g.inHands ? 'в руках' : (g.broken ? 'НЕИСПРАВЕН' : 'в кейсе'), bad: g.broken },
      { label: 'Проверен', value: g.inspected ? 'да' : 'НЕТ', bad: !g.inspected },
      { label: 'Ствол', value: g.open ? 'переломлен' : 'закрыт' },
      { label: 'Патрон в стволе', value: g.hasCartridge ? CARTRIDGE_NAMES[g.cartridge] : (g.misfired ? 'осечка' : '—'), bad: g.misfired },
      { label: 'Дюбель', value: g.hasDowel ? 'в стволе' : '—' },
      { label: 'Гильза', value: g.hasShell ? 'в стволе' : (st.inv.shells ? 'в руке (' + st.inv.shells + ')' : (st.inv.misfireCartridgeInHand ? 'патрон осечки в руке' : '—')) },
      { sep: true },
      { label: 'Патроны', value: 'Ж' + st.ammo.yellow + ' З' + st.ammo.green + ' К' + st.ammo.red + ' Ч' + st.ammo.black },
      { label: 'Дюбели', value: String(st.ammo.dowels) },
      { label: 'Гильзы (ящик/пол/мусор)', value: st.inv.shellsInBox + ' / ' + st.floorShells.length + ' / ' + st.inv.shellsInBin },
      { sep: true },
      { label: 'Ограждение 15 м', value: st.site.fence ? 'выставлено' : 'НЕТ', bad: !st.site.fence },
      { label: 'Люди в зоне', value: 'выведено ' + st.site.peopleCleared + '/2', bad: st.site.peopleCleared < 2 },
      { label: 'Точки крепления', value: st.pointsDone + '/4' }
    ];
    UI.setStatus(rows);
  }
}




