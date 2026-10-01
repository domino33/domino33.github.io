/* ============================================================================
 *  ui.js — HUD, панели заряжания/справки, экраны старта и итогов.
 * ========================================================================== */
const UI = {
  els: {},
  _cache: {},

  init: function () {
    const e = this.els;
    e.taskStage = document.getElementById('task-stage');
    e.taskTitle = document.getElementById('task-title');
    e.taskHint = document.getElementById('task-hint');
    e.taskReq = document.getElementById('task-req');
    e.targetInfo = document.getElementById('target-info');
    e.status = document.getElementById('status-list');
    e.prompt = document.getElementById('prompt');
    e.log = document.getElementById('log');
    e.timer = document.getElementById('timer');
    e.loadPanel = document.getElementById('load-panel');
    e.loadInfo = document.getElementById('load-info');
    e.loadDowelState = document.getElementById('load-dowel-state');
    e.helpPanel = document.getElementById('help-panel');
    e.helpBody = document.getElementById('help-body');
    e.startOverlay = document.getElementById('start-overlay');
    e.endOverlay = document.getElementById('end-overlay');
    e.endTitle = document.getElementById('end-title');
    e.endReason = document.getElementById('end-reason');
    e.endStats = document.getElementById('end-stats');
    e.endList = document.getElementById('end-list');
    e.helpBody.innerHTML = scenarioHelpHtml();
  },

  set: function (el, text) {
    if (!el) return;
    if (this._cache[el.id] === text) return;
    this._cache[el.id] = text;
    el.textContent = text;
  },

  setTask: function (stageText, title, hint, requirement) {
    this.set(this.els.taskStage, stageText);
    this.set(this.els.taskTitle, title);
    this.set(this.els.taskHint, hint || '');
    this.set(this.els.taskReq, requirement ? 'ТРЕБОВАНИЕ: ' + requirement : '');
  },

  setTarget: function (text) { this.set(this.els.targetInfo, text || ''); },

  setPrompt: function (text) { this.set(this.els.prompt, text || ''); },

  log: function (text, kind) {
    const d = document.createElement('div');
    if (kind) d.className = kind;
    d.textContent = text;
    this.els.log.appendChild(d);
    while (this.els.log.childNodes.length > 5) this.els.log.removeChild(this.els.log.firstChild);
  },

  clearLog: function () { this.els.log.innerHTML = ''; },

  /** rows: [{label, value, bad}] — состояние пистолета/инвентаря. */
  setStatus: function (rows) {
    const html = rows.map(function (r) {
      if (r.sep) return '<div class="sep"></div>';
      return '<div class="row' + (r.bad ? ' bad' : '') + '"><span>' + r.label + '</span><span>' + r.value + '</span></div>';
    }).join('');
    if (this._cache.statusHtml !== html) {
      this._cache.statusHtml = html;
      this.els.status.innerHTML = html;
    }
  },

  setTimer: function (text, alarm) {
    this.set(this.els.timer, text || '');
    this.els.timer.classList.toggle('alarm', !!alarm);
  },

  showLoad: function (visible, loadInfo, dowelLoaded) {
    this.els.loadPanel.classList.toggle('hidden', !visible);
    if (visible) {
      this.set(this.els.loadInfo, loadInfo || '');
      this.set(this.els.loadDowelState, dowelLoaded ? 'дюбель установлен' : 'дюбель не установлен');
    }
  },

  showHelp: function (visible) { this.els.helpPanel.classList.toggle('hidden', !visible); },

  showStart: function (visible) { this.els.startOverlay.classList.toggle('hidden', !visible); },

  showEnd: function (data) {
    this.els.endTitle.textContent = data.title;
    this.els.endTitle.style.color = data.fatal ? '#ff7b7b' : '#8fe08f';
    this.els.endReason.textContent = data.reason || '';
    this.els.endStats.textContent = data.stats || '';
    this.els.endList.innerHTML = (data.list || []).map(function (it) {
      return '<div class="item ' + (it.kind || '') + '">' + it.text + '</div>';
    }).join('');
    this.els.endOverlay.classList.remove('hidden');
  },

  hideEnd: function () { this.els.endOverlay.classList.add('hidden'); },

  bindStart: function (cb) { document.getElementById('btn-start').addEventListener('click', cb); },
  bindRestart: function (cb) { document.getElementById('btn-restart').addEventListener('click', cb); },

  /** Клики по кнопкам панели заряжания и справки. */
  bindButtons: function (cb) {
    document.querySelectorAll('[data-action]').forEach(function (b) {
      b.addEventListener('click', function () { cb(b.getAttribute('data-action'), b); });
    });
  }
};
