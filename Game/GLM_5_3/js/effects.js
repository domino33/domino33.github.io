/* ============================================================
   ЭФФЕКТЫ: твины, осколки, дым, трассеры, огонь, декали, дождь
   FX.update(dt) вызывается из главного цикла в main.js
   ============================================================ */

const FX = (() => {
  const list = []; // активные эффекты: fn(dt) -> false = удалить

  /* ---------- универсальный твин ---------- */
  function tween(dur, fn, done) {
    let t = 0;
    list.push(dt => {
      t += dt;
      const k = Math.min(1, t / dur);
      fn(k);
      if (k >= 1) { done && done(); return false; }
      return true;
    });
  }

  /* ---------- осколки кирпича ---------- */
  const debrisGeo = [
    new THREE.BoxGeometry(.05, .05, .05),
    new THREE.BoxGeometry(.08, .04, .06),
    new THREE.BoxGeometry(.03, .03, .06)
  ];
  const debrisMats = [0xcfcec8, 0xbdbcb6, 0x8f8e88].map(c =>
    new THREE.MeshStandardMaterial({ color: c, roughness: .9 }));

  function debris(pos, n = 10, dir = new THREE.Vector3(0, .5, -1)) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(debrisGeo[i % 3], debrisMats[i % 3]);
      m.castShadow = true;
      m.position.copy(pos);
      const v = dir.clone().multiplyScalar(1.5 + Math.random() * 2.5)
        .add(new THREE.Vector3(
          (Math.random() - .5) * 2.2,
          Math.random() * 2.5,
          (Math.random() - .5) * 2.2));
      const av = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      let life = 1.2;
      scene.add(m);
      list.push(dt => {
        v.y -= 12 * dt;
        m.position.addScaledVector(v, dt);
        m.rotation.x += av.x * dt; m.rotation.y += av.y * dt;
        if (m.position.y < .03 && v.y < 0) {   // отскок от земли
          m.position.y = .03; v.y *= -.35; v.x *= .6; v.z *= .6;
        }
        if ((life -= dt) <= 0) { scene.remove(m); return false; }
        return true;
      });
    }
  }

  /* ---------- пыль/дым ---------- */
  function smoke(pos, count = 3) {
    for (let i = 0; i < count; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Tex.smoke, transparent: true, depthWrite: false
      }));
      sp.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - .5) * .12, Math.random() * .06, (Math.random() - .5) * .12));
      sp.scale.setScalar(.25);
      scene.add(sp);
      let life = 1;
      list.push(dt => {
        life -= dt;
        sp.position.y += dt * .3;
        sp.scale.addScalar(dt * .8);
        sp.material.opacity = .4 * Math.max(0, life);
        if (life <= 0) { scene.remove(sp); sp.material.dispose(); return false; }
        return true;
      });
    }
  }

  /* ---------- трассер рикошета ---------- */
  function tracer(from, dir) {
    const len = 8;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(.012, .012, len, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .95 }));
    m.position.copy(from).addScaledVector(dir, len / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    scene.add(m);
    let t = 0;
    list.push(dt => {
      t += dt;
      m.material.opacity = .95 * (1 - t / .3);
      if (t > .3) { scene.remove(m); m.material.dispose(); return false; }
      return true;
    });
  }

  /* ---------- пламя воспламенения ---------- */
  function fire(pos) {
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: Tex.fire, transparent: true, depthWrite: false
      }));
      sp.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - .5) * .4, .1 + Math.random() * .3, (Math.random() - .5) * .4));
      sp.scale.setScalar(.4 + Math.random() * .5);
      scene.add(sp);
      let life = 1.6;
      list.push(dt => {
        life -= dt;
        sp.position.y += dt * .35;
        sp.scale.addScalar(dt * .6);
        sp.material.opacity = Math.min(1, life);
        if (life <= 0) { scene.remove(sp); sp.material.dispose(); return false; }
        return true;
      });
    }
    SFX.fire();
  }

  /* ---------- декаль трещины на стене ---------- */
  function crackDecal(x, y, z, scale = 1) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(.8 * scale, .8 * scale),
      new THREE.MeshBasicMaterial({ map: Tex.crack, transparent: true }));
    m.position.set(x, y, z);
    m.rotation.y = Math.PI; // лицом к игроку (игрок со стороны -Z от стены)
    scene.add(m);
  }

  /* ---------- дождь (этап 4) ---------- */
  const RN = 380;
  const rainArr = new Float32Array(RN * 6);
  const drops = [];
  for (let i = 0; i < RN; i++)
    drops.push({
      x: Math.random() * 26 - 13,
      y: Math.random() * 10,
      z: Math.random() * 26 - 13,
      s: 9 + Math.random() * 4
    });
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
  const rainMesh = new THREE.LineSegments(rainGeo,
    new THREE.LineBasicMaterial({ color: 0xaebfd0, transparent: true, opacity: .5 }));
  rainMesh.visible = false;
  rainMesh.frustumCulled = false;
  scene.add(rainMesh);

  function startRain() {
    if (G.rain) return;
    G.rain = true;
    rainMesh.visible = true;
    SFX.startRain();
    /* пасмурное небо */
    scene.fog.color.set(0x8a95a0);
    scene.background.set(0x8a95a0);
    scene.fog.near = 30; scene.fog.far = 110;
    sun.intensity = .8;
  }

  function rainUpdate(dt, center) {
    if (!rainMesh.visible) return;
    for (let i = 0; i < RN; i++) {
      const d = drops[i];
      d.y -= d.s * dt;
      if (d.y < 0) { // реюз капли над игроком
        d.y = 9 + Math.random();
        d.x = center.x + Math.random() * 26 - 13;
        d.z = center.z + Math.random() * 26 - 13;
      }
      const o = i * 6;
      rainArr[o]     = d.x;      rainArr[o + 1] = d.y;      rainArr[o + 2] = d.z;
      rainArr[o + 3] = d.x + .02; rainArr[o + 4] = d.y + .25; rainArr[o + 5] = d.z;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- вызов из главного цикла ---------- */
  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--)
      if (!list[i](dt)) list.splice(i, 1);
  }

  return { tween, debris, smoke, tracer, fire, crackDecal,
           startRain, rainUpdate, update };
})();