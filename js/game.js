const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const livesEl = document.querySelector("#lives");
const statusEl = document.querySelector("#status-text");

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  lastTime: 0,
  running: true,
  score: 0,
  lives: 3,
  gameOver: false,
  pointerX: null,
};

const title = {
  text: "BREAKOUT",
  x: 0,
  y: 0,
  size: 120,
  destroyZones: [],
  visible: true,
};

const paddle = {
  x: 0,
  y: 0,
  width: 160,
  height: 18,
  targetX: 0,
};

const ball = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 10,
  launched: false,
  speed: 420,
};

let bricks = [];
const particles = [];

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  state.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * state.dpr);
  canvas.height = Math.floor(height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.width = width;
  state.height = height;

  const isMobile = width < 720;
  paddle.width = isMobile ? width * 0.35 : width * 0.18;
  paddle.height = isMobile ? 18 : 16;
  paddle.y = height - (isMobile ? 80 : 70);
  paddle.x = (width - paddle.width) / 2;
  paddle.targetX = paddle.x;

  ball.radius = isMobile ? 10 : 9;
  ball.speed = isMobile ? 360 : 440;

  title.size = Math.max(40, Math.min(120, width * 0.14));
  title.x = width / 2;
  title.y = Math.max(60, height * 0.18);
  title.destroyZones = Array(title.text.length).fill(false);
  title.visible = true;

  buildBricks();
  resetBall(true);
}

function buildBricks() {
  bricks = [];
  const isMobile = state.width < 720;
  const cols = isMobile ? 7 : 10;
  const rows = isMobile ? 5 : 6;
  const marginX = Math.max(20, state.width * 0.06);
  const gap = isMobile ? 8 : 10;
  const topOffset = Math.max(60, state.height * 0.12);
  const brickWidth = (state.width - marginX * 2 - gap * (cols - 1)) / cols;
  const brickHeight = Math.max(16, state.height * 0.035);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = marginX + col * (brickWidth + gap);
      const y = topOffset + row * (brickHeight + gap);
      const hue = 185 + row * 7;
      bricks.push({ x, y, width: brickWidth, height: brickHeight, alive: true, hue });
    }
  }
}

function resetBall(fullReset) {
  ball.launched = false;
  ball.vx = 0;
  ball.vy = 0;
  ball.x = paddle.x + paddle.width / 2;
  ball.y = paddle.y - ball.radius - 2;
  if (fullReset) {
    state.score = 0;
    state.lives = 3;
    state.gameOver = false;
    statusEl.textContent = "Tap or click to launch";
  }
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
}

function launchBall() {
  if (ball.launched || state.gameOver) return;
  const angle = (-Math.PI * 0.75) + Math.random() * (Math.PI * 0.25);
  ball.vx = Math.cos(angle) * ball.speed;
  ball.vy = Math.sin(angle) * ball.speed;
  ball.launched = true;
  statusEl.textContent = "";
}

function spawnParticles(x, y, hue) {
  for (let i = 0; i < 10; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 220,
      vy: (Math.random() - 0.5) * 220,
      life: 0.6 + Math.random() * 0.4,
      hue,
    });
  }
}

function updatePaddle() {
  if (state.pointerX !== null) {
    paddle.targetX = state.pointerX - paddle.width / 2;
  }
  paddle.x += (paddle.targetX - paddle.x) * 0.18;
  paddle.x = Math.max(10, Math.min(state.width - paddle.width - 10, paddle.x));
}

function updateBall(dt) {
  if (!ball.launched) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 2;
    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= -1;
  }
  if (ball.x + ball.radius > state.width) {
    ball.x = state.width - ball.radius;
    ball.vx *= -1;
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
  }

  if (ball.y - ball.radius > state.height) {
    state.lives -= 1;
    livesEl.textContent = state.lives;
    if (state.lives <= 0) {
      state.gameOver = true;
      statusEl.textContent = "Game Over - Tap to restart";
    }
    ball.launched = false;
    ball.vx = 0;
    ball.vy = 0;
  }

  const paddleTop = paddle.y;
  if (
    ball.y + ball.radius >= paddleTop &&
    ball.y + ball.radius <= paddleTop + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.vy > 0
  ) {
    const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const angle = hitPos * (Math.PI / 3);
    ball.vx = Math.sin(angle) * ball.speed;
    ball.vy = -Math.cos(angle) * ball.speed;
    spawnParticles(ball.x, ball.y, 195);
  }

  for (const brick of bricks) {
    if (!brick.alive) continue;
    if (
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height
    ) {
      brick.alive = false;
      state.score += 10;
      scoreEl.textContent = state.score;
      spawnParticles(ball.x, ball.y, brick.hue);

      const overlapX = Math.min(
        Math.abs(ball.x + ball.radius - brick.x),
        Math.abs(brick.x + brick.width - (ball.x - ball.radius))
      );
      const overlapY = Math.min(
        Math.abs(ball.y + ball.radius - brick.y),
        Math.abs(brick.y + brick.height - (ball.y - ball.radius))
      );
      if (overlapX < overlapY) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
      break;
    }
  }

  // Check title collision
  ctx.font = `900 ${Math.floor(title.size)}px "Orbitron", monospace`;
  const titleMetrics = ctx.measureText(title.text);
  const titleWidth = titleMetrics.width;
  const titleLeft = title.x - titleWidth / 2;
  const titleRight = title.x + titleWidth / 2;
  const charWidth = titleWidth / title.text.length;
  const titleTop = title.y - title.size * 0.4;
  const titleBottom = title.y + title.size * 0.2;

  if (
    ball.x + ball.radius > titleLeft &&
    ball.x - ball.radius < titleRight &&
    ball.y + ball.radius > titleTop &&
    ball.y - ball.radius < titleBottom &&
    ball.vy < 0
  ) {
    const zone = Math.floor((ball.x - titleLeft) / charWidth);
    if (zone >= 0 && zone < title.text.length && !title.destroyZones[zone]) {
      title.destroyZones[zone] = true;
      state.score += 50;
      scoreEl.textContent = state.score;
      spawnParticles(ball.x, ball.y, 200);
      ball.vy *= -1;
    }
  }

  if (bricks.every((brick) => !brick.alive)) {
    buildBricks();
    ball.launched = false;
    statusEl.textContent = "Stage Clear - Tap to continue";
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt * 1.5;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function renderBackground() {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = "rgba(6, 10, 18, 0.75)";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(120, 190, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i += 1) {
    const y = state.height * 0.2 + i * state.height * 0.08;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
}

function drawPaddle() {
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  gradient.addColorStop(0, "rgba(120, 255, 255, 0.85)");
  gradient.addColorStop(0.5, "rgba(80, 200, 255, 0.95)");
  gradient.addColorStop(1, "rgba(40, 160, 255, 0.85)");

  ctx.save();
  ctx.shadowColor = "rgba(120, 220, 255, 0.8)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 10);
  ctx.fill();
  ctx.restore();
}

function drawBall() {
  ctx.save();
  ctx.shadowColor = "rgba(120, 240, 255, 0.9)";
  ctx.shadowBlur = 16;
  ctx.fillStyle = "rgba(210, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBricks() {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const gradient = ctx.createLinearGradient(brick.x, brick.y, brick.x + brick.width, brick.y + brick.height);
    gradient.addColorStop(0, `hsla(${brick.hue}, 80%, 65%, 0.9)`);
    gradient.addColorStop(1, `hsla(${brick.hue}, 70%, 45%, 0.9)`);

    ctx.save();
    ctx.shadowColor = `hsla(${brick.hue}, 80%, 60%, 0.8)`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = gradient;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, 1)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawTitle() {
  if (!title.visible) return;

  ctx.save();
  ctx.font = `900 ${Math.floor(title.size)}px "Orbitron", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(title.text);
  const charWidth = metrics.width / title.text.length;

  for (let i = 0; i < title.text.length; i += 1) {
    if (title.destroyZones[i]) continue;

    const charX = title.x - (title.text.length - 1) * charWidth * 0.5 + i * charWidth;
    const charAlpha = 1;

    ctx.globalAlpha = charAlpha;
    ctx.shadowColor = "rgba(120, 210, 255, 0.8)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = `rgba(200, 250, 255, ${0.92 * charAlpha})`;
    ctx.fillText(title.text[i], charX, title.y);
  }

  ctx.restore();
}

function loop(timestamp) {
  if (!state.running) return;
  const dt = Math.min(0.02, (timestamp - state.lastTime) / 1000 || 0.016);
  state.lastTime = timestamp;

  updatePaddle();
  updateBall(dt);
  updateParticles(dt);

  renderBackground();
  drawBricks();
  drawTitle();
  drawPaddle();
  drawBall();
  drawParticles();

  requestAnimationFrame(loop);
}

function handlePointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  state.pointerX = x;
}

function handleTouchMove(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = event.touches[0].clientX - rect.left;
  state.pointerX = x;
}

function handleLaunch() {
  if (state.gameOver) {
    state.gameOver = false;
    buildBricks();
    resetBall(true);
    return;
  }
  launchBall();
}

window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("mousemove", handlePointerMove);
canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
canvas.addEventListener("click", handleLaunch);
canvas.addEventListener("touchstart", (event) => {
  if (event.touches.length > 1) return;
  handleLaunch();
}, { passive: true });

resizeCanvas();
resetBall(true);
requestAnimationFrame(loop);
