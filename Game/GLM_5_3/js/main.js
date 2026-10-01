/* ============================================================
   ГЛАВНЫЙ МОДУЛЬ: запуск, ввод, игровой цикл, логика этапов
   ============================================================ */

const Game = (() => {
  const $ = s => document.querySelector(s);

  /* ================= запуск / пауза ================= */
  $('#introBtn').onclick = () => {
    SFX.init();
    $('#intro').classList.add('hidden');
    renderer.domElement.requestPointerLock();
    G.started = true; G.t0 = performance.now();
    UI.renderTasks(); UI.renderStatus();
    UI.toast('Этап 1: наденьте СИЗ со стола справа и возьмите кейс со стеллажа слева', 'info', 8);
  };
  $('#resumeBtn').onclick = () => {
    UI.pause(false);
    renderer.domElement.requestPointerLock();
  };

  /* ================= мышь ================= */
  renderer.domElement.addEventListener('mousedown', e => {
    if (!G.started || G.over) return;
    if (document.pointerLockElement !== renderer.domElement) {
      renderer.domElement.requestPointerLock(); return;
    }
    if (e.button === 0) shoot();
  });
  document.addEventListener('pointerlockchange', () => {
    if (G.started && !G.over && document.pointerLockElement !== renderer.domElement)
      UI.pause(true);
  });

  /* ================= клавиатура ================= */
  addEventListener('keydown', e => {
    Player.keys[e.code] = true;
    if (!G.started || G.over) return;
    /* панель выбора патрона открыта — цифры выбирают, Q отменяет */
    if (!$('#carts').classList.contains('hidden')) {
      if (e.code === 'Digit1') Pistol.chooseCart(0);
      else if (e.code === 'Digit2') Pistol.chooseCart(1);
      else if (e.code === 'Digit3') Pistol.chooseCart(2);
      else if (e.code === 'Digit4') Pistol.chooseCart(3);
      else if (e.code === 'KeyQ') UI.carts(false);
      return;
    }
    switch (e.code) {
      case 'KeyE': interact(); break;
      case 'KeyR': Pistol.pistolKeys(); break;
      case 'KeyX': Pistol.togglePistol(); break;
      case 'KeyF': Pistol.toggleCase(); break;
      case 'Digit1': Pistol.takeDowel(); break;
      case 'Digit2': Pistol.openCartPanel(); break;
      case 'KeyG': Pistol.dropHand(); break;
    }
  });
  addEventListener('keyup', e => { Player.keys[e.code] = false; });

  /* ================= действия ================= */
  function shoot() { if (!Pistol.tryShoot()) interact(); }

  function interact() {
    if (Pistol.extractE()) return;                     // сначала — извлечение из патронника
    const a = aim();
    if (a) {
      /* с заряженным пистолетом взаимодействовать нельзя */
      if (G.pistolCarried && (G.chamber === 'dud' || (G.chamber && !a.it.npc))) {
        UI.toast('Инструмент заряжен — при перерывах в работе пистолет следует разрядить [R]', 'warn');
        return;
      }
      a.it.act();
      return;
    }
    if (Pistol.putToCase()) return;
    if (G.handItem) UI.toast('Подойдите к кейсу, чтобы убрать предмет');
  }

  /* ================= покадровая логика этапов ================= */
  let lastNpcWarn = 0;

  function logic(dt) {
    const t = performance.now();

    /* этап 1 → 2: осмотрен и убран в кейс */
    if (G.stage === 1 && G.inspected && G.pistolInCase) {
      G.stage = 2; UI.renderTasks();
      UI.toast('Этап 2: перенесите кейс к месту работ — выход со склада вперёд, затем прямо к стене', 'info', 6);
    }

    /* прибытие на место работ */
    if (!G.atSite && Player.pos.z > 4 && Math.abs(Player.pos.x) < 8 && Player.pos.z < CONST.WALL_Z) {
      G.atSite = true;
if (!G.inspected && G.pistolCarried && (!G.pistolDead || G.exchanged)) {
        Pistol.accidentalShot('СЛУЧАЙНЫЙ ВЫСТРЕЛ',
          'Вы прибыли на место работ с непроверенным пистолетом в руках — произошёл случайный выстрел!',
          'При получении пистолета убедитесь, что он не заряжен.');
        return;
      }
       if (!G.inspected && G.pistolInCase && (!G.pistolDead || G.exchanged)) G.caseTrap = true;  // сработает при доставании
      if (G.inspected) {
        if (G.pistolCarried) remark('Пистолет переносился в руках, а не в кейсе');
        if (G.stage < 3) {
          G.stage = 3; UI.renderTasks();
          UI.toast('Этап 3: производство работ', 'info', 5);
        }
      }
      UI.renderTasks();
    }

    /* подъём на подмости засчитан */
    if (Player.on === 'platform' && !G.wasPlatform && G.stage >= 2) {
      G.wasPlatform = true;
      UI.toast('Вы на подмостях — правильное средство подмащивания');
      UI.renderTasks();
    }

    /* осечка: таймер + контроль прижатия к стене */
    if (G.misfire && !G.misfireOk) {
      G.misfireT -= dt;
      UI.misfireT(Math.max(0, G.misfireT));
      const away = (CONST.WALL_Z - Player.pos.z > 1.8) || !G.pistolCarried;
      if (away) {
        Pistol.accidentalShot('ВЫСТРЕЛ ПРИ ОСЕЧКЕ',
          'Пистолет отведён от стены раньше чем через минуту — патрон выстрелил!',
          'При осечке не отводите инструмент от стены в течение 1 минуты.');
        return;
      }
      if (G.misfireT <= 0) {
        G.misfireOk = true; UI.misfire(false);
        UI.toast('Прошла 1 минута. Аккуратно разрядите: [R] переломить → [E] извлечь патрон → отнесите его в воду', 'info', 8);
      }
    }

    /* наведение на людей */
    const a = aim();
 if (a && a.it.npc && G.pistolCarried && a.dist < 12) {
      if (!G.inspected && (!G.pistolDead || G.exchanged)) {
        Pistol.accidentalShot('ВЫСТРЕЛ В ЧЕЛОВЕКА',
          'Вы направили непроверенный пистолет на человека — произошёл случайный выстрел!',
          'Запрещается направлять инструмент на себя или в сторону других лиц, даже если он не заряжен.');
        return;
      }
      if (t - lastNpcWarn > 3000) {
        lastNpcWarn = t;
        UI.toast('ЗАПРЕЩЕНО направлять инструмент на людей, даже разряженный!', 'warn');
        remark('Наведение инструмента на людей');
      }
    }

    /* контекстная подсказка */
    let pr = '';
    if (G.pistolCarried && G.chamber && G.chamber !== 'dud' && !G.brokenOpen)
      pr = Pistol.aimPoint() ? 'ПРИЖАТО — ЛКМ выстрел' : '';
    if (!pr && a) pr = a.lbl + ' [E]';
 if (!pr && G.pistolCarried && G.brokenOpen) {
      if (G.chamber === 'dud') pr = 'E — извлечь осечный патрон · R — закрыть';
      else if (G.chamber) pr = 'E — извлечь патрон · R — закрыть и стрелять';
      else if (G.spentShell) pr = 'Извлечь гильзу [E]';
      else pr = 'R — закрыть пистолет';
    }
    if (!pr && G.handItem && Pistol.caseNear()) pr = 'Убрать в кейс [E]';
    UI.prompt(pr);

    /* дождь мочит кейс на земле */
    if (G.rain && !G.caseCarried && !G.wetNoted) {
      G.caseGroundT += dt;
      if (G.caseGroundT > 5) {
        G.wetNoted = true;
        remark('Патроны в кейсе подмочены дождём');
        UI.toast('Дождь: вода попадает в кейс с патронами! Поднимите кейс [F]', 'warn', 6);
      }
    }
  }

  /* ================= главный цикл ================= */
  let last = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    const active = G.started && !G.over && document.pointerLockElement === renderer.domElement;
    Player.update(dt, active);
    if (active) logic(dt);
    Pistol.update(dt);
    NPC.update(dt);
    FX.update(dt);
    FX.rainUpdate(dt, Player.pos);
    renderer.render(scene, camera);
  }

  UI.renderTasks(); UI.renderStatus();   // панели видны за интро-оверлеем
  loop();
})();