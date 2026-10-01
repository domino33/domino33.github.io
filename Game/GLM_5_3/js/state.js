/* ============================================================
   СОСТОЯНИЕ ИГРЫ, КОНСТАНТЫ, ЗАДАЧИ, КОЛЛИЗИИ
   Единый источник истины для всех модулей
   ============================================================ */

const G = {
  started: false, over: false, failed: false,
  stage: 1, t0: 0,

  /* СИЗ */
  ppe: { ears: false, eyes: null, hands: false, headWorn: false },

  /* кейс */
  caseCarried: false, caseGroundT: 0, wetNoted: false,

  /* пистолет */
  pistolCarried: false, pistolInCase: true,   // на старте пистолет в кейсе
 pistolDead: true, exchanged: false,         // первый пистолет неисправен (разваливается при переломлении)
  pistolSplit: false,                         // дефект уже обнаружен игроком
  brokenOpen: false,                          // переломлен
  chamber: null,                              // null | 'yellow'|'green'|'red'|'black' | 'dud'
  spentShell: false,                          // стреляная гильза в патроннике
  barrelDowel: false,                         // дюбель в стволе
  inspected: false,                           // осмотрен (патрон извлечён)

  /* предмет в руке: {kind:'shell'|'cartridge'|'dud'|'bracket', color?} | null */
  handItem: null,

  /* площадка */
  atSite: false,          // прибыл к месту работ
  caseTrap: false,        // непроверенный пистолет в кейсе — выстрел при доставании
  ladderWarn: false, wasPlatform: false,
  fences: false, fencesRemoved: false, peopleRemoved: false,

  /* стрельба */
  shots: 0,
  misfireNext: false,     // следующий выстрел на свежей точке — осечка
  misfire: false, misfireT: 0, misfireOk: false,

  /* гильзы и патроны */
  shellsCase: 0, shellsFloor: 0, shellsTrash: 0,
  dudIn: 'none',          // none | hand | water | floor | case

  /* кронштейны: 2 шт., по 2 точки крепления */
  brackets: [{ placed: false, done: false }, { placed: false, done: false }],

  rain: false,
  remarks: []             // замечания инструктора для финальной оценки
};

const CONST = {
  WALL_Z: 8.25,           // Z-плоскость лицевой стороны рабочей стены
  COLN: { yellow: 'ЖЁЛТЫЙ', green: 'ЗЕЛЁНЫЙ', red: 'КРАСНЫЙ', black: 'ЧЁРНЫЙ' },
  STAGE_NAMES: ['', 'ПОДГОТОВКА', 'ПОДГОТОВКА МЕСТА', 'ПРОИЗВОДСТВО РАБОТ', 'ОКОНЧАНИЕ РАБОТ']
};

function ppeOk() { return G.ppe.ears && G.ppe.eyes === 'glasses' && G.ppe.hands; }
function remark(t) { if (!G.remarks.includes(t)) G.remarks.push(t); }

/* ---------- коллизии (AABB-поддержка для ходьбы/подъёмов) ----------
   addCol(x1,x2, y1,y2, z1,z2, tag) — tag: 'b'|'platform'|'stair'|'ladder' ...
--------------------------------------------------------------------- */
const COLLIDERS = [];
function addCol(x1, x2, y1, y2, z1, z2, tag) {
  const c = { x1, x2, y1, y2, z1, z2, tag: tag || 'b' };
  COLLIDERS.push(c);
  return c;
}
function remCol(c) { const i = COLLIDERS.indexOf(c); if (i >= 0) COLLIDERS.splice(i, 1); }

/* высота опоры под ногами (ступеньки до +0.56 м переступаются) */
function supportAt(x, z, feet) {
  let h = 0, tag = 'ground';
  for (const c of COLLIDERS) {
    if (c.y2 <= feet + .56 && c.y2 > h &&
        x > c.x1 - .25 && x < c.x2 + .25 && z > c.z1 - .25 && z < c.z2 + .25) {
      h = c.y2; tag = c.tag;
    }
  }
  return { h, tag };
}

/* ---------- список заданий (для панели слева) ----------
   s — этап, t — текст, d() — выполнено?                       */
const TASKS = [
  { s: 1, t: 'Надеть СИЗ: каска с наушниками, защитные очки, краги', d: () => ppeOk() },
  { s: 1, t: 'Взять кейс со стеллажа [F], достать пистолет [X]', d: () => G.pistolCarried || G.exchanged },
  { s: 1, t: 'Осмотреть пистолет: [R] переломить, [E] извлечь патрон', d: () => G.inspected },
  { s: 1, t: 'Убрать проверенный пистолет в кейс [X]', d: () => G.pistolInCase && G.inspected },
  { s: 2, t: 'Перенести кейс к месту работ', d: () => G.atSite },
  { s: 2, t: 'Выставить ограждение опасной зоны (15 м)', d: () => G.fences },
  { s: 2, t: 'Убрать рабочих из-за стены', d: () => G.peopleRemoved },
  { s: 2, t: 'Подняться на подмости (не на стремянку!)', d: () => G.wasPlatform },
  { s: 3, t: 'Установить кронштейны по разметке (поддон у стены)', d: () => G.brackets.every(b => b.placed) },
  { s: 3, t: 'Пристрелить кронштейн №1 (дюбель [1] → патрон [2] → ЛКМ)', d: () => G.brackets[0].done },
  { s: 3, t: 'Пристрелить кронштейн №2 (будет осечка!)', d: () => G.brackets[1].done },
  { s: 4, t: 'Разрядить пистолет [R],[E] и убрать в кейс [X]', d: () => G.pistolInCase && !G.chamber && !G.spentShell },
  { s: 4, t: 'Убрать ограждения', d: () => G.fencesRemoved },
  { s: 4, t: 'Собрать гильзы и осечный патрон в кейс', d: () => G.shellsFloor === 0 && G.shellsTrash === 0 && G.dudIn === 'case' },
  { s: 4, t: 'Вернуться на склад и сдать инструмент кладовщику', d: () => false },
];