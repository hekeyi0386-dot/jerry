// ── Blob Particle System ─────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');

let W, H;
const mouse = { x: -999, y: -999, vx: 0, vy: 0, speed: 0 };
let lastMX = 0, lastMY = 0;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ── Blob class ───────────────────────────────────────────
class Blob {
  constructor(i, total) {
    const angle = (i / total) * Math.PI * 2 + Math.random() * 0.5;
    this.scatterAngle = angle;
    this.scatterRadius = 140 + Math.random() * 120;
    this.x  = W / 2 + Math.cos(angle) * this.scatterRadius;
    this.y  = H / 2 + Math.sin(angle) * this.scatterRadius;
    this.vx = 0;
    this.vy = 0;
    this.r  = 90 + Math.random() * 70;      // visual radius of glow
    this.stiffness = 0.028 + Math.random() * 0.022;
    this.damping   = 0.86 + Math.random() * 0.06;
    this.alpha     = 0.55 + Math.random() * 0.3;
    // subtle hue shift (sky-blue range)
    this.hue = 195 + Math.random() * 20;
  }

  update(scatter) {
    // target when clustered: near mouse
    const cx = mouse.x + (Math.random() - 0.5) * 8;
    const cy = mouse.y + (Math.random() - 0.5) * 8;

    // target when scattered: mouse + outward direction
    const boom = 1 + scatter * 2.2;
    const sx = mouse.x + Math.cos(this.scatterAngle) * this.scatterRadius * boom;
    const sy = mouse.y + Math.sin(this.scatterAngle) * this.scatterRadius * boom;

    const tx = cx + (sx - cx) * scatter;
    const ty = cy + (sy - cy) * scatter;

    this.vx += (tx - this.x) * this.stiffness;
    this.vy += (ty - this.y) * this.stiffness;
    this.vx *= this.damping;
    this.vy *= this.damping;
    this.x  += this.vx;
    this.y  += this.vy;
  }

  draw() {
    ctx.save();
    ctx.filter = 'blur(28px)';
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,   `hsla(${this.hue},95%,78%,${this.alpha})`);
    g.addColorStop(0.5, `hsla(${this.hue},90%,60%,${this.alpha * 0.55})`);
    g.addColorStop(1,   `hsla(${this.hue},85%,55%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── White center glow ─────────────────────────────────────
function drawCenter(scatter) {
  const intensity = Math.pow(1 - scatter, 2); // sharp falloff
  if (intensity < 0.03 || mouse.x < 0) return;

  ctx.save();
  // outer soft halo
  ctx.filter = 'blur(16px)';
  const g2 = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 70);
  g2.addColorStop(0,   `rgba(220,245,255,${intensity * 0.9})`);
  g2.addColorStop(0.5, `rgba(147,221,253,${intensity * 0.45})`);
  g2.addColorStop(1,   'rgba(56,189,248,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 70, 0, Math.PI * 2);
  ctx.fill();

  // crisp white core circle
  ctx.filter = 'none';
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 10 * intensity, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${intensity * 0.95})`;
  ctx.fill();
  ctx.restore();
}

// ── Init ─────────────────────────────────────────────────
const BLOB_COUNT = 8;
let blobs = [];

function initBlobs() {
  blobs = Array.from({ length: BLOB_COUNT }, (_, i) => new Blob(i, BLOB_COUNT));
}

// ── Animate ───────────────────────────────────────────────
let prevTime = 0;

function animate(ts) {
  const dt = Math.min((ts - prevTime) / 16.67, 3);
  prevTime = ts;

  ctx.clearRect(0, 0, W, H);

  // mouse speed → scatter factor [0,1]
  mouse.speed *= 0.88;
  const scatter = Math.min(mouse.speed / 18, 1);

  drawCenter(scatter);
  blobs.forEach(b => { b.update(scatter); b.draw(); });

  requestAnimationFrame(animate);
}

// ── Events ────────────────────────────────────────────────
window.addEventListener('mousemove', e => {
  mouse.vx = e.clientX - lastMX;
  mouse.vy = e.clientY - lastMY;
  mouse.speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
  lastMX = mouse.x = e.clientX;
  lastMY = mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = W / 2;
  mouse.y = H / 2;
  mouse.speed = 0;
});

// touch support
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouse.speed = Math.hypot(t.clientX - lastMX, t.clientY - lastMY);
  lastMX = mouse.x = t.clientX;
  lastMY = mouse.y = t.clientY;
}, { passive: true });

window.addEventListener('resize', () => { resize(); initBlobs(); });

// ── Boot ──────────────────────────────────────────────────
resize();
mouse.x = W / 2;
mouse.y = H / 2;
initBlobs();
requestAnimationFrame(animate);

// ── Scroll Reveal ─────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);

document.querySelectorAll('.timeline-card, .project-card, .edu-item, .about-text, .skills-box')
  .forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    revealObserver.observe(el);
  });

// ── Navbar active ─────────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 140) current = s.id; });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}` ? 'var(--accent)' : '';
  });
}, { passive: true });
