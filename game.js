const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const stateEl = document.getElementById("state");

const TILE = 28;
const HUD_HEIGHT = 2 * TILE;
const ROWS = 20;
const COLS = 20;

const WALL = "#";
const PELLET = ".";
const POWER = "o";
const EMPTY = " ";

const BASE_MAP = [
  "####################",
  "#o................o#",
  "#.####.######.####.#",
  "#..................#",
  "#.##.##########.##.#",
  "#....#........#....#",
  "####.#.######.#.####",
  "#....#...##...#....#",
  "#.######.##.######.#",
  "#........##........#",
  "#.######.##.######.#",
  "#....#...##...#....#",
  "####.#.######.#.####",
  "#....#........#....#",
  "#.##.##########.##.#",
  "#..................#",
  "#.####.######.####.#",
  "#o................o#",
  "#.################.#",
  "####################",
];

const DIRS = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
};

let map;
let pellets;
let score;
let lives;
let powerTimer;
let gameOver;
let won;

const pacman = {
  x: 10,
  y: 15,
  dir: { x: 0, y: 0 },
  nextDir: { x: 0, y: 0 },
  mouth: 0,
  mouthStep: 0.16,
};

const ghostStart = [
  { x: 9, y: 9, color: "#ff4c5b" },
  { x: 10, y: 9, color: "#4ce5ff" },
  { x: 9, y: 10, color: "#ff9e4c" },
  { x: 10, y: 10, color: "#ff79ff" },
];

let ghosts;

function resetGame() {
  map = BASE_MAP.map((row) => row.split(""));
  pellets = map.flat().filter((cell) => cell === PELLET || cell === POWER).length;
  score = 0;
  lives = 3;
  powerTimer = 0;
  gameOver = false;
  won = false;
  resetPositions();
  updateHud();
}

function resetPositions() {
  pacman.x = 10;
  pacman.y = 15;
  pacman.dir = { x: 0, y: 0 };
  pacman.nextDir = { x: 0, y: 0 };
  ghosts = ghostStart.map((g) => ({ ...g, dir: randomDir(), frightened: false }));
}

function randomDir() {
  return [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }][
    Math.floor(Math.random() * 4)
  ];
}

function isWall(x, y) {
  if (y < 0 || y >= ROWS) return true;
  if (x < 0) x = COLS - 1;
  if (x >= COLS) x = 0;
  return map[y][x] === WALL;
}

function wrap(entity) {
  if (entity.x < 0) entity.x = COLS - 1;
  if (entity.x >= COLS) entity.x = 0;
}

function attemptTurn(entity, dir) {
  const nx = entity.x + dir.x;
  const ny = entity.y + dir.y;
  if (!isWall(nx, ny)) entity.dir = dir;
}

function movePacman() {
  attemptTurn(pacman, pacman.nextDir);
  const nx = pacman.x + pacman.dir.x;
  const ny = pacman.y + pacman.dir.y;
  if (!isWall(nx, ny)) {
    pacman.x = nx;
    pacman.y = ny;
    wrap(pacman);
  }

  const cell = map[pacman.y][pacman.x];
  if (cell === PELLET) {
    map[pacman.y][pacman.x] = EMPTY;
    score += 10;
    pellets--;
  } else if (cell === POWER) {
    map[pacman.y][pacman.x] = EMPTY;
    score += 50;
    pellets--;
    powerTimer = 280;
    ghosts.forEach((g) => (g.frightened = true));
  }
}

function moveGhost(ghost) {
  const choices = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ].filter((d) => !isWall(ghost.x + d.x, ghost.y + d.y));

  if (!choices.length) return;

  if (Math.random() < 0.25 || isWall(ghost.x + ghost.dir.x, ghost.y + ghost.dir.y)) {
    if (ghost.frightened) {
      ghost.dir = choices[Math.floor(Math.random() * choices.length)];
    } else {
      choices.sort((a, b) => {
        const da = Math.abs(pacman.x - (ghost.x + a.x)) + Math.abs(pacman.y - (ghost.y + a.y));
        const db = Math.abs(pacman.x - (ghost.x + b.x)) + Math.abs(pacman.y - (ghost.y + b.y));
        return da - db;
      });
      ghost.dir = choices[0];
    }
  }

  ghost.x += ghost.dir.x;
  ghost.y += ghost.dir.y;
  wrap(ghost);
}

function checkCollisions() {
  for (const ghost of ghosts) {
    if (ghost.x === pacman.x && ghost.y === pacman.y) {
      if (ghost.frightened) {
        score += 200;
        ghost.x = 9 + Math.floor(Math.random() * 2);
        ghost.y = 9 + Math.floor(Math.random() * 2);
        ghost.frightened = false;
      } else {
        lives--;
        if (lives <= 0) {
          gameOver = true;
        }
        resetPositions();
        break;
      }
    }
  }

  if (pellets === 0) {
    won = true;
    gameOver = true;
  }
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  if (gameOver) {
    stateEl.textContent = won ? "You win! Press R to restart." : "Game over! Press R to restart.";
  } else if (powerTimer > 0) {
    stateEl.textContent = "Power mode! Eat ghosts!";
  } else {
    stateEl.textContent = "Collect all pellets!";
  }
}

function drawMaze() {
  ctx.fillStyle = "#02020a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE;
      const py = y * TILE + HUD_HEIGHT;
      const cell = map[y][x];
      if (cell === WALL) {
        ctx.fillStyle = "#1f50ff";
        ctx.fillRect(px, py, TILE, TILE);
      } else if (cell === PELLET) {
        ctx.fillStyle = "#ffeaa7";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (cell === POWER) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPacman() {
  const px = pacman.x * TILE + TILE / 2;
  const py = pacman.y * TILE + HUD_HEIGHT + TILE / 2;

  pacman.mouth += pacman.mouthStep;
  if (pacman.mouth > 0.9 || pacman.mouth < 0.2) pacman.mouthStep *= -1;

  let angle = 0;
  if (pacman.dir.x === -1) angle = Math.PI;
  else if (pacman.dir.y === -1) angle = -Math.PI / 2;
  else if (pacman.dir.y === 1) angle = Math.PI / 2;

  const bite = pacman.mouth;
  ctx.fillStyle = "#ffd84a";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, TILE / 2 - 2, angle + bite, angle + Math.PI * 2 - bite);
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  const x = ghost.x * TILE;
  const y = ghost.y * TILE + HUD_HEIGHT;
  const c = ghost.frightened ? "#5077ff" : ghost.color;

  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, TILE / 2 - 2, Math.PI, 0);
  ctx.lineTo(x + TILE - 2, y + TILE - 2);
  ctx.lineTo(x + TILE * 0.75, y + TILE - 8);
  ctx.lineTo(x + TILE * 0.5, y + TILE - 2);
  ctx.lineTo(x + TILE * 0.25, y + TILE - 8);
  ctx.lineTo(x + 2, y + TILE - 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + TILE * 0.35, y + TILE * 0.52, 4, 0, Math.PI * 2);
  ctx.arc(x + TILE * 0.65, y + TILE * 0.52, 4, 0, Math.PI * 2);
  ctx.fill();
}

let frame = 0;
function loop() {
  frame++;
  if (!gameOver && frame % 8 === 0) {
    movePacman();
    ghosts.forEach(moveGhost);
    checkCollisions();
    if (powerTimer > 0) {
      powerTimer--;
      if (powerTimer === 0) ghosts.forEach((g) => (g.frightened = false));
    }
    updateHud();
  }

  drawMaze();
  drawPacman();
  ghosts.forEach(drawGhost);

  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r" && gameOver) {
    resetGame();
    return;
  }
  const dir = DIRS[event.key] || DIRS[event.key.toLowerCase()];
  if (dir) {
    pacman.nextDir = dir;
    event.preventDefault();
  }
});

resetGame();
canvas.height = HUD_HEIGHT + ROWS * TILE;
loop();
