/* ============================================================
   ИНТЕРФЕЙС: задания, статус, тосты, оверлеи, панели
   ============================================================ */

const UI = (() => {
  const $ = s => document.querySelector(s);

  /* ---------- всплывающие сообщения ---------- */
  function toast(msg, type = 'info', sec = 4) {
    const d = document.createElement('div');
    d.className = 'toast' + (type === 'warn' ? ' warn' : type === 'danger' ? ' danger' : '');
    d.textContent = msg;
    $('#toasts').appendChild(d);
    setTimeout(() => d.remove(), sec * 1000);
  }

  /* ---------- фиаско ---------- */
  function fail(title, msg, tip) {
    if (G.over) return;
    G.over = true; G.failed = true;
    $('#failT').textContent = title;
    $('#failM').textContent = msg;
    $('#failTip').textContent = tip ? ('Требование: ' + tip) : '';
    document.exitPointerLock && document.exitPointerLock();
    $('#fail').classList.remove('hidden');
  }

  /* ---------- победа + итоговая оценка ---------- */
  function win() {
    G.over = true;
    const t = Math.round((performance.now() - G.t0) / 1000);
    $('#winStats').innerHTML =
      `Время: <b>${Math.floor(t / 60)}м ${t % 60}с</b> · ` +
      `Выстрелов: <b>${G.shots}</b> · Гильз сдано: <b>${G.shellsCase}</b>`;
    $('#winRems').innerHTML = G.remarks.length
      ? G.remarks.map(r => '• ' + r).join('<br>')
      : '• нарушений не зафиксировано';
    const n = G.remarks.length;
    $('#winGrade').textContent =
      n === 0 ? 'ОТЛИЧНО'
      : n <= 2 ? 'ХОРОШО'
      : n <= 4 ? 'УДОВЛЕТВОРИТЕЛЬНО'
      : 'НЕУДОВЛЕТВОРИТЕЛЬНО';
    document.exitPointerLock && document.exitPointerLock();
    $('#win').classList.remove('hidden');
  }

  /* ---------- панель заданий (слева) ---------- */
  function renderTasks() {
    const st = G.stage;
    let html = `<h4>ЭТАП ${st} — ${CONST.STAGE_NAMES[st]}</h4>`;
    let curFound = false;
    for (const task of TASKS) {
      if (task.s > st) break;
      const done = task.d();
      if (done && task.s < st) continue;      // старые выполненные сворачиваем
      const cur = !done && !curFound;
      if (cur) curFound = true;
      html += `<div class="trow ${done ? 'done' : cur ? 'cur' : ''}">` +
              `<span class="bx">${done ? '✓' : cur ? '▶' : '·'}</span>` +
              `<span class="tx">${task.t}</span></div>`;
    }
    if (G.pistolDead && !G.exchanged && G.pistolSplit)
      html += `<div class="trow cur" style="color:#ff5a4a"><span class="bx">!</span>` +
              `<span class="tx">Пистолет неисправен — сдайте кладовщику</span></div>`;
    $('#tasks').innerHTML = html;
  }

  /* ---------- панель статуса (справа) + оверлеи СИЗ ---------- */
  function renderStatus() {
    const p = G.ppe;
    const f = (v, ok = true) => `<span class="${ok ? 'ok' : 'bad'}">${v}</span>`;

    let pis = '—';
    if (G.pistolDead && !G.exchanged && G.pistolSplit) pis = f('НЕИСПРАВЕН', false);
    else {
      pis = G.pistolCarried ? 'в руке' : (G.pistolInCase ? 'в кейсе' : '—');
      if (G.brokenOpen) pis += ' (переломлен)';
    }

    let ch = '—';
    if (G.chamber === 'dud') ch = f('ПАТРОН С ОСЕЧКОЙ');
    else if (G.chamber) ch = f(CONST.COLN[G.chamber], G.chamber === 'green');

    let hi = '—';
    if (G.handItem) hi = {
      shell: 'гильза',
      dud: 'осечный патрон',
      bracket: 'кронштейн',
      cartridge: 'патрон (' + CONST.COLN[G.handItem.color] + ')'
    }[G.handItem.kind];

    $('#status').innerHTML = `
      <div class="row"><span class="k">Слух (наушники)</span><span class="v">${p.ears ? f('защищён') : f('НЕТ', false)}</span></div>
      <div class="row"><span class="k">Глаза</span><span class="v">${p.eyes === 'glasses' ? f('очки') : p.eyes === 'mask' ? '<span class="warn">маска (не подходит)</span>' : f('НЕТ', false)}</span></div>
      <div class="row"><span class="k">Краги</span><span class="v">${p.hands ? f('надеты') : f('НЕТ', false)}</span></div>
      <div class="row"><span class="k">Пистолет</span><span class="v">${pis}</span></div>
      <div class="row"><span class="k">Патрон / дюбель</span><span class="v">${ch} / ${G.barrelDowel ? f('в стволе') : ''}</span></div>
      <div class="row"><span class="k">В руке</span><span class="v">${hi}</span></div>
      <div class="row"><span class="k">Кронштейны / гильзы</span><span class="v">${G.brackets.filter(b => b.done).length}/2 · ${G.shellsCase}</span></div>`;

    /* оверлеи от первого лица */
    $('#ovHat').classList.toggle('hidden', !p.headWorn);
    $('#ovGlasses').classList.toggle('hidden', p.eyes !== 'glasses');
    $('#ovMask').classList.toggle('hidden', p.eyes !== 'mask');
  }

  /* ---------- контекстная подсказка под прицелом ---------- */
  function prompt(text) { $('#prompt').textContent = text || ''; }

  /* ---------- прочие элементы ---------- */
  function flashRed() {                      // красная вспышка (выстрел/травма)
    const f = $('#flash');
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), 140);
  }
  function pause(show) { $('#pause').classList.toggle('hidden', !show); }
  function misfire(show) { $('#mf').classList.toggle('hidden', !show); }
  function misfireT(sec) { $('#mfT').textContent = Math.ceil(sec); }
  function carts(open, sub) {                // панель выбора патрона
    if (sub !== undefined) $('#cartSub').textContent = sub;
    $('#carts').classList.toggle('hidden', !open);
  }

  return { toast, fail, win, renderTasks, renderStatus, prompt,
           flashRed, pause, misfire, misfireT, carts };
})();