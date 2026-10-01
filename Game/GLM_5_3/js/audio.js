/* ============================================================
   ЗВУК: полностью синтезированный (WebAudio, без файлов)
   SFX.init() вызывается по клику «НАЧАТЬ ТРЕНИРОВКУ»
   (жест пользователя обязателен для AudioContext)
   ============================================================ */

const SFX = (() => {
  let AC = null, master = null, noiseBuf = null, rainGain = null;

  function init() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain();
      master.gain.value = .5;
      master.connect(AC.destination);
      const n = Math.floor(AC.sampleRate * 1.5);
      noiseBuf = AC.createBuffer(1, n, AC.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { AC = null; }
  }

  /* короткий тон с затуханием */
  function tone(f, dur, type = 'sine', vol = .2, f2 = null, delay = 0) {
    if (!AC) return;
    const t0 = AC.currentTime + delay;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + .02);
  }

  /* шум через фильтр (основа почти всех эффектов) */
  function noise(dur, vol, f, f2 = null, type = 'lowpass', delay = 0) {
    if (!AC) return;
    const t0 = AC.currentTime + delay;
    const s = AC.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const fl = AC.createBiquadFilter();
    fl.type = type;
    fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
    const g = AC.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + .05);
  }

  return {
    init,
    ready: () => !!AC,

    /* выстрел монтажного пистолета: хлопок + низкий удар + хвост */
    shot() {
      noise(.3, .9, 7000, 300);
      tone(110, .22, 'sine', .8, 36);
      noise(.6, .12, 500);
    },
    /* сухой щелчок (нет патрона / осечка) */
    click() { tone(1600, .03, 'square', .1); },
    /* переломить / закрыть пистолет — двойной механический стук */
    clack() {
      noise(.045, .3, 3000, null, 'highpass');
      noise(.045, .2, 2200, null, 'highpass', .07);
    },
    /* мелкий металлический звяк (дюбель/патрон вставлен) */
    tink() { tone(2400, .08, 'sine', .12, 1900); },
    /* патрон в контейнер с водой */
    splash() { noise(.3, .35, 1200, 300); },
    /* UI-тик */
    tick() { tone(1100, .03, 'square', .06); },
    /* кейс на землю */
    thud() { tone(70, .25, 'sine', .6, 38); noise(.15, .3, 300); },
    /* неисправный пистолет (вибрация при переламывании) */
    buzz() { tone(100, .5, 'sawtooth', .35); },
    /* шаг */
    step() { noise(.05, .05, 420, null, 'bandpass'); },
    /* воспламенение патрна в мусоре */
    fire() {
      noise(.5, .5, 3000, 400);
      noise(1.2, .25, 800, 200, 'lowpass', .3);
    },
    /* зацикленный шум дождя с плавным нарастанием */
    startRain() {
      if (!AC || rainGain) return;
      const s = AC.createBufferSource();
      s.buffer = noiseBuf; s.loop = true;
      const fl = AC.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = 900;
      rainGain = AC.createGain();
      rainGain.gain.value = 0;
      s.connect(fl); fl.connect(rainGain); rainGain.connect(master);
      s.start();
      rainGain.gain.linearRampToValueAtTime(.11, AC.currentTime + 3);
    }
  };
})();