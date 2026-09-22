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

// ── AMBIENT blobs: dynamic drifting background ────────────
class AmbientBlob {
  constructor() {
    this.baseX    = W * (0.05 + Math.random() * 0.90);
    this.baseY    = H * (0.05 + Math.random() * 0.90);
    this.x        = this.baseX;
    this.y        = this.baseY;
    this.baseR    = 120 + Math.random() * 160;
    this.r        = this.baseR;
    this.baseAlpha = 0.38 + Math.random() * 0.28;
    this.alpha    = this.baseAlpha;
    this.hue      = 190 + Math.random() * 30;
    this.phase    = Math.random() * Math.PI * 2;
    this.pPhase   = Math.random() * Math.PI * 2; // pulse phase
    this.freq     = 0.00028 + Math.random() * 0.00035;
    this.pFreq    = 0.0006  + Math.random() * 0.0008;  // pulse freq (faster)
    this.drift    = 50 + Math.random() * 70;
    this.hueShift = (Math.random() - 0.5) * 0.012;     // slow hue drift
  }
  update(t) {
    // position drift
    this.x = this.baseX + Math.cos(t * this.freq + this.phase) * this.drift;
    this.y = this.baseY + Math.sin(t * this.freq * 1.4 + this.phase + 1) * this.drift * 0.65;
    // size pulse
    const pulse = Math.sin(t * this.pFreq + this.pPhase);
    this.r      = this.baseR * (1 + pulse * 0.22);
    // alpha breathe
    this.alpha  = this.baseAlpha * (0.72 + (pulse + 1) * 0.22);
    // slow hue drift
    this.hue   += this.hueShift;
  }
  draw() {
    ctx.save();
    ctx.filter = 'blur(38px)';
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,    `hsla(${this.hue},92%,72%,${this.alpha})`);
    g.addColorStop(0.45, `hsla(${this.hue},86%,64%,${this.alpha * 0.45})`);
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

const PARTICLE_COUNT = 180;  // denser
const RING_R_BASE    = 34;

class RingParticle {
  constructor(i, total) {
    this.angle  = (i / total) * Math.PI * 2;
    this.ringR  = RING_R_BASE * (0.65 + Math.random() * 0.6);
    this.x  = -400;
    this.y  = -400;
    this.vx = 0;
    this.vy = 0;
    this.k    = 0.038 + Math.random() * 0.078;
    this.damp = 0.78  + Math.random() * 0.12;
    this.dotR = 0.6   + Math.random() * 0.9;   // smaller dots
    this.a    = 0.55  + Math.random() * 0.42;
    const g   = 155 + Math.floor(Math.random() * 50);
    const b   = 200 + Math.floor(Math.random() * 40);
    this.fill = `rgba(14,${g},${b},${this.a.toFixed(2)})`;
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
  ambientBlobs  = Array.from({ length: 8 }, () => new AmbientBlob());
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
