// ── Canvas ───────────────────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ── Mouse tracking ───────────────────────────────────────
const mouse = { x: null, y: null, speed: 0 };
let lastMX = 0, lastMY = 0;

window.addEventListener('mousemove', e => {
  const dx = e.clientX - lastMX;
  const dy = e.clientY - lastMY;
  if (mouse.x !== null)
    mouse.speed = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
  lastMX = mouse.x = e.clientX;
  lastMY = mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; mouse.speed = 0; });
window.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouse.speed = Math.min(Math.hypot(t.clientX - lastMX, t.clientY - lastMY), 40);
  lastMX = mouse.x = t.clientX;
  lastMY = mouse.y = t.clientY;
}, { passive: true });
window.addEventListener('touchend', () => { mouse.x = null; mouse.y = null; });

// ── AMBIENT blobs: slow-drifting background texture ───────
class AmbientBlob {
  constructor() {
    this.baseX = W * (0.08 + Math.random() * 0.84);
    this.baseY = H * (0.05 + Math.random() * 0.90);
    this.x     = this.baseX;
    this.y     = this.baseY;
    this.r     = 100 + Math.random() * 140;
    this.alpha = 0.20 + Math.random() * 0.18;
    this.hue   = 193 + Math.random() * 22;
    this.phase = Math.random() * Math.PI * 2;
    this.freq  = 0.00022 + Math.random() * 0.00028;
    this.drift = 30 + Math.random() * 40;
  }
  update(t) {
    this.x = this.baseX + Math.cos(t * this.freq + this.phase) * this.drift;
    this.y = this.baseY + Math.sin(t * this.freq * 1.3 + this.phase + 1) * this.drift * 0.6;
  }
  draw() {
    ctx.save();
    ctx.filter = 'blur(40px)';
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,    `hsla(${this.hue},90%,72%,${this.alpha})`);
    g.addColorStop(0.55, `hsla(${this.hue},85%,62%,${this.alpha * 0.3})`);
    g.addColorStop(1,    `hsla(${this.hue},80%,58%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── RING PARTICLES ───────────────────────────────────────
// Key mechanic:
//   still  → each particle springs to its ring position around cursor
//   moving → ring radius collapses (target = near cursor),
//             different spring speeds create the trailing-behind-cursor effect
//   The trail is always in the direction OPPOSITE to movement,
//   because slower particles haven't caught up yet.

const PARTICLE_COUNT = 100;
const RING_R_BASE    = 38; // px, max ring radius when still

class RingParticle {
  constructor(i, total) {
    this.angle  = (i / total) * Math.PI * 2;
    this.ringR  = RING_R_BASE * (0.7 + Math.random() * 0.55); // slight variation
    this.x  = -400;
    this.y  = -400;
    this.vx = 0;
    this.vy = 0;
    // Varied stiffness → varied chase speed (ergonomic range)
    this.k    = 0.038 + Math.random() * 0.078;
    this.damp = 0.78  + Math.random() * 0.12;
    this.dotR = 1.4   + Math.random() * 1.7;
    this.a    = 0.50  + Math.random() * 0.45;
    // slight cyan hue variation
    const b   = 200 + Math.floor(Math.random() * 38);
    this.fill = `rgba(14,${155 + Math.floor(Math.random()*45)},${b},${this.a.toFixed(2)})`;
  }

  update(mx, my, collapse) {
    // collapse: 0 = full ring (still), 1 = all converge to cursor (moving fast)
    const r  = this.ringR * (1 - collapse);
    const tx = mx + Math.cos(this.angle) * r;
    const ty = my + Math.sin(this.angle) * r;

    this.vx = this.vx * this.damp + (tx - this.x) * this.k;
    this.vy = this.vy * this.damp + (ty - this.y) * this.k;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.dotR, 0, Math.PI * 2);
    ctx.fillStyle = this.fill;
    ctx.fill();
  }
}

// ── Init ─────────────────────────────────────────────────
let ambientBlobs  = [];
let ringParticles = [];

function init() {
  ambientBlobs  = Array.from({ length: 6 }, () => new AmbientBlob());
  ringParticles = Array.from({ length: PARTICLE_COUNT }, (_, i) => new RingParticle(i, PARTICLE_COUNT));
}

// ── Animate ───────────────────────────────────────────────
let t = 0;

function animate() {
  ctx.clearRect(0, 0, W, H);
  t += 16;

  // decay speed each frame so ring re-forms after mouse stops
  mouse.speed *= 0.82;
  const collapse = Math.min(mouse.speed / 18, 1);

  // 1. ambient blobs
  ambientBlobs.forEach(b => { b.update(t); b.draw(); });

  // 2. ring particles
  if (mouse.x !== null) {
    ringParticles.forEach(p => {
      p.update(mouse.x, mouse.y, collapse);
      p.draw();
    });
  }

  requestAnimationFrame(animate);
}

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('resize', () => { resize(); init(); });
resize();
init();
requestAnimationFrame(animate);

// ── Scroll Reveal ─────────────────────────────────────────
const revealObs = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);
document.querySelectorAll('.timeline-card,.project-card,.edu-item,.about-text,.skills-box')
  .forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    revealObs.observe(el);
  });

// ── Navbar active ─────────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 140) cur = s.id; });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${cur}` ? 'var(--accent2)' : '';
  });
}, { passive: true });
