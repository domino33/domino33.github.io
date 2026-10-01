/* ============================================================================
 *  world.js — сцена тренажёра, целиком собранная из примитивов Three.js.
 *  Все объекты сценария (СИЗ, кейс с пистолетом, патроны и дюбели, стена из
 *  силикатного кирпича с разметкой, подмости, стремянка, ограждения опасной
 *  зоны, работники, контейнер с водой, мусорка, ящик для гильз, дождь) —
 *  примитивы Box / Cylinder / Sphere / Ring / Plane / Points.
 * ========================================================================== */
const World = (function () {
  const MATS = {};

  function mat(color, opts) {
    opts = opts || {};
    const key = color + '|' + (opts.metalness || 0) + '|' + (opts.roughness === undefined ? 0.85 : opts.roughness) + '|' + (opts.opacity === undefined ? 1 : opts.opacity);
    if (!MATS[key]) {
      MATS[key] = new THREE.MeshStandardMaterial({
        color: color,
        metalness: opts.metalness || 0,
        roughness: (opts.roughness === undefined ? 0.85 : opts.roughness),
        transparent: (opts.opacity !== undefined && opts.opacity < 1),
        opacity: (opts.opacity === undefined ? 1 : opts.opacity),
        side: opts.side || THREE.FrontSide
      });
    }
    return MATS[key];
  }

  /** Прямоугольный блок: габариты (w,h,d), центр (x,y,z). */
  function box(parent, w, h, d, x, y, z, color, opts) {
    opts = opts || {};
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    m.position.set(x, y, z);
    if (opts.rotX) m.rotation.x = opts.rotX;
    if (opts.rotY) m.rotation.y = opts.rotY;
    if (opts.rotZ) m.rotation.z = opts.rotZ;
    m.castShadow = opts.cast !== false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Цилиндр с вертикальной осью. */
  function cyl(parent, rTop, rBot, h, x, y, z, color, opts) {
    opts = opts || {};
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, opts.seg || 16), mat(color, opts));
    m.position.set(x, y, z);
    if (opts.rotX) m.rotation.x = opts.rotX;
    if (opts.rotZ) m.rotation.z = opts.rotZ;
    if (opts.rotY) m.rotation.y = opts.rotY;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /** Цилиндр с осью по Z (направление «вперёд»). */
  function cylZ(parent, r, len, x, y, z, color, opts) {
    return cyl(parent, r, r, len, x, y, z, color, Object.assign({ rotX: Math.PI / 2 }, opts || {}));
  }

  function sphere(parent, r, x, y, z, color, opts) {
    opts = opts || {};
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, opts.seg || 16, opts.seg2 || 12,
      opts.phiStart || 0, opts.phiLength || Math.PI * 2), mat(color, opts));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  /* ------------------------------------------------------------------ *
   *  Сборка мира
   * ------------------------------------------------------------------ */
  function build(scene) {
    const w = {
      group: new THREE.Group(),
      interactables: [],
      colliders: [],
      points: [],
      wallMeshes: [],
      groundMeshes: [],
      npc: {}, rain: null, dangerRing: null,
      fenceGroup: null, fenceStack: null, scaffoldGroup: null, ladderGroup: null,
      gun: null, gunParts: {}, caseGroup: null, caseLid: null, caseItems: null,
      spawn: new THREE.Vector3(-16.5, 0, 1.6), spawnYaw: Math.PI / 2,
      pointsInfo: []
    };
    scene.add(w.group);

    /** Регистрация интерактивного объекта спецификации {id,label,prompt,handler,meshes,range}. */
    w.addInteractable = function (spec) {
      spec.meshes = spec.meshes || [];
      spec.enabled = (spec.enabled !== false);
      spec.range = spec.range || 3.2;
      spec.data = spec.data || {};
      spec.meshes.forEach(function (root) {
        root.traverse(function (o) {
          if (o.isMesh) {
            if (Array.isArray(o.material)) o.material = o.material.map(function (m) { return m.clone(); });
            else o.material = o.material.clone();
            o.userData.interactId = spec.id;
          }
        });
      });
      w.interactables.push(spec);
      return spec;
    };

    w.getInteractable = function (id) {
      return w.interactables.filter(function (i) { return i.id === id; })[0] || null;
    };

    w.removeInteractable = function (id) {
      const it = w.getInteractable(id);
      if (!it) return;
      it.enabled = false;
      const idx = w.interactables.indexOf(it);
      if (idx >= 0) w.interactables.splice(idx, 1);
    };

    w.setVisible = function (id, visible) {
      const it = w.getInteractable(id);
      if (!it) return;
      it.enabled = visible;
      it.hidden = !visible;
      it.meshes.forEach(function (r) { r.visible = visible; });
    };

    /** Преграда для физики игрока по габаритам. */
    w.addColliderBox = function (minX, maxX, minY, maxY, minZ, maxZ) {
      const b = new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));
      w.colliders.push(b);
      return b;
    };

    /** Преграда по габаритам объекта. */
    w.addCollider = function (obj) {
      obj.updateWorldMatrix(true, true);
      const b = new THREE.Box3().setFromObject(obj);
      w.colliders.push(b);
      return b;
    };

    buildGround(w);
    buildWarehouse(w);
    buildStorage(w);
    buildWorkArea(w);
    buildWorkers(w);
    buildFenceAndRain(w);
    return w;
  }

  /* ------------------------------------------------------------------ *
   *  Земля, площадка, разметка опасной зоны 15 м
   * ------------------------------------------------------------------ */
  function buildGround(w) {
    const g = new THREE.Group();
    w.group.add(g);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), mat(0x8d9199, { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);
    w.groundMeshes.push(ground);

    const pad = new THREE.Mesh(new THREE.PlaneGeometry(30, 26), mat(0x757a82, { roughness: 1 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(2, 0.012, -6);
    pad.receiveShadow = true;
    g.add(pad);
    w.groundMeshes.push(pad);

    // Разметка опасной зоны 15 м (появляется вместе с ограждением)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(14.7, 15.0, 96),
      mat(0xffcf40, { opacity: 0.6, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(2, 0.02, -9);
    ring.visible = false;
    g.add(ring);
    w.dangerRing = ring;

    // Указатель к месту работ
    cyl(g, 0.05, 0.05, 1.7, -12.6, 0.85, 1.6, 0x8a8f96);
    const plate = box(g, 1.2, 0.4, 0.06, -12.6, 1.82, 1.6, 0x2f6fb0, { rotY: Math.PI / 2 });
    w.addInteractable({
      id: 'sign_site', label: 'Указатель', handler: 'sign',
      prompt: 'Указатель: место работ — кирпичная стена (около 15 м)',
      meshes: [plate], range: 4.5
    });
    w.addColliderBox(-12.7, -12.5, 0, 1.7, 1.5, 1.7);
  }

  /* ------------------------------------------------------------------ *
   *  Склад: помещение с дверным проёмом
   * ------------------------------------------------------------------ */
  function buildWarehouse(w) {
    const g = new THREE.Group();
    w.group.add(g);
    const WALL = 0xcfd3cf, W = 3.6;

    // Пол склада
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 12), mat(0x6f6f6f, { roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-19, 0.015, 0);
    floor.receiveShadow = true;
    g.add(floor);
    w.groundMeshes.push(floor);

    // Задняя стена (z = -6)
    box(g, 10.3, W, 0.25, -19, W / 2, -6.1, WALL);
    w.addColliderBox(-24.3, -13.7, 0, W, -6.25, -5.95);
    // Передняя стена (z = 6)
    box(g, 10.3, W, 0.25, -19, W / 2, 6.1, WALL);
    w.addColliderBox(-24.3, -13.7, 0, W, 5.95, 6.25);
    // Левая стена (x = -24)
    box(g, 0.25, W, 12.3, -24.1, W / 2, 0, WALL);
    w.addColliderBox(-24.25, -23.95, 0, W, -6.2, 6.2);
    // Правая стена (x = -14) с дверным проёмом z 1.0..2.4
    box(g, 0.25, W, 7.0, -14.1, W / 2, -2.5, WALL);
    w.addColliderBox(-14.25, -13.95, 0, W, -6.2, 1.0);
    box(g, 0.25, W, 3.6, -14.1, W / 2, 4.2, WALL);
    w.addColliderBox(-14.25, -13.95, 0, W, 2.4, 6.2);
    // Перемычка над проёмом
    box(g, 0.25, 1.0, 1.4, -14.1, W - 0.5, 1.7, WALL);
    // Косяки проёма (подсветка входа)
    box(g, 0.3, 2.6, 0.08, -14.1, 1.3, 1.0, 0x9aa0a6);
    box(g, 0.3, 2.6, 0.08, -14.1, 1.3, 2.4, 0x9aa0a6);
    // Потолок
    const ceil = box(g, 10.3, 0.2, 12.3, -19, W + 0.1, 0, 0xdfe3e6);
    ceil.receiveShadow = true;

    // Стеллаж для СИЗ (стеллаж + полки)
    const rackX = -22.6;
    box(g, 0.1, 2.1, 0.1, rackX, 1.05, -2.6, 0x5b5f66);
    box(g, 0.1, 2.1, 0.1, rackX, 1.05, 0.6, 0x5b5f66);
    box(g, 0.6, 0.06, 2.1, rackX + 0.25, 1.0, -1.0, 0x8a8f96);
    box(g, 0.6, 0.06, 2.1, rackX + 0.25, 1.62, -1.0, 0x8a8f96);
    // информационный щит на стеллаже
    box(g, 0.06, 0.5, 1.2, rackX - 0.05, 1.3, -1.0, 0x2f6fb0);

    // Рабочий стол под кейс
    const tX = -17.6, tZ = -4.2, tY = 0.9;
    box(g, 1.8, 0.08, 0.9, tX, tY, tZ, 0x8b8f94);
    box(g, 0.08, tY, 0.08, tX - 0.8, tY / 2, tZ - 0.35, 0x5b5f66);
    box(g, 0.08, tY, 0.08, tX + 0.8, tY / 2, tZ - 0.35, 0x5b5f66);
    box(g, 0.08, tY, 0.08, tX - 0.8, tY / 2, tZ + 0.35, 0x5b5f66);
    box(g, 0.08, tY, 0.08, tX + 0.8, tY / 2, tZ + 0.35, 0x5b5f66);
    w.addColliderBox(tX - 0.9, tX + 0.9, 0, tY, tZ - 0.45, tZ + 0.45);

    // Стойка приёма/выдачи инструмента (сдача на склад)
    const cX = -15.6, cZ = 4.6;
    box(g, 1.4, 0.06, 0.8, cX, 1.05, cZ, 0x9a6b3f);
    box(g, 1.3, 1.0, 0.06, cX, 0.5, cZ - 0.4, 0x8a8f96);
    box(g, 0.08, 1.05, 0.08, cX - 0.62, 0.52, cZ + 0.35, 0x5b5f66);
    box(g, 0.08, 1.05, 0.08, cX + 0.62, 0.52, cZ + 0.35, 0x5b5f66);
    const cPlate = box(g, 1.3, 0.45, 0.06, cX, 2.0, cZ - 0.4, 0x2f6fb0);
    w.addInteractable({
      id: 'handover', label: 'Стойка приёма инструмента', handler: 'handover',
      prompt: 'Сдать инструмент и патроны на склад',
      meshes: [cPlate], range: 3.6
    });
    w.addColliderBox(cX - 0.7, cX + 0.7, 0, 1.1, cZ - 0.45, cZ + 0.45);

    // Стол для мелкого ремонта/замены неисправного пистолета
    const rX = -16.4, rZ = -0.6;
    box(g, 0.9, 0.08, 0.7, rX, 1.0, rZ, 0x8b8f94);
    box(g, 0.07, 1.0, 0.07, rX - 0.38, 0.5, rZ - 0.28, 0x5b5f66);
    box(g, 0.07, 1.0, 0.07, rX + 0.38, 0.5, rZ - 0.28, 0x5b5f66);
    box(g, 0.07, 1.0, 0.07, rX - 0.38, 0.5, rZ + 0.28, 0x5b5f66);
    box(g, 0.07, 1.0, 0.07, rX + 0.38, 0.5, rZ + 0.28, 0x5b5f66);
    const rPlate = box(g, 0.55, 0.2, 0.05, rX, 1.18, rZ, 0xc9a227);
    w.addInteractable({
      id: 'gun_rack', label: 'Стол обменного фонда', handler: 'replace_gun',
      prompt: 'Сдать неисправный пистолет и получить исправный',
      meshes: [rPlate], range: 3.2
    });
    w.addColliderBox(rX - 0.45, rX + 0.45, 0, 1.0, rZ - 0.35, rZ + 0.35);
  }


  /* ------------------------------------------------------------------ *
   *  Склад: СИЗ на стеллаже, кейс с пистолетом, патроны и дюбели
   * ------------------------------------------------------------------ */
  function buildStorage(w) {
    const g = new THREE.Group();
    w.group.add(g);
    const rX = -22.3;

    function helmet(z, color, muffs, id, item, prompt, ok) {
      const grp = new THREE.Group();
      grp.position.set(rX, 1.66, z);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(color));
      dome.castShadow = true; dome.receiveShadow = true;
      grp.add(dome);
      cyl(grp, 0.16, 0.16, 0.02, 0, 0.01, 0, color, { seg: 18 });
      if (muffs) {
        cyl(grp, 0.055, 0.055, 0.035, -0.145, 0.075, 0, 0x2a2f36, { rotZ: Math.PI / 2, seg: 12 });
        cyl(grp, 0.055, 0.055, 0.035, 0.145, 0.075, 0, 0x2a2f36, { rotZ: Math.PI / 2, seg: 12 });
        box(grp, 0.34, 0.02, 0.03, 0, 0.13, 0, 0x2a2f36);
      }
      g.add(grp);
      w.addInteractable({ id: id, label: prompt, handler: 'ppe', prompt: prompt,
        data: { item: item, ok: ok }, meshes: [grp] });
    }
    helmet(-1.6, 0xf3c02a, true, 'ppe_helmet', 'helmet', 'Взять каску с наушниками (голова + слух)', true);
    helmet(-1.2, 0xe8e8e8, false, 'ppe_helmet_bad', 'helmet_bad', 'Взять каску без наушников', false);

    // защитные очки
    (function () {
      const grp = new THREE.Group();
      grp.position.set(rX, 1.72, -0.78);
      const lens = mat(0x9fd7ff, { opacity: 0.75, roughness: 0.25 });
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.05), lens);
      l1.position.set(-0.06, 0, 0); grp.add(l1);
      const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.05), lens);
      l2.position.set(0.06, 0, 0); grp.add(l2);
      box(grp, 0.05, 0.035, 0.045, 0, 0, 0, 0x3a3f45);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 22), mat(0x22262b));
      strap.rotation.y = Math.PI / 2; strap.castShadow = true;
      grp.add(strap);
      g.add(grp);
      w.addInteractable({ id: 'ppe_goggles', label: 'Защитные очки', handler: 'ppe',
        prompt: 'Взять защитные очки (защита зрения)', data: { item: 'goggles', ok: true }, meshes: [grp] });
    })();

    // полнолицевая маска с патроном (неверный выбор)
    (function () {
      const grp = new THREE.Group();
      grp.position.set(rX, 1.66, -0.36);
      const mask = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI), mat(0x2f343a));
      mask.castShadow = true;
      grp.add(mask);
      cylZ(grp, 0.022, 0.08, 0, 0, 0.17, 0xd8c33a, { seg: 10 });
      g.add(grp);
      w.addInteractable({ id: 'ppe_mask_bad', label: 'Полнолицевая маска', handler: 'ppe',
        prompt: 'Взять полнолицевую маску с патроном', data: { item: 'mask', ok: false }, meshes: [grp] });
    })();

    // спецодежда (комбинезон)
    (function () {
      const grp = new THREE.Group();
      grp.position.set(rX, 1.1, -1.5);
      box(grp, 0.32, 0.14, 0.34, 0, 0, 0, 0x2c4a76);
      box(grp, 0.32, 0.02, 0.34, 0, 0.08, 0, 0x3c6296);
      box(grp, 0.3, 0.03, 0.1, 0, 0.1, 0, 0x24395c);
      g.add(grp);
      w.addInteractable({ id: 'ppe_suit', label: 'Спецодежда', handler: 'ppe',
        prompt: 'Взять спецодежду (комбинезон)', data: { item: 'suit', ok: true }, meshes: [grp] });
    })();

    // краги
    (function () {
      const grp = new THREE.Group();
      grp.position.set(rX, 1.1, -0.92);
      box(grp, 0.1, 0.075, 0.2, 0, 0, -0.05, 0xc25a1e, { rotY: 0.18 });
      box(grp, 0.1, 0.075, 0.2, 0, 0, 0.15, 0xc25a1e, { rotY: -0.12 });
      g.add(grp);
      w.addInteractable({ id: 'ppe_kraga', label: 'Краги', handler: 'ppe',
        prompt: 'Взять краги (защита рук)', data: { item: 'kraga', ok: true }, meshes: [grp] });
    })();

    buildCaseAndGun(w);
    w.ammo = {};
  }

  /* ------------------------------------------------------------------ *
   *  Пистолет (примитивы) и кейс
   * ------------------------------------------------------------------ */
  function buildGunMesh() {
    const gun = new THREE.Group();
    const DARK = 0x33383f, STEEL = 0x646e79;
    const body = box(gun, 0.075, 0.1, 0.16, 0, -0.01, 0.045, DARK);
    const grip = box(gun, 0.055, 0.155, 0.075, 0, 0.005, 0.06, 0x2a2f36, { rotX: -0.3, cast: true });
    box(gun, 0.03, 0.02, 0.08, 0, -0.08, -0.005, DARK);
    box(gun, 0.013, 0.04, 0.013, 0, -0.062, 0.0, 0x9aa2ab);
    box(gun, 0.02, 0.03, 0.09, 0.05, -0.045, 0.03, 0x50565e);

    const barrelGroup = new THREE.Group();
    barrelGroup.position.set(0, -0.005, -0.03);
    gun.add(barrelGroup);
    cylZ(barrelGroup, 0.028, 0.05, 0, 0, -0.005, 0x4a5158, { seg: 12 });
    cylZ(barrelGroup, 0.021, 0.3, 0, 0, -0.14, STEEL, { seg: 12 });
    cylZ(barrelGroup, 0.032, 0.055, 0, 0, -0.315, 0x2f343a, { seg: 12 });
    const cart = cylZ(barrelGroup, 0.024, 0.055, 0, 0, -0.02, 0xd8c33a, { seg: 12 });
    const shell = cylZ(barrelGroup, 0.024, 0.05, 0, 0, -0.02, 0xb08d3a, { seg: 12 });
    const dowel = cylZ(barrelGroup, 0.012, 0.2, 0, 0, -0.32, 0x9aa2ab, { seg: 10 });
    cart.visible = false; shell.visible = false; dowel.visible = false;
    gun.userData.parts = { cart: cart, shell: shell, dowel: dowel, barrelGroup: barrelGroup, body: body, grip: grip };
    return gun;
  }

  function buildCaseAndGun(w) {
    const caseGroup = new THREE.Group();
    caseGroup.position.set(-17.6, 1.02, -4.2);
    caseGroup.rotation.y = Math.PI / 2;
    w.group.add(caseGroup);
    w.caseGroup = caseGroup;

    const BODY = 0x3c4149, IN = 0x2a2e34;
    const bottom = box(caseGroup, 0.58, 0.03, 0.38, 0, -0.085, 0, BODY);
    box(caseGroup, 0.03, 0.16, 0.38, -0.275, 0, 0, BODY);
    box(caseGroup, 0.03, 0.16, 0.38, 0.275, 0, 0, BODY);
    box(caseGroup, 0.52, 0.16, 0.03, 0, 0, -0.175, BODY);
    box(caseGroup, 0.52, 0.16, 0.03, 0, 0, 0.175, BODY);
    box(caseGroup, 0.52, 0.06, 0.32, 0, -0.055, 0, IN);
    const handle = box(caseGroup, 0.16, 0.035, 0.035, 0, 0.0, 0.21, 0x22262b);

    const lid = new THREE.Group();
    lid.position.set(0, 0.08, -0.19);
    caseGroup.add(lid);
    const lidMesh = box(lid, 0.58, 0.03, 0.38, 0, 0, 0.19, BODY);
    box(lid, 0.5, 0.02, 0.3, 0, -0.022, 0.19, IN);
    box(lid, 0.05, 0.03, 0.03, 0, -0.02, 0.375, 0xc9a227);
    w.caseLid = lid;

    const cartBoxG = new THREE.Group();
    cartBoxG.position.set(-0.16, -0.015, -0.08);
    caseGroup.add(cartBoxG);
    box(cartBoxG, 0.18, 0.08, 0.11, 0, 0, 0, 0xb03030);
    box(cartBoxG, 0.18, 0.025, 0.11, 0, 0.05, 0, 0xd8c33a);
    const dowelBoxG = new THREE.Group();
    dowelBoxG.position.set(-0.16, -0.015, 0.08);
    caseGroup.add(dowelBoxG);
    box(dowelBoxG, 0.16, 0.08, 0.12, 0, 0, 0, 0x2f6fb0);
    box(dowelBoxG, 0.16, 0.025, 0.12, 0, 0.05, 0, 0x9aa2ab);

    const gun = buildGunMesh();
    w.gun = gun;
    w.gunParts = gun.userData.parts;
    caseGroup.add(gun);
    gun.position.set(0.05, -0.005, 0.0);
    gun.rotation.set(0, -Math.PI / 2, 0);

    w.addInteractable({ id: 'case_lid', label: 'Кейс', handler: 'case',
      prompt: 'Открыть кейс', meshes: [lidMesh, handle], range: 3.2 });
    w.addInteractable({ id: 'ammo_cartridges', label: 'Патроны', handler: 'take_cartridges',
      prompt: 'Взять патроны (жёлтый, зелёный, красный, чёрный)', meshes: [cartBoxG], range: 3.2 });
    w.addInteractable({ id: 'ammo_dowels', label: 'Дюбели', handler: 'take_dowels',
      prompt: 'Взять дюбели', meshes: [dowelBoxG], range: 3.2 });
    w.addInteractable({ id: 'gun_inspect', label: 'Пистолет', handler: 'gun_inspect',
      prompt: 'Осмотреть пистолет: полуповорот, переламывание', meshes: [w.gunParts.body, w.gunParts.barrelGroup], range: 3.2 });
    w.addInteractable({ id: 'gun_take', label: 'Пистолет (рукоять)', handler: 'gun_take',
      prompt: 'Взять пистолет за рукоять', meshes: [w.gunParts.grip], range: 3.2 });
    w.addInteractable({ id: 'cart_in_barrel', label: 'Патрон в стволе', handler: 'remove_cartridge',
      prompt: 'Извлечь патрон из ствола', meshes: [w.gunParts.cart], range: 3.2, enabled: false });
    w.addInteractable({ id: 'case_body', label: 'Ложемент кейса', handler: 'case_body',
      prompt: 'Положить пистолет в кейс', meshes: [bottom], range: 3.2 });
    w.caseMesh = { group: caseGroup, lid: lid, items: [cartBoxG, dowelBoxG] };
  }

  /* ------------------------------------------------------------------ *
   *  Место работ: стена из силикатного кирпича, разметка, подмости и т.д.
   * ------------------------------------------------------------------ */
  function buildWorkArea(w) {
    const g = new THREE.Group();
    w.group.add(g);
    const BRICK = 0xdcdccf;

    // Стена 6 x 3.2 м с проёмом (x 3.4..4.4, y 1.5..2.3)
    box(g, 6, 1.5, 0.3, 2, 0.75, -9, BRICK);
    box(g, 6, 0.9, 0.3, 2, 2.75, -9, BRICK);
    box(g, 4.4, 0.8, 0.3, 1.2, 1.9, -9, BRICK);
    box(g, 0.6, 0.8, 0.3, 4.7, 1.9, -9, BRICK);
    for (let i = 0; i < 8; i++) box(g, 6.02, 0.02, 0.32, 2, 0.4 + i * 0.4, -9, 0xc4c4b6, { cast: false });
    w.addColliderBox(-1.2, 5.2, 0, 3.2, -9.15, -8.85);

    // Разметка: 2 кронштейна по 2 точки крепления
    const pts = [
      { id: 'A1', x: 0.2 }, { id: 'A2', x: 1.1 }, { id: 'B1', x: 2.0 }, { id: 'B2', x: 2.9 }
    ];
    box(g, 1.3, 1.0, 0.02, 0.65, 2.4, -8.845, 0xc9c7b8, { cast: false });
    box(g, 1.3, 1.0, 0.02, 2.45, 2.4, -8.845, 0xc9c7b8, { cast: false });
    pts.forEach(function (p) {
      const grp = new THREE.Group();
      grp.position.set(p.x, 2.4, -8.83);
      g.add(grp);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 20), mat(0x2b3a8f).clone());
      grp.add(ring);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), mat(0xffffff).clone());
      dot.position.z = 0.004;
      grp.add(dot);
      const dowel = cylZ(grp, 0.012, 0.09, 0, 0, 0.02, 0x9aa2ab, { seg: 8 });
      dowel.visible = false;
      const halfDowel = cylZ(grp, 0.012, 0.24, 0, 0, 0.12, 0x9aa2ab, { seg: 8 });
      halfDowel.visible = false;
      w.points.push({ id: p.id, x: p.x, y: 2.4, z: -8.83, ring: ring, dowel: dowel,
        halfDowel: halfDowel, state: 'empty' });
      w.wallMeshes.push(ring, dot);
      w.pointsInfo.push({ id: p.id, x: p.x, y: 2.4 });
    });

    // Подмости (правильное средство подмащивания)
    const sc = new THREE.Group();
    g.add(sc);
    w.scaffoldGroup = sc;
    const plat = box(sc, 3.9, 0.1, 1.25, 1.45, 0.85, -7.575, 0x8b6b3f);
    const scStep = box(sc, 0.5, 0.05, 0.5, 1.45, 0.45, -7.0, 0x9a9a9a);
    box(sc, 0.08, 0.8, 0.08, -0.35, 0.4, -8.1, 0x6d6d6d);
    box(sc, 0.08, 0.8, 0.08, 3.25, 0.4, -8.1, 0x6d6d6d);
    box(sc, 0.08, 0.8, 0.08, -0.35, 0.4, -7.1, 0x6d6d6d);
    box(sc, 0.08, 0.8, 0.08, 3.25, 0.4, -7.1, 0x6d6d6d);
    box(sc, 3.9, 0.06, 0.06, 1.45, 0.4, -8.1, 0x7d7d7d);
    box(sc, 3.9, 0.06, 0.06, 1.45, 0.4, -7.1, 0x7d7d7d);
    w.addColliderBox(-0.5, 3.4, 0, 0.9, -8.25, -6.9);
    w.addInteractable({ id: 'scaffold', label: 'Подмости', handler: 'climb_scaffold',
      prompt: 'Подняться на подмости', meshes: [plat, scStep], range: 3.8 });

    // Стремянка (запрещена при производстве выстрела)
    const ld = new THREE.Group();
    ld.position.set(-3.3, 0, -7.6);
    g.add(ld);
    w.ladderGroup = ld;
    box(ld, 0.07, 1.35, 0.07, -0.2, 0.68, -0.22, 0xb0b0b0);
    box(ld, 0.07, 1.35, 0.07, 0.2, 0.68, -0.22, 0xb0b0b0);
    box(ld, 0.07, 1.35, 0.07, -0.2, 0.68, 0.22, 0xb0b0b0);
    box(ld, 0.07, 1.35, 0.07, 0.2, 0.68, 0.22, 0xb0b0b0);
    for (let i = 0; i < 4; i++) box(ld, 0.5, 0.05, 0.5, 0, 0.3 + i * 0.27, 0, 0xa8a8a8);
    const ldTop = box(ld, 0.55, 0.05, 0.55, 0, 1.15, 0, 0x8f8f8f);
    w.addColliderBox(-3.6, -3.0, 0, 1.15, -7.9, -7.3);
    w.addInteractable({ id: 'ladder', label: 'Стремянка', handler: 'climb_ladder',
      prompt: 'Подняться на стремянку (выстрел с неё запрещён)', meshes: [ldTop], range: 3.6 });
    w.ladderTop = 1.15;

    // Контейнер с водой (для патрона после осечки)
    const wb = new THREE.Group();
    wb.position.set(5.7, 0, -6.2);
    g.add(wb);
    cyl(wb, 0.33, 0.30, 0.85, 0, 0.42, 0, 0x2f6fb0, { seg: 20 });
    const water = cyl(wb, 0.28, 0.28, 0.06, 0, 0.82, 0, 0x7fc6ff, { seg: 20, opacity: 0.85, roughness: 0.2 });
    w.addColliderBox(5.35, 6.05, 0, 0.85, -6.55, -5.85);
    w.addInteractable({ id: 'water_barrel', label: 'Контейнер с водой', handler: 'water_barrel',
      prompt: 'Опустить патрон после осечки в воду', meshes: [water], range: 3.2 });

    // Мусорка
    const tb = new THREE.Group();
    tb.position.set(-3.6, 0, -6.4);
    g.add(tb);
    const bin = cyl(tb, 0.27, 0.24, 0.95, 0, 0.47, 0, 0x5f6469, { seg: 18 });
    cyl(tb, 0.29, 0.29, 0.06, 0, 0.97, 0, 0x3f4449, { seg: 18 });
    w.addColliderBox(-3.9, -3.3, 0, 0.95, -6.7, -6.1);
    w.addInteractable({ id: 'trash_bin', label: 'Мусорка', handler: 'trash_bin',
      prompt: 'Выбросить в мусорку', meshes: [bin], range: 3.0 });

    // Коробка для стреляных гильз
    const sb = new THREE.Group();
    sb.position.set(-1.1, 0, -5.4);
    g.add(sb);
    const sbBody = box(sb, 0.5, 0.3, 0.36, 0, 0.15, 0, 0x8a6a3a);
    const sbLid = box(sb, 0.52, 0.03, 0.38, 0, 0.31, 0, 0xa07c44);
    w.shellBoxGroup = sb;
    w.addColliderBox(-1.35, -0.85, 0, 0.3, -5.6, -5.2);
    w.addInteractable({ id: 'shell_box', label: 'Ящик для гильз', handler: 'shell_box',
      prompt: 'Положить гильзу в ящик для гильз', meshes: [sbBody], range: 3.0 });
    w.addInteractable({ id: 'shell_box_take', label: 'Ящик с гильзами', handler: 'shell_box_take',
      prompt: 'Забрать ящик с гильзами', meshes: [sbLid], range: 3.0, enabled: false });

    // Штабель ограждений опасной зоны
    const fs = new THREE.Group();
    fs.position.set(-5.2, 0, -5.2);
    fs.rotation.y = 0.4;
    g.add(fs);
    w.fenceStack = fs;
    for (let i = 0; i < 5; i++) {
      box(fs, 2.0, 0.06, 0.3, 0, 0.05 + i * 0.09, 0, (i % 2 ? 0xc93a2f : 0xd94a3a));
      box(fs, 0.06, 0.34, 0.06, -0.95, 0.2 + i * 0.09, 0, 0x8a8a8a);
      box(fs, 0.06, 0.34, 0.06, 0.95, 0.2 + i * 0.09, 0, 0x8a8a8a);
    }
    w.addColliderBox(-6.3, -4.1, 0, 0.5, -5.6, -4.8);
    w.addInteractable({ id: 'fence_stack', label: 'Ограждения', handler: 'fence_deploy',
      prompt: 'Выставить ограждение опасной зоны (15 м)', meshes: [fs], range: 4.5 });

  }

  /* ------------------------------------------------------------------ *
   *  Работники (примитивы): двое за стеной + входящий в опасную зону
   * ------------------------------------------------------------------ */
  function makeWorker(vest) {
    const grp = new THREE.Group();
    box(grp, 0.13, 0.78, 0.15, -0.1, 0.39, 0, 0x33405c);
    box(grp, 0.13, 0.78, 0.15, 0.1, 0.39, 0, 0x33405c);
    box(grp, 0.42, 0.62, 0.26, 0, 1.06, 0, 0x2f4a7a);
    box(grp, 0.44, 0.42, 0.28, 0, 1.12, 0, vest);
    box(grp, 0.11, 0.55, 0.13, -0.27, 1.05, 0, 0x2f4a7a);
    box(grp, 0.11, 0.55, 0.13, 0.27, 1.05, 0, 0x2f4a7a);
    sphere(grp, 0.115, 0, 1.5, 0, 0xd9a679, { seg: 12, seg2: 10 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf3c02a));
    dome.position.set(0, 1.53, 0); dome.castShadow = true;
    grp.add(dome);
    return grp;
  }

  function buildWorkers(w) {
    const g = new THREE.Group();
    w.group.add(g);
    w.workers = [];
    const data = [
      { id: 'worker_1', x: 3.72, z: -10.35, vest: 0xff8c1a, prompt: 'Убрать работника из опасной зоны' },
      { id: 'worker_2', x: 4.18, z: -10.9, vest: 0xffd21a, prompt: 'Убрать работника из опасной зоны' }
    ];
    data.forEach(function (d) {
      const grp = makeWorker(d.vest);
      grp.position.set(d.x, 0, d.z);
      grp.rotation.y = Math.PI;
      g.add(grp);
      const it = w.addInteractable({ id: d.id, label: 'Работник за стеной', handler: 'remove_person',
        prompt: d.prompt, meshes: [grp], range: 6.5 });
      w.workers.push({ id: d.id, group: grp, interact: it, leaving: null, removed: false });
    });

    // работник на площадке, мимо которого проходят с инструментом
    const pass = makeWorker(0xffe14d);
    pass.position.set(-10.5, 0, -1.5);
    pass.rotation.y = -Math.PI / 2;
    g.add(pass);
    w.addInteractable({ id: 'worker_pass', label: 'Работник на площадке', handler: 'person_idle',
      prompt: 'Работник на площадке (не направляйте на него инструмент)', meshes: [pass], range: 6.0 });

    w.removeWorker = function (id) {
      const wk = w.workers.filter(function (x) { return x.id === id; })[0];
      if (!wk || wk.removed) return false;
      wk.removed = true;
      wk.leaving = { t: 0, dir: new THREE.Vector3(wk.group.position.x > 4 ? 1 : -1, 0, 1.4).normalize() };
      wk.interact.enabled = false;
      return true;
    };

    w.spawnEnteringWorker = function () {
      const grp = makeWorker(0xff4d4d);
      grp.position.set(-6.5, 0, -12.5);
      g.add(grp);
      w.entering = { group: grp, t: 0, target: new THREE.Vector3(2, 0, -9) };
      return grp;
    };

    w.updateNpc = function (dt) {
      w.workers.forEach(function (wk) {
        if (!wk.leaving) return;
        wk.leaving.t += dt;
        wk.group.position.addScaledVector(wk.leaving.dir, 1.15 * dt);
        wk.group.position.y = Math.abs(Math.sin(wk.leaving.t * 9)) * 0.035;
        wk.group.rotation.y = Math.atan2(wk.leaving.dir.x, wk.leaving.dir.z);
        if (wk.leaving.t > 5) wk.group.visible = false;
      });
      if (w.entering) {
        const e = w.entering;
        e.t += dt;
        const dir = e.target.clone().sub(e.group.position);
        const dist = dir.length();
        dir.normalize();
        e.group.rotation.y = Math.atan2(dir.x, dir.z);
        if (dist > 0.3) e.group.position.addScaledVector(dir, 1.6 * dt);
        e.group.position.y = Math.abs(Math.sin(e.t * 10)) * 0.04;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  Ограждение опасной зоны + дождь
   * ------------------------------------------------------------------ */
  function buildFenceAndRain(w) {
    const f = new THREE.Group();
    f.visible = false;
    w.group.add(f);
    w.fenceGroup = f;

    const panels = [
      { x: -0.5, z: -14.0, r: 0 }, { x: 4.5, z: -14.0, r: 0 },
      { x: 7.0, z: -11.5, r: Math.PI / 2 }, { x: 7.0, z: -6.5, r: Math.PI / 2 },
      { x: -0.5, z: -4.0, r: 0 }, { x: 4.5, z: -4.0, r: 0 },
      { x: -3.0, z: -6.5, r: Math.PI / 2 }
    ];
    panels.forEach(function (p) {
      const pn = new THREE.Group();
      pn.position.set(p.x, 0, p.z);
      pn.rotation.y = p.r;
      box(pn, 5, 0.06, 0.06, 0, 1.08, 0, 0xd23b3b);
      box(pn, 5, 0.06, 0.06, 0, 0.62, 0, 0xd23b3b);
      box(pn, 5, 0.06, 0.06, 0, 0.16, 0, 0xd23b3b);
      for (let i = 0; i < 7; i++) box(pn, 0.05, 1.0, 0.05, -2.1 + i * 0.7, 0.62, 0, 0xc0322c);
      box(pn, 0.09, 1.2, 0.09, -2.45, 0.6, 0, 0x8a8a8a);
      box(pn, 0.09, 1.2, 0.09, 2.45, 0.6, 0, 0x8a8a8a);
      box(pn, 0.6, 0.06, 0.5, -2.45, 0.03, 0, 0x707070);
      box(pn, 0.6, 0.06, 0.5, 2.45, 0.03, 0, 0x707070);
      f.add(pn);
    });
    w.addInteractable({ id: 'fence_deployed', label: 'Ограждение', handler: 'fence_remove',
      prompt: 'Убрать ограждение', meshes: [f], range: 6.0, enabled: false });

    // Дождь (после последнего выстрела)
    const N = 1500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = 2 + (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 14;
      pos[i * 3 + 2] = -9 + (Math.random() - 0.5) * 32;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xbcd6ee, size: 0.055, transparent: true, opacity: 0.75 });
    const rain = new THREE.Points(geo, rainMat);
    rain.visible = false;
    rain.frustumCulled = false;
    w.group.add(rain);
    w.rain = rain;

    w.updateRain = function (dt) {
      if (!w.rain.visible) return;
      const arr = w.rain.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= 15 * dt;
        if (arr[i + 1] < 0) arr[i + 1] = 14;
      }
      w.rain.geometry.attributes.position.needsUpdate = true;
    };
  }





  return { build: build, mat: mat, box: box, cyl: cyl, cylZ: cylZ, sphere: sphere };
})();
