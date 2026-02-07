const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d");

const SETTINGS = {
  // Change this to your name.
  nameText: "Kota Konishi",
  // Skill labels that float around the name.
  skills: [
   // Languages
  { label: "Python", weight: 1.1 },
  { label: "JavaScript", weight: 1.4 },
  { label: "TypeScript", weight: 1.2 },
  { label: "HTML", weight: 0.9 },
  { label: "CSS", weight: 0.9 },
  { label: "Java", weight: 1.1 },
  { label: "PHP", weight: 1.0 },
  { label: "Rust", weight: 0.9 },
  { label: "SQL", weight: 0.8 },

  // Frameworks / Libraries
  { label: "Flask", weight: 1.2 },
  { label: "Three.js", weight: 1.6 },
  { label: "React", weight: 1.3 },
  { label: "Vue", weight: 1.1 },
  { label: "Django", weight: 1.0 },

  // Development / CI/CD
  { label: "Git", weight: 1.0 },
  { label: "GitHub Actions", weight: 1.2 },
  { label: "Docker", weight: 1.1 },
  { label: "Linux", weight: 0.9 },
  { label: "Windows", weight: 0.8 },
  { label: "VSCode", weight: 0.9 },
  { label: "GitHub Copilot", weight: 1.6 },
  { label: "AI-driven Dev", weight: 1.6 },

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

  // Place skill labels around the name area.
  skillParticles.length = 0;
  const ringRadius = Math.min(width, height) * 0.05;
  const centerX = width / 2;
  const centerY = height / 2;
  const nameBounds = {
    x: centerX - textWidth / 2,
    y: centerY - textHeight / 2,
    w: textWidth,
    h: textHeight,
  };
  const namePadding = Math.max(18, fontSize * 0.12);
  const minRadius = Math.max(textWidth, textHeight) * 0.6 + namePadding;
  const canvasPadding = 32;
  const skillList = SETTINGS.skills.map((skill) =>
    typeof skill === "string"
      ? { label: skill, weight: 1 }
      : { label: skill.label, weight: skill.weight ?? 1 }
  );

  skillList.forEach((skill, index) => {
    let x = centerX;
    let y = centerY;
    const size = 16 + skill.weight * 12 + Math.random() * 2;
    offCtx.font = `600 ${size}px "Space Grotesk", sans-serif`;
    const labelMetrics = offCtx.measureText(skill.label);
    const labelWidth = labelMetrics.width;
    const labelHeight =
      labelMetrics.actualBoundingBoxAscent +
      labelMetrics.actualBoundingBoxDescent;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const angle = (index / skillList.length) * Math.PI * 2 + Math.random() * 0.4;
      const radius =
        Math.max(minRadius, ringRadius) + Math.random() * ringRadius * 0.4;
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius * 0.7;

      // Keep labels inside the canvas bounds.
      const minX = canvasPadding + labelWidth / 2;
      const maxX = width - canvasPadding - labelWidth / 2;
      const minY = canvasPadding + labelHeight / 2;
      const maxY = height - canvasPadding - labelHeight / 2;
      x = Math.min(Math.max(x, minX), maxX);
      y = Math.min(Math.max(y, minY), maxY);
      break;
    }

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
    });
  });
}

function drawParticles() {
  const { width, height } = canvas.getBoundingClientRect();

  ctx.clearRect(0, 0, width, height);

  const repelRadius = Math.min(width, height) * 0.22;
  const attractBand = repelRadius * 0.55;

  ctx.fillStyle = "rgba(90, 162, 255, 0.9)";
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
    
    // Wave cascade motion: each skill floats with a staggered phase.
    const wavePhase = (skill.ox + skill.oy) * 0.008;
    const cascadeWave = Math.sin(tick * 1.2 + wavePhase) * 14;
    const cascadeWaveX = Math.cos(tick * 0.9 + wavePhase + 0.3) * 11;
    const cascadeScale = 0.95 + Math.sin(tick * 1.2 + wavePhase + 0.5) * 0.05;
    
    skill.x += skill.vx + cascadeWaveX;
    skill.y += skill.vy + cascadeWave;
    skill.scale = cascadeScale;

    const influence = pointer.active
      ? Math.max(0, 1 - distance / repelRadius)
      : 0.15;
    const split = (8 + Math.sin(tick + skill.ox * 0.01) * 3) *
      (influence * (2 - skill.weight * 0.6));
    const offsetX = (dx / distance) * split;
    const offsetY = (dy / distance) * split;

    ctx.font = `600 ${skill.size}px "Space Grotesk", sans-serif`;
    const opacity = 0.65 + skill.weight * 0.25;
    
    // Apply wave cascade scale with context transform.
    ctx.save();
    ctx.translate(skill.x, skill.y);
    ctx.scale(skill.scale || 1, skill.scale || 1);
    ctx.translate(-skill.x, -skill.y);
    
    // Draw a circle around the skill based on its weight.
    const circleRadius = 18 + skill.weight * 20;
    ctx.strokeStyle = `rgba(110, 115, 130, ${opacity * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(skill.x, skill.y, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = `rgba(110, 115, 130, ${opacity * 0.85})`;
    ctx.fillText(skill.label, skill.x + offsetX, skill.y + offsetY);
    ctx.fillStyle = `rgba(110, 115, 130, ${opacity + 0.05})`;
    ctx.fillText(skill.label, skill.x - offsetX, skill.y - offsetY);
    
    ctx.restore();
  }

  requestAnimationFrame(drawParticles);
}

resizeCanvas();
buildParticles();
drawParticles();

window.addEventListener("resize", () => {
  resizeCanvas();
  buildParticles();
});

canvas.addEventListener("mousemove", updatePointer);
canvas.addEventListener("mouseleave", fadePointer);
canvas.addEventListener("touchstart", updatePointerTouch, { passive: true });
canvas.addEventListener("touchmove", updatePointerTouch, { passive: true });
canvas.addEventListener("touchend", fadePointer);
