// ── Canvas Setup ─────────────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ── Mouse ────────────────────────────────────────────────
const mouse = { x: -9999, y: -9999, speed: 0 };
let lastMX = 0, lastMY = 0;

window.addEventListener('mousemove', e => {
  const dx = e.clientX - lastMX;
  const dy = e.clientY - lastMY;
  mouse.speed = Math.sqrt(dx * dx + dy * dy);
  lastMX = mouse.x = e.clientX;
  lastMY = mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => { mouse.x = W / 2; mouse.y = H / 2; mouse.speed = 0; });
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouse.speed = Math.hypot(t.clientX - lastMX, t.clientY - lastMY);
  lastMX = mouse.x = t.clientX;
  lastMY = mouse.y = t.clientY;
}, { passive: true });

// ── AMBIENT blobs: always visible, slowly drift ───────────
// These form the permanent irregular background pattern
class AmbientBlob {
  constructor() {
    this.reset();
    this.x = this.baseX;
    this.y = this.baseY;
  }

  reset() {
    this.baseX  = W * (0.08 + Math.random() * 0.84);
    this.baseY  = H * (0.05 + Math.random() * 0.9);
    this.r      = 110 + Math.random() * 130;
    this.alpha  = 0.28 + Math.random() * 0.22;
    this.hue    = 193 + Math.random() * 22;
    this.phase  = Math.random() * Math.PI * 2;
    this.freq   = 0.00025 + Math.random() * 0.0003;
    this.drift  = 35 + Math.random() * 45;
  }

  update(t) {
    this.x = this.baseX + Math.cos(t * this.freq + this.phase) * this.drift;
    this.y = this.baseY + Math.sin(t * this.freq * 1.4 + this.phase + 1) * this.drift * 0.65;
  }

  draw() {
    ctx.save();
    ctx.filter = 'blur(36px)';
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,   `hsla(${this.hue}, 92%, 74%, ${this.alpha})`);
    g.addColorStop(0.55,`hsla(${this.hue}, 86%, 64%, ${this.alpha * 0.38})`);
    g.addColorStop(1,   `hsla(${this.hue}, 80%, 58%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── INTERACTIVE blobs: follow mouse, scatter / converge ───
class InteractiveBlob {
  constructor(i, total) {
    const angle = (i / total) * Math.PI * 2 + Math.random() * 0.6;
    this.scatterAngle  = angle;
    this.scatterRadius = 130 + Math.random() * 110;
    this.x  = W / 2 + Math.cos(angle) * this.scatterRadius;
    this.y  = H / 2 + Math.sin(angle) * this.scatterRadius;
    this.vx = 0;
    this.vy = 0;
    this.r  = 80 + Math.random() * 65;
    this.stiffness = 0.03 + Math.random() * 0.025;
    this.damping   = 0.85 + Math.random() * 0.07;
    this.alpha     = 0.55 + Math.random() * 0.3;
    this.hue       = 197 + Math.random() * 18;
  }

  update(scatter) {
    const boom = 1 + scatter * 2.5;
    const sx = mouse.x + Math.cos(this.scatterAngle) * this.scatterRadius * boom;
    const sy = mouse.y + Math.sin(this.scatterAngle) * this.scatterRadius * boom;
    const tx = mouse.x + (sx - mouse.x) * scatter;
    const ty = mouse.y + (sy - mouse.y) * scatter;

    this.vx += (tx - this.x) * this.stiffness;
    this.vy += (ty - this.y) * this.stiffness;
    this.vx *= this.damping;
    this.vy *= this.damping;
    this.x  += this.vx;
    this.y  += this.vy;
  }

  draw() {
    ctx.save();
    ctx.filter = 'blur(26px)';
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,   `hsla(${this.hue}, 90%, 72%, ${this.alpha})`);
    g.addColorStop(0.5, `hsla(${this.hue}, 85%, 62%, ${this.alpha * 0.45})`);
    g.addColorStop(1,   `hsla(${this.hue}, 80%, 56%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── White center glow (shows when clustered) ──────────────
function drawCenter(scatter) {
  const intensity = Math.pow(1 - scatter, 2.5);
  if (intensity < 0.05 || mouse.x < 0) return;

  // soft halo
  ctx.save();
  ctx.filter = 'blur(18px)';
  const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 65);
  g.addColorStop(0,   `rgba(255,255,255,${intensity * 0.92})`);
  g.addColorStop(0.45,`rgba(200,238,255,${intensity * 0.5})`);
  g.addColorStop(1,   'rgba(147,221,253,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 65, 0, Math.PI * 2);
  ctx.fill();

  // crisp core
  ctx.filter = 'none';
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 9 * intensity, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${intensity * 0.98})`;
  ctx.fill();
  ctx.restore();
}

// ── Init ─────────────────────────────────────────────────
const AMBIENT_COUNT     = 6;
const INTERACTIVE_COUNT = 7;
let ambientBlobs = [], interactiveBlobs = [];

function init() {
  ambientBlobs     = Array.from({ length: AMBIENT_COUNT },     () => new AmbientBlob());
  interactiveBlobs = Array.from({ length: INTERACTIVE_COUNT }, (_, i) => new InteractiveBlob(i, INTERACTIVE_COUNT));
}

// ── Animate ───────────────────────────────────────────────
let t = 0;

function animate() {
  ctx.clearRect(0, 0, W, H);
  t += 16;

  // decay mouse speed
  mouse.speed *= 0.88;
  const scatter = Math.min(mouse.speed / 16, 1);

  // 1. ambient background blobs (always visible)
  ambientBlobs.forEach(b => { b.update(t); b.draw(); });

  // 2. interactive blobs (follow / scatter)
  interactiveBlobs.forEach(b => { b.update(scatter); b.draw(); });

  // 3. white center when converged
  drawCenter(scatter);

  requestAnimationFrame(animate);
}

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('resize', () => { resize(); init(); });
resize();
mouse.x = W / 2;
mouse.y = H / 2;
init();
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
    a.style.color = a.getAttribute('href') === `#${current}` ? 'var(--accent2)' : '';
  });
}, { passive: true });
