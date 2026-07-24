const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");

const SETTINGS = {
  // Change this to your name.
  nameText: "Kota Konishi",
  // Skill labels that float around the name.
  skills: [
   // Languages
  { label: "Python", weight: 1.3 },
  { label: "JavaScript", weight: 1.3 },
  { label: "TypeScript", weight: 1.4 },
  { label: "HTML", weight: 0.9 },
  { label: "CSS", weight: 0.9 },
  { label: "Java", weight: 1.0 },
  { label: "PHP", weight: 0.9 },
  { label: "Rust", weight: 0.9 },
  { label: "SQL", weight: 0.8 },

  // AI-driven development
  { label: "GitHub Copilot", weight: 2.0 },
  { label: "AI-driven Dev", weight: 2.0 },
  { label: "GitHub Copilot CLI", weight: 1.7 },
  { label: "AI Agents", weight: 1.6 },
  { label: "LLM", weight: 1.5 },
  { label: "MCP", weight: 1.4 },
  { label: "Prompt Engineering", weight: 1.3 },
  { label: "RAG", weight: 1.2 },

  // Frameworks / Libraries
  { label: "React", weight: 1.3 },
  { label: "Three.js", weight: 1.3 },
  { label: "Vue", weight: 1.0 },
  { label: "Flask", weight: 1.1 },
  { label: "Django", weight: 1.0 },

  // Development / CI/CD
  { label: "Git", weight: 1.0 },
  { label: "GitHub Actions", weight: 1.2 },
  { label: "Docker", weight: 1.1 },
  { label: "Linux", weight: 0.9 },
  { label: "Windows", weight: 0.8 },
  { label: "VSCode", weight: 0.9 },

  // Data / Testing
  { label: "NumPy", weight: 0.9 },
  { label: "Pandas", weight: 0.9 },
  { label: "Parasoft Jtest", weight: 1.0 },
  { label: "Zabbix", weight: 1.0 },

  // Mobile / Others
  { label: "Android", weight: 0.9 },

  // Server / Infra
  { label: "RHEL", weight: 0.8 },
  { label: "Grafana", weight: 0.9 },
  { label: "Prometheus", weight: 0.9 }
  ],
};

const pointer = {
  x: 0,
  y: 0,
  active: false,
};

const particles = [];
const skillParticles = [];
const offscreen = document.createElement("canvas");
const offCtx = offscreen.getContext("2d");
let tick = 0;
let labelScale = 1;

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  offscreen.width = Math.floor(width);
  offscreen.height = Math.floor(height);
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
}

function updatePointerTouch(event) {
  if (event.touches.length === 0) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.touches[0].clientX - rect.left;
  pointer.y = event.touches[0].clientY - rect.top;
  pointer.active = true;
}

function fadePointer() {
  pointer.active = false;
}

function buildParticles() {
  const width = offscreen.width;
  const height = offscreen.height;
  let fontSize = Math.min(width, height) * 0.22;

  offCtx.clearRect(0, 0, width, height);
  offCtx.fillStyle = "#ffffff";
  offCtx.textAlign = "center";
  offCtx.textBaseline = "middle";
  offCtx.font = `700 ${Math.floor(fontSize)}px "Space Grotesk", sans-serif`;
  
  // Measure and adjust font size to fit within canvas width.
  let metrics = offCtx.measureText(SETTINGS.nameText);
  const maxTextWidth = width * 0.85;
  if (metrics.width > maxTextWidth) {
    fontSize = (fontSize * maxTextWidth) / metrics.width;
    offCtx.font = `700 ${Math.floor(fontSize)}px "Space Grotesk", sans-serif`;
    metrics = offCtx.measureText(SETTINGS.nameText);
  }
  
  const textWidth = metrics.width;
  const textHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  offCtx.fillText(SETTINGS.nameText, width / 2, height / 2);

  const imageData = offCtx.getImageData(0, 0, width, height).data;
  const gap = Math.max(2, Math.floor(fontSize / 44));

  particles.length = 0;
  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const index = (y * width + x) * 4 + 3;
      if (imageData[index] > 0) {
        const jitter = (Math.random() - 0.5) * gap * 2;
        particles.push({
          x: x + jitter,
          y: y + jitter,
          ox: x,
          oy: y,
          vx: 0,
          vy: 0,
          size: Math.random() * 1.0 + 0.35,
        });
      }
    }
  }

  // Place skill labels around the name with an even golden-angle spread, then
  // relax overlaps so labels no longer stack on top of each other.
  skillParticles.length = 0;
  const centerX = width / 2;
  const centerY = height / 2;
  const nameHalfW = textWidth / 2;
  const nameHalfH = textHeight / 2;
  const namePadding = Math.max(22, fontSize * 0.16);
  const canvasPadding = 30;
  const skillList = SETTINGS.skills.map((skill) =>
    typeof skill === "string"
      ? { label: skill, weight: 1 }
      : { label: skill.label, weight: skill.weight ?? 1 }
  );

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const maxRadius = Math.min(width, height) * 0.62;
  // Scale label type down on smaller canvases so even the widest labels fit.
  labelScale = Math.min(1, Math.min(width, height) / 820);
  skillList.forEach((skill, index) => {
    const size = (16 + skill.weight * 12) * labelScale;
    offCtx.font = `600 ${size}px "Space Grotesk", sans-serif`;
    const labelWidth = offCtx.measureText(skill.label).width;
    const labelHeight = size;
    const frac = (index + 0.5) / skillList.length;
    const angle = index * goldenAngle;
    const radius = Math.sqrt(frac) * maxRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.82;
    skillParticles.push({
      label: skill.label,
      x,
      y,
      ox: x,
      oy: y,
      vx: 0,
      vy: 0,
      weight: skill.weight,
      size,
      w: labelWidth,
      h: labelHeight,
    });
  });

  // Relaxation (build-time only): separate overlapping labels and eject any
  // that fall over the name, keeping everything inside the canvas.
  const gapX = 24 * labelScale;
  const gapY = 16 * labelScale;
  for (let iter = 0; iter < 160; iter += 1) {
    for (let i = 0; i < skillParticles.length; i += 1) {
      const a = skillParticles[i];
      for (let j = i + 1; j < skillParticles.length; j += 1) {
        const b = skillParticles[j];
        const dx = b.ox - a.ox;
        const dy = b.oy - a.oy;
        const penX = (a.w + b.w) / 2 + gapX - Math.abs(dx);
        const penY = (a.h + b.h) / 2 + gapY - Math.abs(dy);
        if (penX > 0 && penY > 0) {
          if (penX < penY) {
            const push = ((dx < 0 ? -1 : 1) * penX) / 2;
            a.ox -= push;
            b.ox += push;
          } else {
            const push = ((dy < 0 ? -1 : 1) * penY) / 2;
            a.oy -= push;
            b.oy += push;
          }
        }
      }
    }
    for (const s of skillParticles) {
      // Eject vertically out of the name's bounding box (the band is wide but
      // short) so labels frame the name above and below it.
      const penX = nameHalfW + namePadding + s.w / 2 - Math.abs(s.ox - centerX);
      const penY = nameHalfH + namePadding + s.h / 2 - Math.abs(s.oy - centerY);
      if (penX > 0 && penY > 0) {
        s.oy += (s.oy < centerY ? -1 : 1) * penY;
      }
      const minX = canvasPadding + s.w / 2;
      const maxX = width - canvasPadding - s.w / 2;
      const minY = canvasPadding + s.h / 2;
      const maxY = height - canvasPadding - s.h / 2;
      s.ox = Math.min(Math.max(s.ox, minX), maxX);
      s.oy = Math.min(Math.max(s.oy, minY), maxY);
    }
  }
  for (const s of skillParticles) {
    s.x = s.ox;
    s.y = s.oy;
  }
}

function drawParticles() {
  const { width, height } = canvas.getBoundingClientRect();

  ctx.clearRect(0, 0, width, height);

  // Soft radial glow behind the name for a lit, premium feel (one cheap fill).
  const glowRadius = Math.min(width, height) * 0.5;
  const glow = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, glowRadius
  );
  glow.addColorStop(0, "rgba(70, 150, 255, 0.10)");
  glow.addColorStop(0.55, "rgba(60, 120, 220, 0.035)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const repelRadius = Math.min(width, height) * 0.22;
  const attractBand = repelRadius * 0.55;

  ctx.fillStyle = "rgba(120, 195, 255, 0.92)";
  for (const particle of particles) {
    const dx = particle.x - pointer.x;
    const dy = particle.y - pointer.y;
    const distance = Math.hypot(dx, dy) || 1;

    if (pointer.active && distance < repelRadius) {
      const influence = 1 - distance / repelRadius;
      const direction = distance < attractBand ? -1 : 1;
      const force = influence * 5 * direction;
      particle.vx += (dx / distance) * force;
      particle.vy += (dy / distance) * force;
    }

    particle.vx += (particle.ox - particle.x) * 0.02;
    particle.vy += (particle.oy - particle.y) * 0.02;

    particle.vx *= 0.9;
    particle.vy *= 0.9;

    // Collision with skill labels: scatter if touched.
    for (const skill of skillParticles) {
      const sdx = particle.x - skill.x;
      const sdy = particle.y - skill.y;
      const sdistance = Math.hypot(sdx, sdy) || 1;
      const skillRadius = 65;
      if (sdistance < skillRadius) {
        const sinfluence = 1 - sdistance / skillRadius;
        const sforce = sinfluence * 5;
        particle.vx += (sdx / sdistance) * sforce;
        particle.vy += (sdy / sdistance) * sforce;
      }
    }

    particle.x += particle.vx;
    particle.y += particle.vy;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw and animate the skill labels with a split-outline effect.
  tick += 0.01;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const skill of skillParticles) {
    const dx = skill.x - pointer.x;
    const dy = skill.y - pointer.y;
    const distance = Math.hypot(dx, dy) || 1;

    if (pointer.active && distance < repelRadius) {
      const influence = 1 - distance / repelRadius;
      const direction = distance < attractBand ? -1 : 1;
      const force = (influence * 3.2 * direction) / skill.weight;
      skill.vx += (dx / distance) * force;
      skill.vy += (dy / distance) * force;
    }

    const returnStrength = 0.015 / skill.weight;
    skill.vx += (skill.ox - skill.x) * returnStrength;
    skill.vy += (skill.oy - skill.y) * returnStrength;
    skill.vx *= 0.88;
    skill.vy *= 0.88;
    
    // Wave cascade motion: each skill floats with a staggered phase. The wave
    // is applied as a render-time offset (rx/ry below) rather than mutating the
    // stored position, so labels never drift off-canvas on narrow screens.
    const wavePhase = (skill.ox + skill.oy) * 0.008;
    const cascadeWave = Math.sin(tick * 1.2 + wavePhase) * 9 * labelScale;
    const cascadeWaveX = Math.cos(tick * 0.9 + wavePhase + 0.3) * 7 * labelScale;
    const cascadeScale = 0.95 + Math.sin(tick * 1.2 + wavePhase + 0.5) * 0.05;

    skill.x += skill.vx;
    skill.y += skill.vy;
    skill.scale = cascadeScale;

    const rx = Math.min(Math.max(skill.x + cascadeWaveX, skill.w / 2 + 6), width - skill.w / 2 - 6);
    const ry = Math.min(Math.max(skill.y + cascadeWave, skill.h / 2 + 6), height - skill.h / 2 - 6);

    const influence = pointer.active
      ? Math.max(0, 1 - distance / repelRadius)
      : 0.05;
    const split = (8 + Math.sin(tick + skill.ox * 0.01) * 3) *
      (influence * (2 - skill.weight * 0.6));
    const offsetX = (dx / distance) * split;
    const offsetY = (dy / distance) * split;

    ctx.font = `600 ${skill.size}px "Space Grotesk", sans-serif`;
    const opacity = Math.min(1, 0.62 + skill.weight * 0.24);

    // Cool blue-gray for minor skills, brightening toward cyan for the key
    // ones, so the tech stack reads as a hierarchy while staying on-palette.
    const wN = Math.min(1, Math.max(0, (skill.weight - 0.8) / 1.2));
    const cr = Math.round(120 + wN * 20);
    const cg = Math.round(150 + wN * 72);
    const cb = Math.round(192 + wN * 63);

    // Apply wave cascade scale with context transform.
    ctx.save();
    ctx.translate(rx, ry);
    ctx.scale(skill.scale || 1, skill.scale || 1);
    ctx.translate(-rx, -ry);

    // Draw a circle around the skill based on its weight.
    const circleRadius = 16 + skill.weight * 14;
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${opacity * 0.26})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(rx, ry, circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle glow that scales with importance.
    ctx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, ${0.35 + wN * 0.4})`;
    ctx.shadowBlur = 6 + wN * 12;

    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${opacity * 0.85})`;
    ctx.fillText(skill.label, rx + offsetX, ry + offsetY);
    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${opacity})`;
    ctx.fillText(skill.label, rx - offsetX, ry - offsetY);

    ctx.restore();
  }

  requestAnimationFrame(drawParticles);
}

resizeCanvas();
buildParticles();
drawParticles();

// The name and skill labels are rasterized with "Space Grotesk". Rebuild once the
// web font has loaded so the particle shapes and labels match the intended typeface.
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('700 100px "Space Grotesk"'),
    document.fonts.load('600 40px "Space Grotesk"'),
  ])
    .then(() => buildParticles())
    .catch(() => {});
}

window.addEventListener("resize", () => {
  resizeCanvas();
  buildParticles();
});

canvas.addEventListener("mousemove", updatePointer);
canvas.addEventListener("mouseleave", fadePointer);
canvas.addEventListener("touchstart", updatePointerTouch, { passive: true });
canvas.addEventListener("touchmove", updatePointerTouch, { passive: true });
canvas.addEventListener("touchend", fadePointer);

// Navigation: Double-click or long-press to go to profile page
let longPressTimer = null;
let touchStartTime = 0;

canvas.addEventListener("dblclick", () => {
  window.location.href = "profile.html";
});

canvas.addEventListener("touchstart", (e) => {
  touchStartTime = Date.now();
  longPressTimer = setTimeout(() => {
    // Visual feedback
    canvas.style.transition = "opacity 0.3s";
    canvas.style.opacity = "0.7";
    setTimeout(() => {
      window.location.href = "profile.html";
    }, 300);
  }, 800); // 800ms long press
}, { passive: true });

canvas.addEventListener("touchend", () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  canvas.style.opacity = "1";
}, { passive: true });

canvas.addEventListener("touchmove", () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}, { passive: true });
