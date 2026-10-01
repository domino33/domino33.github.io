/* ============================================================================
 *  test/smoke.js — автономная проверка логики тренажёра без браузера.
 *  Подменяет THREE и DOM минимальными заглушками и прогоняет полный сценарий:
 *  СИЗ -> проверка пистолета -> патроны/дюбели -> перенос -> ограждение ->
 *  вывод людей -> подмости -> 4 выстрела (с осечкой) -> дождь -> уборка -> сдача.
 *
 *  Запуск:  node test/smoke.js
 * ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ----------------------------- Заглушка THREE ---------------------------- */
class V3 {
  constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  normalize() { const l = this.length() || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
  lerpVectors(a, b, t) {
    this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this;
  }
}
class V2 { constructor(x, y) { this.x = x || 0; this.y = y || 0; } set(x, y) { this.x = x; this.y = y; return this; } }

function makeEuler() {
  return { x: 0, y: 0, z: 0, order: 'XYZ', set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } };
}

class Obj {
  constructor() {
    this.children = []; this.parent = null; this.position = new V3();
    this.rotation = makeEuler(); this.scale = new V3(1, 1, 1);
    this.visible = true; this.userData = {}; this.isObject3D = true;
  }
  add(o) { if (o.parent) o.parent.remove(o); o.parent = this; this.children.push(o); return this; }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); return this; }
  traverse(cb) { cb(this); this.children.forEach(function (c) { c.traverse(cb); }); }
  updateWorldMatrix() { } updateMatrixWorld() { }
  getWorldDirection(t) { return t.set(0, 0, -1); }
}
class Mesh extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; } }
class Points extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Scene extends Obj { constructor() { super(); this.background = null; this.fog = null; } }
class Light extends Obj {
  constructor() { super(); this.shadow = { mapSize: { set() { } }, camera: {}, bias: 0 }; this.target = new Obj(); this.intensity = 1; }
}
class Camera extends Obj {
  constructor(fov, aspect, near, far) { super(); this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; }
  updateProjectionMatrix() { }
  getWorldDirection(t) {
    const cp = Math.cos(this.rotation.x);
    return t.set(-Math.sin(this.rotation.y) * cp, Math.sin(this.rotation.x), -Math.cos(this.rotation.y) * cp);
  }
}
class Geo {
  constructor() { this.attributes = {}; this.parameters = {}; }
  setAttribute(k, a) { this.attributes[k] = a; }
  dispose() { }
}
class BufAttr { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.needsUpdate = false; } }
class Color { constructor(v) { this.v = v; } set(v) { this.v = v; return this; } getHex() { return this.v; } }
class Material {
  constructor(o) { Object.assign(this, o || {}); this.color = new Color(this.color === undefined ? 0xffffff : this.color); }
  clone() { const m = new Material(); Object.assign(m, this); m.color = new Color(this.color.v); return m; }
}
class Box3 {
  constructor(min, max) { this.min = min || new V3(); this.max = max || new V3(); }
  setFromObject() { this.min = new V3(); this.max = new V3(); return this; }
}
class Raycaster {
  constructor() { this.ray = new Obj(); }
  setFromCamera() { }
  intersectObjects() { return []; }
}

const THREE = {
  Vector2: V2, Vector3: V3, Object3D: Obj, Group: Obj, Mesh: Mesh, Points: Points, Scene: Scene,
  PerspectiveCamera: Camera, HemisphereLight: Light, AmbientLight: Light, DirectionalLight: Light,
  BoxGeometry: Geo, CylinderGeometry: Geo, SphereGeometry: Geo, TorusGeometry: Geo,
  CircleGeometry: Geo, RingGeometry: Geo, PlaneGeometry: Geo, BufferGeometry: Geo,
  BufferAttribute: BufAttr, MeshStandardMaterial: Material, PointsMaterial: Material,
  Box3: Box3, Raycaster: Raycaster, Clock: function () { this.getDelta = function () { return 0.016; }; },
  FrontSide: 0, DoubleSide: 2, PCFSoftShadowMap: 2, Color: Color, Fog: function () { },
  WebGLRenderer: function () { }
};

/* ------------------------------ Заглушка DOM ----------------------------- */
function makeEl(id) {
  const classes = new Set();
  return {
    id: id, textContent: '', innerHTML: '', className: '', style: {}, childNodes: [],
    classList: {
      add: function (c) { classes.add(c); },
      remove: function (c) { classes.delete(c); },
      contains: function (c) { return classes.has(c); },
      toggle: function (c, f) {
        const on = (f === undefined) ? !classes.has(c) : !!f;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      }
    },
    appendChild: function (c) { this.childNodes.push(c); return c; },
    removeChild: function (c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); return c; },
    get firstChild() { return this.childNodes[0] || null; },
    addEventListener: function () { }, setAttribute: function () { },
    getAttribute: function () { return null; }, querySelectorAll: function () { return []; }
  };
}
const els = {};
const document = {
  getElementById: function (id) { return els[id] || (els[id] = makeEl(id)); },
  createElement: function (t) { return makeEl(t); },
  querySelectorAll: function () { return []; },
  addEventListener: function () { },
  exitPointerLock: function () { },
  pointerLockElement: null
};
['load-panel', 'help-panel', 'end-overlay'].forEach(function (id) {
  document.getElementById(id).classList.add('hidden');
});
const window = { addEventListener: function () { }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1 };
const canvas = { requestPointerLock: function () { }, addEventListener: function () { } };

/* ------------------------------- Запуск среды ---------------------------- */
const sandbox = { console: console, THREE: THREE, document: document, window: window, Math: Math, JSON: JSON };
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
['scenario.js', 'ui.js', 'world.js', 'player.js', 'game.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), ctx, { filename: f });
});

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log('  OK   ' + msg);
  else { failures++; console.log('  FAIL ' + msg); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* --------------------------- Создание новой игры ------------------------- */
/* --------------------------- Доступ к модулям из vm ---------------------- */
vm.runInContext('globalThis.API = { World: World, Player: Player, Game: Game, PLAYER: PLAYER, ' +
  'SCENARIO: SCENARIO, UI: UI, scenarioTask: scenarioTask };', ctx);
const API = ctx.API;
API.UI.init();

function newGame() {
  const scene = new THREE.Scene();
  const world = API.World.build(scene);
  const player = new API.Player(canvas);
  const camera = new THREE.PerspectiveCamera(72, 1.78, 0.05, 400);
  const game = new API.Game({ scene: scene, camera: camera, player: player, world: world });
  game.start();
  return { scene: scene, world: world, player: player, camera: camera, game: game };
}
function act(g, id) {
  const it = g.world.getInteractable(id);
  if (!it) throw new Error('нет интерактивного объекта: ' + id);
  if (!it.enabled) throw new Error('объект отключён: ' + id);
  g.game.interact(it);
}
/** Встать на подмости ровно напротив метки и навести ствол на неё. */
function aimAt(g, id) {
  const p = g.world.points.filter(function (x) { return x.id === id; })[0];
  g.player.pos.set(p.x, 0.9, -7.8);
  g.player.supportTop = 0.9;
  g.player.vy = 0;
  g.player.applyToCamera(g.camera);
  const eyeY = g.player.pos.y + API.PLAYER.EYE;
  const dist = -7.8 - p.z;
  g.camera.rotation.y = 0;
  g.camera.rotation.x = Math.atan2(p.y - eyeY, dist);
  g.camera.position.set(g.player.pos.x, eyeY, g.player.pos.z);
  g.game.update(0.016);
}
function shoot(g, id, color) {
  aimAt(g, id);
  g.game.loadDowel();
  g.game.loadCartridge(color);
  g.game.fire();
  g.game.update(0.016);
}
function step(g, seconds) {
  for (let t = 0; t < seconds; t += 0.016) g.game.update(0.016);
}
function sceneToWork(g) {
  g.player.pos.set(-12, 0, 1.6);
  g.game.update(0.016);
  act(g, 'fence_stack');
  act(g, 'worker_1');
  act(g, 'worker_2');
  act(g, 'scaffold');
  for (let i = 0; i < 60; i++) g.player.update(0.016, g.world.colliders);
}

/* =========================== ПРОГОН СЦЕНАРИЯ ============================= */
let G = null;
section('Этап 1. Склад: СИЗ, проверка пистолета, патроны и дюбели');
{
  const g = newGame();
  const st = g.game.state;
  ok(g.world.interactables.length > 25, 'сцена собрана, интерактивных объектов: ' + g.world.interactables.length);
  ok(g.world.points.length === 4, 'на стене 4 размеченные точки крепления');
  ok(g.world.colliders.length > 15, 'преград для игрока: ' + g.world.colliders.length);

  act(g, 'ppe_helmet_bad');
  ok(!st.ppe.helmet, 'неверный выбор СИЗ не принимается');
  ['ppe_helmet', 'ppe_goggles', 'ppe_suit', 'ppe_kraga'].forEach(function (id) { act(g, id); });
  ok(g.game.ppeComplete(), 'комплект СИЗ собран (каска с наушниками, очки, спецодежда, краги)');

  const gun = st.gun;
  ok(!g.world.getInteractable('gun_inspect').enabled, 'закрытый кейс: пистолет недоступен');
  act(g, 'case_lid');
  ok(st.caseOpen, 'кейс открыт');
  act(g, 'gun_inspect');
  ok(gun.inspected && gun.hasCartridge, 'осмотрен: в стволе обнаружен патрон');
  act(g, 'cart_in_barrel');
  ok(!gun.hasCartridge && st.ammo.yellow === 5, 'патрон извлечён из ствола и возвращён в запас');
  act(g, 'ammo_cartridges');
  act(g, 'ammo_dowels');
  ok(st.inv.cartridgesTaken && st.inv.dowelsTaken, 'патроны и дюбели получены');
  act(g, 'gun_take');
  ok(gun.inHands && gun.taken, 'пистолет взят в руки');
  G = g;
}

section('Этап 2. Ошибки подготовки: выстрел без ограждения и без вывода людей');
{
  const g = newGame();
  // намеренно пропускаем СИЗ и проверку -> проверяем приоритет проверок:
  const st = g.game.state;
  st.ppe = { helmet: true, goggles: true, suit: true, kraga: true };
  st.gun.inspected = true;
  st.gun.hasCartridge = false;
  st.inv.cartridgesTaken = true; st.inv.dowelsTaken = true;
  g.player.pos.set(-6, 0, -6);
  g.game.update(0.016);
  ok(st.site.arrived, 'место работ достигнуто');
  st.gun.inHands = true;
  st.gun.hasCartridge = true; st.gun.cartridge = 'green'; st.gun.hasDowel = true;
  g.game.fire();
  ok(st.ended && st.fatal && /Опасная зона/.test(st.fatal.title), 'без ограждения — ФИАСКО: ' + st.fatal.title);
  ok(g.world.entering !== undefined, 'в опасную зону вошёл работник (NPC)');
}

section('Этап 2. Корректная подготовка рабочего места');
{
  const g = G;
  const st = g.game.state;
  g.player.pos.set(-8, 0, 0);
  g.game.update(0.016);
  ok(st.site.arrived, 'прибытие на место работ');
  ok(!st.ended, 'перенос без случайного выстрела (патрон извлечён при проверке)');
  act(g, 'fence_stack');
  ok(st.site.fence && g.world.fenceGroup.visible, 'ограждение опасной зоны 15 м выставлено');
  ok(g.world.dangerRing.visible, 'разметка опасной зоны 15 м показана');
  act(g, 'worker_1');
  act(g, 'worker_2');
  ok(st.site.peopleCleared === 2, 'двух работников вывели из опасной зоны');
  act(g, 'scaffold');
  for (let i = 0; i < 60; i++) g.player.update(0.016, g.world.colliders);
  ok(g.player.pos.y > 0.85, 'подъём на подмости выполнен (высота ' + g.player.pos.y.toFixed(2) + ' м)');
}

/* ------------------------- Быстрая подготовка для тестов ----------------- */
function fastPrep() {
  const g = newGame();
  const st = g.game.state;
  st.ppe = { helmet: true, goggles: true, suit: true, kraga: true };
  st.gun.inspected = true;
  st.gun.hasCartridge = false;
  st.gun.taken = true;
  st.gun.inHands = true;
  st.inv.cartridgesTaken = true;
  st.inv.dowelsTaken = true;
  g.player.pos.set(-8, 0, 0);
  g.game.update(0.016);
  act(g, 'fence_stack');
  act(g, 'worker_1');
  act(g, 'worker_2');
  act(g, 'scaffold');
  for (let i = 0; i < 60; i++) g.player.update(0.016, g.world.colliders);
  return g;
}

section('Этап 3. Выбор патрона и порядок заряжания');
{
  const g = fastPrep();
  shoot(g, 'A1', 'yellow');
  ok(g.world.points[0].state === 'half' && g.world.points[0].halfDowel.visible,
    'жёлтый патрон слабый: дюбель торчит до половины');
  ok(!g.game.state.ended, 'жёлтый патрон материал не разрушает');
  g.game.reload();
  shoot(g, 'A1', 'green');
  ok(g.game.state.ended && /Разрушение/.test(g.game.state.fatal.title),
    'повторный выстрел не жёлтым — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = fastPrep();
  shoot(g, 'A1', 'red');
  ok(g.game.state.ended && /Разрушение/.test(g.game.state.fatal.title),
    'красный патрон разрушает силикатный кирпич — ФИАСКО');
}
{
  const g = fastPrep();
  shoot(g, 'A1', 'yellow');
  g.game.reload();
  shoot(g, 'A1', 'yellow');
  ok(g.world.points[0].state === 'done' && g.game.state.pointsDone === 1,
    'жёлтый + добивание жёлтым (без дюбеля) — точка закреплена');
}
{
  const g = fastPrep();
  g.game.loadCartridge('green');
  ok(g.game.state.ended && /Выстрел/.test(g.game.state.fatal.title),
    'патрон заряжен до установки дюбеля — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = newGame();
  const st = g.game.state;
  st.gun.hasCartridge = false; st.gun.cartridge = null;   // патрон извлечён при проверке
  st.gun.inHands = true;
  g.game.loadCartridge('green');
  ok(st.ended && /Случайный выстрел/.test(st.fatal.title),
    'заряжание до полной подготовки рабочего места — ФИАСКО: ' + st.fatal.title);
}

section('Этап 3. Производство работ: перезарядка, осечка, 4 точки');
{
  const g = fastPrep();
  g.game.state.pointsDone = 2;
  shoot(g, 'B1', 'green');
  g.game.reload();
  ok(g.game.state.ended && /Выстрел/.test(g.game.state.fatal.title),
    'разряжание раньше 1 минуты после осечки — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = fastPrep();
  g.game.state.pointsDone = 2;
  shoot(g, 'B1', 'green');
  ok(g.game.state.gun.misfired && !g.game.state.ended, 'осечка зафиксирована при переходе ко второму кронштейну');
  g.player.pos.set(2.0, 0.9, -5.0);
  step(g, 1);
  ok(g.game.state.ended && /Выстрел/.test(g.game.state.fatal.title),
    'отрыв пистолета от стены при осечке — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = fastPrep();
  g.game.state.pointsDone = 2;
  shoot(g, 'B1', 'green');
  g.player.onClimb = null;
  act(g, 'ladder');
  ok(g.player.onClimb === null && g.player.pos.y > 0.8, 'во время осечки подъём на стремянку заблокирован');
}

{
  const g = G, st = g.game.state;
  aimAt(g, 'A1');
  g.game.fire();
  ok(!st.ended && st.pointsDone === 0, 'без заряженного патрона выстрела нет');

  g.camera.rotation.x = -1.25;
  g.game.loadDowel();
  g.game.loadCartridge('green');
  g.game.fire();
  ok(st.pointsDone === 0 && !st.ended, 'выстрел без прижатия ствола к метке невозможен');

  shoot(g, 'A1', 'green');
  ok(st.pointsDone === 1, 'точка A1 закреплена зелёным патроном');
  g.game.reload();
  act(g, 'shell_box');
  ok(st.inv.shellsInBox === 1, 'гильза уложена в ящик для гильз');

  shoot(g, 'A2', 'green');
  ok(st.pointsDone === 2, 'точка A2 закреплена — кронштейн A готов');
  g.game.reload();
  act(g, 'shell_box');

  shoot(g, 'B1', 'green');
  ok(st.gun.misfired && !st.ended, 'при переходе ко второму кронштейну — ОСЕЧКА');
  ok(st.pointsDone === 2, 'после осечки точка не закреплена');

  step(g, 62);
  ok(st.gun.misfireT >= 60, 'прошло более 1 минуты после осечки');
  g.game.reload();
  ok(!st.gun.misfired && st.inv.misfireCartridgeInHand, 'инструмент разряжен, патрон после осечки в руке');
  act(g, 'water_barrel');
  ok(st.waterCartridge && !st.inv.misfireCartridgeInHand, 'патрон после осечки опущен в контейнер с водой');

  shoot(g, 'B1', 'green');
  ok(st.pointsDone === 3, 'точка B1 закреплена после устранения осечки');
  g.game.reload();
  act(g, 'shell_box');
  shoot(g, 'B2', 'green');
  ok(st.pointsDone === 4, 'четыре точки закреплены — оба кронштейна установлены');
  ok(st.stage4 && g.world.rain.visible, 'начался дождь (этап 4)');
}

section('Этап 4. Окончание работ: дождь, уборка инструмента, гильзы, сдача');
{
  const g = G, st = g.game.state;
  act(g, 'case_body');
  ok(st.gun.inHands, 'пистолет с гильзой в стволе в кейс не убирается');
  g.game.reload();
  ok(st.inv.shells === 1, 'гильза извлечена и осталась в руке');
  act(g, 'shell_box');
  act(g, 'shell_box_take');
  ok(st.inv.boxTaken && st.inv.shellsInBox === 0, 'ящик с гильзами забран');
  act(g, 'case_body');
  ok(!st.gun.inHands && st.gun.placedInCase, 'разряженный пистолет убран в кейс');
  act(g, 'case_lid');
  ok(!st.caseOpen, 'кейс с патронами закрыт — вода в патроны не попала');
  act(g, 'fence_deployed');
  ok(!st.site.fence && !g.world.fenceGroup.visible, 'ограждение опасной зоны убрано');
  act(g, 'water_barrel');
  ok(st.inv.waterCollected, 'патрон после осечки забран из контейнера с водой');
  act(g, 'handover');
  ok(st.ended && !st.fatal, 'инструмент и расходные материалы сданы на склад — тренажёр пройден');
  console.log('  Замечания (' + st.violations.length + '):');
  st.violations.forEach(function (v) { console.log('    - ' + v.text); });
}

section('Проверка остальных ФИАСКО');
{
  const g = fastPrep();
  g.game.state.ppe.kraga = false;
  g.game.loadDowel();
  g.game.loadCartridge('green');
  g.game.fire();
  ok(g.game.state.ended && /СИЗ/.test(g.game.state.fatal.title),
    'выстрел без СИЗ — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = fastPrep();
  act(g, 'scaffold');                       // спуск с подмостей
  for (let i = 0; i < 60; i++) g.player.update(0.016, g.world.colliders);
  act(g, 'ladder');                         // подъём на стремянку
  for (let i = 0; i < 60; i++) g.player.update(0.016, g.world.colliders);
  ok(g.player.pos.y > 1.0, 'подъём на стремянку выполнен (' + g.player.pos.y.toFixed(2) + ' м)');
  g.game.loadDowel();
  g.game.loadCartridge('green');
  g.game.update(0.016);
  g.game.fire();
  ok(g.game.state.ended && /стремянки/.test(g.game.state.fatal.title),
    'выстрел со стремянки — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = newGame();
  act(g, 'case_lid');
  act(g, 'gun_take');
  ok(g.game.state.gun.broken, 'взятие пистолета без осмотра: инструмент развалился на две части');
  ok(g.game.state.violations.length === 1, 'зафиксировано нарушение порядка осмотра');
  act(g, 'gun_rack');
  ok(!g.game.state.gun.broken && g.game.state.gun.inHands, 'неисправный пистолет заменён на исправный');
}
{
  const g = newGame();
  act(g, 'case_lid');
  act(g, 'gun_inspect');
  act(g, 'cart_in_barrel');
  act(g, 'gun_take');
  g.player.pos.set(-6, 0, -4);
  g.game.update(0.016);
  ok(!g.game.state.ended, 'перенос разряженного инструмента безопасен');
}
{
  const g = fastPrep();
  g.game.state.pointsDone = 4;
  g.game.state.stage4 = true;
  g.player.pos.set(-6, 0, -4);
  g.game.update(0.016);
  g.game.state.gun.hasCartridge = true;
  g.game.state.gun.cartridge = 'green';
  act(g, 'case_lid');
  act(g, 'case_body');
  ok(g.game.state.ended && /Выстрел в кейсе/.test(g.game.state.fatal.title),
    'уборка заряженного инструмента в кейс — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = fastPrep();
  g.game.state.gun.misfireCartridge = 'green';
  g.game.state.inv.misfireCartridgeInHand = true;
  act(g, 'trash_bin');
  ok(g.game.state.ended && /Воспламенение/.test(g.game.state.fatal.title),
    'патрон после осечки выброшен в мусорку — ФИАСКО: ' + g.game.state.fatal.title);
}
{
  const g = fastPrep();
  shoot(g, 'A1', 'green');
  g.game.reload();
  g.game.dropToFloor();
  ok(g.game.state.floorShells.length === 1, 'гильзы можно выбросить на пол (нужно собирать)');
  act(g, 'floor_shell_1');
  ok(g.game.state.floorShells.length === 0 && g.game.state.inv.shells === 1, 'гильза поднята с пола');
}
{
  const g = fastPrep();
  shoot(g, 'A1', 'green');
  ok(g.game.state.gun.hasShell, 'после выстрела гильза остаётся в стволе');
  g.game.reload();
  ok(!g.game.state.gun.hasShell && g.game.state.inv.shells === 1, 'перезарядка: гильза извлечена (R)');
}

console.log('\n=========================================');
console.log(failures === 0 ? 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : 'ПРОВАЛЕНО ПРОВЕРОК: ' + failures);
console.log('=========================================');
process.exit(failures === 0 ? 0 : 1);


