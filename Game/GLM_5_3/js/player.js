/* ============================================================
   ИГРОК: движение, коллизии, подъёмы, мышь, камера
   Player.pos / vy / yaw / pitch / on / keys — используются
   другими модулями (Site.climbLadder, Pistol, main)
   ============================================================ */

const Player = {
  pos: new THREE.Vector3(0, 0, -17.2),   // старт: склад, перед прилавком
  vy: 0,
  yaw: -0.55,                            // смотрит в сторону стола СИЗ
  pitch: 0,
  on: 'ground',                          // ground | platform | stair | ladder
  keys: {},
  _bob: 0, _step: 0,

  fwd() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); },

  /* AABB игрока против бокса коллизии (радиус .3, рост 1.6, «перешагивание» .56) */
  hit(c) {
    const p = this.pos;
    return p.x > c.x1 - .3 && p.x < c.x2 + .3 &&
           p.z > c.z1 - .3 && p.z < c.z2 + .3 &&
           p.y + 1.6 > c.y1 && p.y + .56 < c.y2;
  },

  update(dt, active) {
    let moving = false;
    if (active) {
      /* --- ходьба --- */
      const sp = (this.keys['ShiftLeft'] ? 5.2 : 3.2) * dt;
      const f = this.fwd(), r = new THREE.Vector3(-f.z, 0, f.x);
      let mx = 0, mz = 0;
      if (this.keys['KeyW']) mx++; if (this.keys['KeyS']) mx--;
      if (this.keys['KeyD']) mz++; if (this.keys['KeyA']) mz--;
      moving = !!(mx || mz);
      if (moving) {
        const d = new THREE.Vector3(f.x * mx + r.x * mz, 0, f.z * mx + r.z * mz)
          .normalize().multiplyScalar(sp);
        const ox = this.pos.x, oz = this.pos.z;
        this.pos.x += d.x;
        for (const c of COLLIDERS) if (this.hit(c)) { this.pos.x = ox; break; }
        this.pos.z += d.z;
        for (const c of COLLIDERS) if (this.hit(c)) { this.pos.z = oz; break; }
        this._bob += dt * 9;
        this._step += sp;
        if (this._step > .85 && this.on === 'ground') { this._step = 0; SFX.step(); }
      }
      /* --- вертикаль --- */
      const sup = supportAt(this.pos.x, this.pos.z, this.pos.y);
      this.on = sup.tag;
      if (sup.h > this.pos.y && sup.h - this.pos.y <= .56) {   // ступенька вверх
        this.pos.y = sup.h; this.vy = 0;
      } else if (this.pos.y > sup.h + .001) {                   // падение
        this.vy -= 14 * dt; this.pos.y += this.vy * dt;
        if (this.pos.y <= sup.h) { this.pos.y = sup.h; this.vy = 0; }
      } else { this.pos.y = sup.h; this.vy = 0; }
      /* на стремянке не проваливаться */
      if (this.on === 'ladder') this.pos.y = Math.max(this.pos.y, 1.15);
    }
    /* --- камера --- */
    const bob = moving ? Math.sin(this._bob) * .03 : 0;
    camera.position.set(this.pos.x, this.pos.y + 1.62 + bob, this.pos.z);
    camera.rotation.set(this.pitch, this.yaw, 0);
  }
};

/* мышь (только при захвате курсора) */
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement) return;
  Player.yaw -= e.movementX * .0022;
  Player.pitch = Math.max(-1.45, Math.min(1.45, Player.pitch - e.movementY * .0022));
});