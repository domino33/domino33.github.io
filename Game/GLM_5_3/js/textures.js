/* ============================================================
   ПРОЦЕДУРНЫЕ ТЕКСТУРЫ (canvas, без файлов) + таблички
   API three.js r149: encoding, не colorSpace
   ============================================================ */

const Tex = (() => {

  function makeTex(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }

  /* ---- силикатный кирпич (рабочая стена) ---- */
  const brick = makeTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b4b2ab'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) {
      const y = r * 64, off = (r % 2) * 80;
      for (let i = -1; i < 5; i++) {
        const x = i * 160 + off, l = 76 + Math.random() * 9;
        g.fillStyle = `hsl(46,${4 + Math.random() * 3}%,${l}%)`;
        g.fillRect(x + 3, y + 3, 154, 58);
        g.fillStyle = 'rgba(0,0,0,.05)';
        g.fillRect(x + 3, y + 47, 154, 14); // тень нижней грани
      }
    }
    for (let i = 0; i < 800; i++) { // зерно
      g.fillStyle = `rgba(0,0,0,${Math.random() * .06})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
  brick.repeat.set(15, 5);

  /* ---- сигнальная лента ограждений ---- */
  const haz = makeTex(128, 64, (g, w, h) => {
    g.fillStyle = '#e3b23c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#26282b';
    for (let i = -2; i < 5; i++) {
      g.beginPath();
      g.moveTo(i * 40, 0); g.lineTo(i * 40 + 40, 0);
      g.lineTo(i * 40 + 40 - h, h); g.lineTo(i * 40 - h, h);
      g.fill();
    }
  });
  haz.repeat.set(3, 1);

  /* ---- радиальные градиенты для спрайтов ---- */
  const radial = (c1, c2) => makeTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    r.addColorStop(0, c1); r.addColorStop(1, c2);
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  const smoke = radial('rgba(190,188,182,.65)', 'rgba(190,188,182,0)');
  const fire  = radial('rgba(255,220,120,1)', 'rgba(255,60,10,0)');

  /* ---- трещина: декаль на стене при расколе кирпича ---- */
  const crack = makeTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(42,40,37,.95)';
    g.lineCap = 'round';
    for (let b = 0; b < 7; b++) { // лучи от центра
      let a = b / 7 * Math.PI * 2 + Math.random() * .5, x = 128, y = 128;
      g.lineWidth = 4; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        const st = 12 + Math.random() * 16;
        a += (Math.random() - .5) * .9;
        x += Math.cos(a) * st; y += Math.sin(a) * st;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.lineWidth = 2; // мелкие ответвления
    for (let i = 0; i < 10; i++) {
      const x = 60 + Math.random() * 136, y = 60 + Math.random() * 136;
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + (Math.random() - .5) * 40, y + (Math.random() - .5) * 40);
      g.stroke();
    }
  });

  return { brick, haz, smoke, fire, crack };
})();

/* ---- табличка-вывеска: canvas → плоскость ----
   sign(ширина, высота, fn(g,w,h)) → Mesh (PlaneGeometry)   */
function sign(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = Math.max(64, Math.round(256 * h / w));
  fn(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: t })
  );
}