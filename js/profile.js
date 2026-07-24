const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");

const blobs = [];
const IS_MOBILE = window.innerWidth <= 768;
const BLOB_COUNT = IS_MOBILE ? 0 : 200;
const PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Cap device pixel ratio: the blob field is heavily blurred, so extra pixels are wasted.
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
// Render the blob field into a low-resolution buffer, then upscale to the main canvas.
// This is the key optimization: the expensive blur runs on ~10x fewer pixels.
const RENDER_SCALE = 0.3;
const LOW_BLUR = Math.round(80 * RENDER_SCALE);

// Low-resolution offscreen buffers used by the desktop liquid renderer.
const blobLayer = document.createElement("canvas");
const blobCtx = blobLayer.getContext("2d");
const blurLayer = document.createElement("canvas");
const blurCtx = blurLayer.getContext("2d");
let lowW = 1;
let lowH = 1;

// Pre-baked blob sprites (radial gradients), built once and reused every frame
// so we never allocate a gradient per blob per frame.
const HUE_MIN = 180;
const HUE_MAX = 220;
const SPRITE_BUCKETS = 8;
const SPRITE_SIZE = 128;
const blobSprites = [];

function buildBlobSprites() {
  blobSprites.length = 0;
  for (let i = 0; i < SPRITE_BUCKETS; i += 1) {
    const hue = HUE_MIN + ((HUE_MAX - HUE_MIN) * i) / (SPRITE_BUCKETS - 1);
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;
    const g = sprite.getContext("2d");
    const r = SPRITE_SIZE / 2;
    const gradient = g.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.9)`);
    gradient.addColorStop(0.3, `hsla(${hue}, 75%, 55%, 0.85)`);
    gradient.addColorStop(0.6, `hsla(${hue}, 70%, 45%, 0.6)`);
    gradient.addColorStop(1, `hsla(${hue}, 65%, 35%, 0)`);
    g.fillStyle = gradient;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    blobSprites.push(sprite);
  }
}

function spriteForHue(hue) {
  const t = (hue - HUE_MIN) / (HUE_MAX - HUE_MIN);
  const idx = Math.max(0, Math.min(SPRITE_BUCKETS - 1, Math.round(t * (SPRITE_BUCKETS - 1))));
  return blobSprites[idx];
}

const pointer = {
  x: 0,
  y: 0,
  active: false,
  vx: 0,
  vy: 0,
  lastX: 0,
  lastY: 0,
};

const swipeTrail = [];
const TRAIL_MAX = IS_MOBILE ? 120 : 0;

// Blob class: liquid-like circle
class Blob {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.ox = x;
    this.oy = y;
    this.vx = 0;
    this.vy = 0;
    // Responsive blob size (much larger on mobile for liquid feel with fewer blobs)
    const baseSize = IS_MOBILE ? 60 : 100;
    const randomRange = IS_MOBILE ? 80 : 120;
    this.size = Math.random() * randomRange + baseSize;
    // Cyan to blue spectrum for unified look
    this.hue = 180 + Math.random() * 40; // 180-220: cyan through blue
  }

  // Push away from cursor
  pushFromCursor(cx, cy) {
    const dx = this.x - cx;
    const dy = this.y - cy;
    const distance = Math.hypot(dx, dy);
    // Responsive push radius
    const pushRadius = IS_MOBILE ? 120 : 700;

    if (distance > 0 && distance < pushRadius) {
      const influence = 1 - distance / pushRadius;
      const force = influence * influence * 45;
      this.vx += (dx / distance) * force;
      this.vy += (dy / distance) * force;
    }
  }

  // Repel from other blobs for liquid effect
  repelFromBlobs(blobs) {
    const step = IS_MOBILE ? 15 : 1;
    for (let i = 0; i < blobs.length; i += step) {
      const other = blobs[i];
      if (other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = (this.size + other.size) * 0.5;

      if (distance > 0 && distance < minDistance) {
        const forceScale = IS_MOBILE ? 0.01 : 0.02;
        const force = (minDistance - distance) * forceScale;
        this.vx += (dx / distance) * force;
        this.vy += (dy / distance) * force;
      }
    }
  }

  update(width, height) {
    // Less damping for more fluid movement
    const damping = IS_MOBILE ? 0.85 : 0.9;
    this.vx *= damping;
    this.vy *= damping;

    // Return to origin (balanced for responsive liquid feel)
    const returnForce = IS_MOBILE ? 0.005 : 0.001;
    this.vx += (this.ox - this.x) * returnForce;
    this.vy += (this.oy - this.y) * returnForce;

    this.x += this.vx;
    this.y += this.vy;

    // Clamp speed
    const speed = Math.hypot(this.vx, this.vy);
    const maxSpeed = 12;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  display() {
    // Draw a pre-baked sprite into the low-res buffer (no per-frame gradient allocation).
    const sprite = spriteForHue(this.hue);
    const d = this.size * 2 * RENDER_SCALE;
    const sx = this.x * RENDER_SCALE - d / 2;
    const sy = this.y * RENDER_SCALE - d / 2;
    blobCtx.drawImage(sprite, sx, sy, d, d);
  }
}

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.floor(width * DPR);
  canvas.height = Math.floor(height * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Size the low-resolution liquid buffers.
  lowW = Math.max(1, Math.round(width * RENDER_SCALE));
  lowH = Math.max(1, Math.round(height * RENDER_SCALE));
  blobLayer.width = lowW;
  blobLayer.height = lowH;
  blurLayer.width = lowW;
  blurLayer.height = lowH;
}

function initBlobs(width, height) {
  if (BLOB_COUNT === 0) return;
  blobs.length = 0;
  for (let i = 0; i < BLOB_COUNT; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    blobs.push(new Blob(x, y));
  }
}

function addTrailSegment(prevX, prevY, x, y, vx, vy) {
  if (!IS_MOBILE) return;
  const dx = x - prevX;
  const dy = y - prevY;
  const distance = Math.hypot(dx, dy);
  const steps = Math.min(8, Math.max(1, Math.ceil(distance / 12)));
  const speed = Math.hypot(vx, vy);
  const radius = Math.min(180, 70 + speed * 2.0);

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const ix = prevX + dx * t;
    const iy = prevY + dy * t;
    swipeTrail.push({ x: ix, y: iy, r: radius, life: 1 });
  }

  while (swipeTrail.length > TRAIL_MAX) {
    swipeTrail.shift();
  }
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const newX = event.clientX - rect.left;
  const newY = event.clientY - rect.top;

  const prevX = pointer.x;
  const prevY = pointer.y;
  pointer.vx = newX - prevX;
  pointer.vy = newY - prevY;
  pointer.lastX = prevX;
  pointer.lastY = prevY;
  pointer.x = newX;
  pointer.y = newY;
  pointer.active = true;
  addTrailSegment(prevX, prevY, pointer.x, pointer.y, pointer.vx, pointer.vy);
}

function fadePointer() {
  pointer.active = false;
  pointer.vx = 0;
  pointer.vy = 0;
}

function updatePointerTouch(event) {
  if (event.touches.length === 0) return;
  const rect = canvas.getBoundingClientRect();
  const newX = event.touches[0].clientX - rect.left;
  const newY = event.touches[0].clientY - rect.top;

  const prevX = pointer.x;
  const prevY = pointer.y;
  pointer.vx = newX - prevX;
  pointer.vy = newY - prevY;
  pointer.lastX = prevX;
  pointer.lastY = prevY;
  pointer.x = newX;
  pointer.y = newY;
  pointer.active = true;
  addTrailSegment(prevX, prevY, pointer.x, pointer.y, pointer.vx, pointer.vy);
}

function renderMobileLiquid(width, height) {
  ctx.clearRect(0, 0, width, height);

  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "rgba(60, 200, 255, 1)");
  base.addColorStop(0.5, "rgba(40, 150, 255, 1)");
  base.addColorStop(1, "rgba(20, 110, 230, 1)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.2, height * 0.2, 0, width * 0.2, height * 0.2, Math.max(width, height) * 0.8);
  glow.addColorStop(0, "rgba(120, 255, 255, 0.22)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "destination-out";
  ctx.filter = "blur(26px)";
  for (let i = swipeTrail.length - 1; i >= 0; i -= 1) {
    const p = swipeTrail[i];
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    p.life *= 0.92;
    p.r *= 0.985;
    if (p.life < 0.04 || p.r < 8) {
      swipeTrail.splice(i, 1);
    }
  }

  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
}

function renderDesktopLiquid(width, height) {
  // 1) Draw all blobs sharp into the low-res buffer.
  blobCtx.clearRect(0, 0, lowW, lowH);
  for (const blob of blobs) {
    if (pointer.active) {
      blob.pushFromCursor(pointer.x, pointer.y);
    }
    blob.repelFromBlobs(blobs);
    blob.update(width, height);
    blob.display();
  }

  // 2) Blur the low-res buffer once. Cheap: runs on RENDER_SCALE^2 fewer pixels
  //    than the previous per-blob full-resolution blur(80px).
  blurCtx.clearRect(0, 0, lowW, lowH);
  blurCtx.filter = `blur(${LOW_BLUR}px)`;
  blurCtx.drawImage(blobLayer, 0, 0);
  blurCtx.filter = "none";

  // 3) Upscale to the main canvas; bilinear smoothing completes the liquid look.
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(blurLayer, 0, 0, lowW, lowH, 0, 0, width, height);
}

function renderFrame() {
  const { width, height } = canvas.getBoundingClientRect();
  if (IS_MOBILE) {
    renderMobileLiquid(width, height);
  } else {
    renderDesktopLiquid(width, height);
  }
}

let rafId = null;

function loop() {
  renderFrame();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId === null) {
    rafId = requestAnimationFrame(loop);
  }
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

resizeCanvas();
buildBlobSprites();
const { width, height } = canvas.getBoundingClientRect();
initBlobs(width, height);

if (PREFERS_REDUCED_MOTION) {
  // Respect reduced-motion: render a single static frame, no animation loop.
  renderFrame();
} else {
  startLoop();
  // Pause rendering while the tab is hidden to save CPU/GPU.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopLoop();
    } else {
      startLoop();
    }
  });
}

window.addEventListener("resize", () => {
  resizeCanvas();
  const { width, height } = canvas.getBoundingClientRect();
  
  // Reset blob origins and velocity to prevent rapid movement on resize
  for (const blob of blobs) {
    blob.ox = blob.x;
    blob.oy = blob.y;
    blob.vx = 0;
    blob.vy = 0;
  }
  
  if (blobs.length === 0) {
    initBlobs(width, height);
  }

  if (PREFERS_REDUCED_MOTION) {
    renderFrame();
  }
});

canvas.addEventListener("mousemove", updatePointer);
canvas.addEventListener("mouseleave", fadePointer);
canvas.addEventListener("touchstart", updatePointerTouch, { passive: true });
canvas.addEventListener("touchmove", updatePointerTouch, { passive: true });
canvas.addEventListener("touchend", fadePointer);

// Navigation: Double-click or long-press to go back to index page
let longPressTimer = null;
let touchStartTime = 0;

canvas.addEventListener("dblclick", () => {
  window.location.href = "index.html";
});

let longPressActive = false;

canvas.addEventListener("touchstart", (e) => {
  touchStartTime = Date.now();
  longPressActive = false;
  longPressTimer = setTimeout(() => {
    longPressActive = true;
    // Visual feedback
    canvas.style.transition = "opacity 0.3s";
    canvas.style.opacity = "0.7";
    setTimeout(() => {
      window.location.href = "index.html";
    }, 300);
  }, 800); // 800ms long press
}, { passive: true });

canvas.addEventListener("touchend", () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  if (!longPressActive) {
    canvas.style.opacity = "1";
  }
}, { passive: true });

canvas.addEventListener("touchmove", () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressActive = false;
  }
}, { passive: true });
