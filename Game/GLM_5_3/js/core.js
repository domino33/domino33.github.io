/* ============================================================
   ЯДРО: рендерер, сцена, камера, свет, общие материалы,
   система интерактивов (рейкаст)
   ============================================================ */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding; // API r149
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfc9d0);
scene.fog = new THREE.Fog(0xbfc9d0, 45, 150);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 300);
camera.rotation.order = 'YXZ';
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xd6dee4, 0x74786f, .95));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
sun.position.set(18, 26, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
sun.shadow.normalBias = .03;
scene.add(sun);
const sunTarget = new THREE.Object3D();
scene.add(sunTarget);
sun.target = sunTarget;

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- общие материалы и утилиты ---------- */
const matSteel = new THREE.MeshStandardMaterial({ color: 0x8d939b, roughness: .35, metalness: .8 });
const matWood  = new THREE.MeshStandardMaterial({ color: 0xb98a4f, roughness: .8 });
const matYel   = new THREE.MeshStandardMaterial({ color: 0xe0a516, roughness: .5, metalness: .3 });
const matDark  = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: .6 });
const matBrass = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: .3, metalness: .9 });
const B = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

/* ---------- система интерактивов ----------
   regInter(obj, labelFn, actFn, isNpc) — кликабельный объект
     labelFn() -> строка|null (null = не подсвечивать)
     actFn()   — действие по E/ЛКМ
   regOcc(obj) — объект-преграда для луча (стены и т.п.)
   aim() -> {it, lbl, dist, root} | null — что под прицелом
------------------------------------------------ */
const RAYT = [];

function regInter(obj, label, act, isNpc) {
  const it = { label, act, npc: !!isNpc, dead: false };
  (Array.isArray(obj) ? obj : [obj]).forEach(o =>
    o.traverse(m => { if (m.isMesh) { m.userData.it = it; RAYT.push(m); } }));
  return it;
}
function killInter(it) { it.dead = true; }
function regOcc(obj) {
  obj.traverse(m => { if (m.isMesh) { m.userData.it = { occ: 1 }; RAYT.push(m); } });
}

const _ray = new THREE.Raycaster();
function aim() {
  _ray.setFromCamera({ x: 0, y: 0 }, camera);
  const hits = _ray.intersectObjects(RAYT, false);
  for (const h of hits) {
    let o = h.object, vis = true;
    while (o) { if (!o.visible) { vis = false; break; } o = o.parent; }
    if (!vis) continue;
    const it = h.object.userData.it;
    if (!it) continue;
    if (it.occ) return null;          // преграда закрывает объекты за ней
    if (it.dead) continue;
    if (typeof it.label !== 'function') continue;
    const lbl = it.label();
    if (!lbl) continue;
    return { it, lbl, dist: h.distance, root: h.object };
  }
  return null;
}