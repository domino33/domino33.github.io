/* ============================================================================
 *  main.js — запуск: рендерер, сцена, свет, игровой цикл, рестарт.
 * ========================================================================== */
(function () {
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc3e2);
  scene.fog = new THREE.Fog(0x9fc3e2, 55, 190);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 400);

  // --- освещение ---
  scene.add(new THREE.HemisphereLight(0xdff0ff, 0x6d6a5c, 0.5));
  const sun = new THREE.DirectionalLight(0xfff2d8, 0.85);
  sun.position.set(34, 42, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.0006;
  sun.target.position.set(0, 0, -5);
  scene.add(sun);
  scene.add(sun.target);

  // --- HUD ---
  UI.init();

  // --- объекты игры ---
  const player = new Player(canvas);
  let world = World.build(scene);
  const game = new Game({ scene: scene, camera: camera, player: player, world: world });
  game.start();

  // окно отладки
  window.TREN = { scene: scene, camera: camera, player: player, world: world, game: game, THREE: THREE, renderer: renderer };

  let running = false;

  function restart() {
    UI.hideEnd();
    UI.showHelp(false);
    UI.showLoad(false);
    // убрать старую сцену и пистолет из камеры
    scene.remove(world.group);
    while (camera.children.length) camera.remove(camera.children[0]);
    world = World.build(scene);
    window.TREN.world = world;
    game.rebind(world);
    running = true;
    player.lock();
  }

  UI.bindStart(function () {
    UI.showStart(false);
    running = true;
    player.lock();
  });
  UI.bindRestart(restart);

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // клик по сцене — захват мыши
  canvas.addEventListener('mousedown', function (e) {
    if (!running) return;
    if (e.button === 0 && !document.pointerLockElement &&
      document.getElementById('load-panel').classList.contains('hidden') &&
      document.getElementById('help-panel').classList.contains('hidden') &&
      document.getElementById('end-overlay').classList.contains('hidden')) {
      player.lock();
    }
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    player.update(dt, world.colliders);
    player.applyToCamera(camera);
    game.update(dt);
    renderer.render(scene, camera);
  }
  animate();
})();
