/* ============================================================================
 *  player.js — контроллер от первого лица: обзор мышью (pointer lock),
 *  ходьба/бег/прыжок, простые коллизии с преградами и опора на площадки
 *  (подмости, стремянка).
 * ========================================================================== */
const PLAYER = {
  EYE: 1.62,
  HEIGHT: 1.78,
  RADIUS: 0.34,
  GRAVITY: 15,
  JUMP: 5.3
};

class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.vy = 0;
    this.grounded = true;
    this.supportTop = 0;
    this.keys = {};
    this.speed = 3.3;
    this.runMul = 1.75;
    this.enabled = true;
    this.onClimb = null;
    this._bind();
  }

  _bind() {
    const self = this;
    window.addEventListener('keydown', function (e) {
      self.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { self.keys[e.code] = false; });
    window.addEventListener('blur', function () { self.keys = {}; });
    document.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== self.canvas) return;
      const s = 0.0022;
      self.yaw -= e.movementX * s;
      self.pitch -= e.movementY * s;
      const lim = Math.PI / 2 - 0.06;
      self.pitch = Math.max(-lim, Math.min(lim, self.pitch));
    });
  }

  lock() {
    const p = this.canvas.requestPointerLock();
    if (p && p.catch) p.catch(function () { });
  }

  get locked() { return document.pointerLockElement === this.canvas; }

  reset(x, y, z, yaw) {
    this.pos.set(x, y, z);
    this.yaw = yaw || 0;
    this.pitch = 0;
    this.vy = 0;
    this.grounded = true;
    this.supportTop = y;
    this.onClimb = null;
  }

  /** Плавный подъём/спуск на площадку. */
  climbTo(x, y, z, yaw) {
    this.onClimb = {
      t: 0, dur: 0.45,
      from: this.pos.clone(),
      to: new THREE.Vector3(x, y, z),
      yawFrom: this.yaw,
      yawTo: (yaw === undefined ? this.yaw : yaw)
    };
  }

  applyToCamera(camera) {
    camera.position.set(this.pos.x, this.pos.y + PLAYER.EYE, this.pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.yaw;
    camera.rotation.x = this.pitch;
    camera.rotation.z = 0;
  }

  update(dt, colliders) {
    if (this.onClimb) {
      const c = this.onClimb;
      c.t += dt;
      let k = Math.min(1, c.t / c.dur);
      k = k * k * (3 - 2 * k);
      this.pos.lerpVectors(c.from, c.to, k);
      this.yaw = c.yawFrom + (c.yawTo - c.yawFrom) * k;
      if (k >= 1) { this.onClimb = null; this.grounded = true; }
      this.vy = 0;
      return;
    }
    if (!this.enabled) return;

    const k = this.keys;
    let fwd = 0, side = 0;
    if (k['KeyW'] || k['ArrowUp']) fwd += 1;
    if (k['KeyS'] || k['ArrowDown']) fwd -= 1;
    if (k['KeyD'] || k['ArrowRight']) side += 1;
    if (k['KeyA'] || k['ArrowLeft']) side -= 1;
    const len = Math.hypot(fwd, side);
    if (len > 0) { fwd /= len; side /= len; }
    const speed = this.speed * ((k['ShiftLeft'] || k['ShiftRight']) ? this.runMul : 1);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const dx = (-sin * fwd) + (cos * side);
    const dz = (-cos * fwd) + (-sin * side);
    this.pos.x += dx * speed * dt;
    this.pos.z += dz * speed * dt;

    if (k['Space'] && this.grounded) { this.vy = PLAYER.JUMP; this.grounded = false; }
    k['Space'] = false;

    this.vy -= PLAYER.GRAVITY * dt;
    if (this.vy < -25) this.vy = -25;
    this.pos.y += this.vy * dt;

    this._resolveXZ(colliders);
    this._resolveSupport(colliders);
  }

  _resolveXZ(colliders) {
    const p = this.pos, r = PLAYER.RADIUS, top = p.y + PLAYER.HEIGHT * 0.9;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (p.y >= b.max.y - 0.06) continue;           // стоим на этой преграде
      if (p.y + PLAYER.HEIGHT <= b.min.y) continue;  // преграда выше головы
      if (top < b.min.y) continue;
      const minX = b.min.x - r, maxX = b.max.x + r;
      const minZ = b.min.z - r, maxZ = b.max.z + r;
      if (p.x <= minX || p.x >= maxX || p.z <= minZ || p.z >= maxZ) continue;
      const dxL = p.x - minX, dxR = maxX - p.x, dzB = p.z - minZ, dzF = maxZ - p.z;
      const m = Math.min(dxL, dxR, dzB, dzF);
      if (m === dxL) p.x = minX;
      else if (m === dxR) p.x = maxX;
      else if (m === dzB) p.z = minZ;
      else p.z = maxZ;
    }
  }

  _resolveSupport(colliders) {
    const p = this.pos, r = PLAYER.RADIUS * 0.8;
    let support = 0, box = null;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i];
      if (b.max.y > p.y + 0.45) continue;
      if (b.max.y < support) continue;
      if (p.x < b.min.x - r || p.x > b.max.x + r) continue;
      if (p.z < b.min.z - r || p.z > b.max.z + r) continue;
      support = b.max.y;
      box = b;
    }
    if (p.y <= support + 0.001) {
      p.y = support;
      if (this.vy < 0) this.vy = 0;
      this.grounded = true;
      this.supportTop = support;
      this.supportBox = box;
    } else {
      this.grounded = false;
    }
  }
}
