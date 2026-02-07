const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");

// Self-introduction settings
const SETTINGS = {
  name: "Kota Konishi",
  introduction: "I'm a IT engineer based in Japan.\nI'm interested in AI-driven development, working on GitHub Copilot adoption and transforming\ndevelopment workflows.\nI also have experience with Zabbix for monitoring and server operations."
};

const blobs = [];
const BLOB_COUNT = 400;

const pointer = {
  x: 0,
  y: 0,
  active: false,
  vx: 0,
  vy: 0,
  lastX: 0,
  lastY: 0,
};

// Blob class: liquid-like circle
class Blob {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.ox = x;
    this.oy = y;
    this.vx = 0;
    this.vy = 0;
    // Responsive blob size
    const isMobile = window.innerWidth <= 768;
    const baseSize = isMobile ? 20 : 100;
    const randomRange = isMobile ? 25 : 120;
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
    const isMobile = window.innerWidth <= 768;
    const pushRadius = isMobile ? 300 : 700;

    if (distance > 0 && distance < pushRadius) {
      const influence = 1 - distance / pushRadius;
      const force = influence * influence * 45;
      this.vx += (dx / distance) * force;
      this.vy += (dy / distance) * force;
    }
  }

  // Repel from other blobs for liquid effect
  repelFromBlobs(blobs) {
    for (const other of blobs) {
      if (other === this) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = (this.size + other.size) * 0.5;

      if (distance > 0 && distance < minDistance) {
        const force = (minDistance - distance) * 0.02;
        this.vx += (dx / distance) * force;
        this.vy += (dy / distance) * force;
      }
    }
  }

  update(width, height) {
    this.vx *= 0.9;
    this.vy *= 0.9;

    // Return to origin
    const returnForce = 0.008;
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
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    gradient.addColorStop(0, `hsla(${this.hue}, 80%, 65%, 0.9)`);
    gradient.addColorStop(0.3, `hsla(${this.hue}, 75%, 55%, 0.85)`);
    gradient.addColorStop(0.6, `hsla(${this.hue}, 70%, 45%, 0.7)`);
    gradient.addColorStop(1, `hsla(${this.hue}, 65%, 35%, 0.4)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function initBlobs(width, height) {
  blobs.length = 0;
  for (let i = 0; i < BLOB_COUNT; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    blobs.push(new Blob(x, y));
  }
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const newX = event.clientX - rect.left;
  const newY = event.clientY - rect.top;

  pointer.vx = newX - pointer.x;
  pointer.vy = newY - pointer.y;
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
  pointer.x = newX;
  pointer.y = newY;
  pointer.active = true;
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

  pointer.vx = newX - pointer.x;
  pointer.vy = newY - pointer.y;
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
  pointer.x = newX;
  pointer.y = newY;
  pointer.active = true;
}

function animate() {
  const { width, height } = canvas.getBoundingClientRect();

  ctx.clearRect(0, 0, width, height);
  
  // Apply extreme blur for seamless liquid
  ctx.filter = "blur(80px)";

  // Update and display blobs
  for (const blob of blobs) {
    if (pointer.active) {
      blob.pushFromCursor(pointer.x, pointer.y);
    }
    blob.repelFromBlobs(blobs);
    blob.update(width, height);
    blob.display();
  }
  
  ctx.filter = "none";

  requestAnimationFrame(animate);
}

resizeCanvas();
const { width, height } = canvas.getBoundingClientRect();
initBlobs(width, height);

// Detect mobile device
const isMobile = window.innerWidth <= 768;

// Setup name container with neon decoration
const nameContainer = document.querySelector("#name-container");
nameContainer.style.cssText = `
  position: fixed;
  top: ${isMobile ? '30%' : '35%'};
  left: 50%;
  transform: translate(-50%, -50%);
  padding: ${isMobile ? '4vw 5vw' : '3vw 4vw'};
  border: 2px solid rgba(150, 255, 255, 0.4);
  border-radius: 8px;
  box-shadow: 
    0 0 20px rgba(100, 200, 255, 0.3),
    0 0 40px rgba(100, 200, 255, 0.2),
    inset 0 0 30px rgba(100, 200, 255, 0.1);
  backdrop-filter: blur(2px);
  pointer-events: none;
  z-index: 0;
`;

// Setup name text
const nameText = document.querySelector("#name-text");
nameText.textContent = SETTINGS.name;
nameText.style.cssText = `
  font-size: clamp(3rem, 12vw, 15vw);
  font-weight: 900;
  color: rgba(220, 255, 255, 0.9);
  text-shadow: 
    0 0 30px rgba(150, 255, 255, 0.6), 
    0 0 60px rgba(100, 200, 255, 0.4),
    0 0 90px rgba(100, 200, 255, 0.2);
  font-family: 'Orbitron', monospace;
  white-space: nowrap;
  letter-spacing: 0.05em;
  -webkit-text-stroke: 1px rgba(150, 255, 255, 0.2);
`;

// Setup introduction text
const introText = document.querySelector("#intro-text");
introText.textContent = SETTINGS.introduction;
introText.style.cssText = `
  position: fixed;
  bottom: ${isMobile ? '25%' : '15%'};
  left: 50%;
  transform: translateX(-50%);
  max-width: ${isMobile ? '85vw' : '60vw'};
  max-height: ${isMobile ? '30vh' : '25vh'};
  overflow: hidden;
  font-size: ${isMobile ? 'clamp(0.8rem, 3.5vw, 1rem)' : '2vw'};
  font-weight: 500;
  line-height: 1.8;
  color: rgba(200, 240, 255, 0.75);
  text-shadow: 0 0 20px rgba(150, 255, 255, 0.3);
  pointer-events: none;
  z-index: -1;
  font-family: 'Rajdhani', sans-serif;
  white-space: pre-line;
  text-align: left;
  letter-spacing: 0.02em;
`;

animate();

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
