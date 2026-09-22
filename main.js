// ── Canvas ───────────────────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ── Fluid Gradient Background ────────────────────────────
// Multiple large blue blobs flowing in sine paths,
// blending together into a living mesh gradient.
const BG_COLORS = [
  { h: 200, s: 88, l: 74 },  // sky blue
  { h: 195, s: 82, l: 80 },  // light cyan-blue
  { h: 210, s: 75, l: 76 },  // cornflower
  { h: 188, s: 90, l: 72 },  // teal-blue
  { h: 215, s: 70, l: 78 },  // periwinkle
  { h: 198, s: 85, l: 70 },  // medium sky
  { h: 205, s: 78, l: 75 },  // steel blue
  { h: 220, s: 65, l: 82 },  // pale lavender-blue
  { h: 192, s: 92, l: 76 },  // aqua blue
  { h: 212, s: 72, l: 73 },  // slate blue
];

class GradientBlob {
  constructor(i) {
    const c        = BG_COLORS[i % BG_COLORS.length];
    this.h         = c.h;
    this.s         = c.s;
    this.l         = c.l;
    // center of elliptical orbit
    this.cx        = W * (0.1 + Math.random() * 0.8);
    this.cy        = H * (0.1 + Math.random() * 0.8);
    // orbit size
    this.rx        = W  * (0.25 + Math.random() * 0.35);
    this.ry        = H  * (0.20 + Math.random() * 0.30);
    this.r         = Math.min(W, H) * (0.28 + Math.random() * 0.30);
    this.alpha     = 0.55 + Math.random() * 0.28;
    this.phase     = Math.random() * Math.PI * 2;
    this.phaseY    = Math.random() * Math.PI * 2;
    this.speed     = 0.0000077 + Math.random() * 0.00001;
    this.hDrift    = (Math.random() - 0.5) * 0.015;
  }
  update(t) {
    this.x  = this.cx + Math.cos(t * this.speed + this.phase)  * this.rx;
    this.y  = this.cy + Math.sin(t * this.speed * 0.8 + this.phaseY) * this.ry;
    this.h += this.hDrift;
    // keep hue in blue range 185–225
    if (this.h > 225) this.hDrift = -Math.abs(this.hDrift);
    if (this.h < 185) this.hDrift =  Math.abs(this.hDrift);
  }
  draw() {
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,   `hsla(${this.h},${this.s}%,${this.l}%,${this.alpha})`);
    g.addColorStop(0.4, `hsla(${this.h},${this.s}%,${this.l+4}%,${this.alpha * 0.6})`);
    g.addColorStop(0.75,`hsla(${this.h},${this.s}%,${this.l+6}%,${this.alpha * 0.15})`);
    g.addColorStop(1,   `hsla(${this.h},${this.s}%,${this.l+8}%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
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

// ── AMBIENT blobs (removed — replaced by GradientBlob) ────
class AmbientBlob {
  constructor() {
    this.baseX     = W * (0.05 + Math.random() * 0.90);
    this.baseY     = H * (0.05 + Math.random() * 0.90);
    this.x         = this.baseX;
    this.y         = this.baseY;
    this.baseR     = 160 + Math.random() * 200;
    this.r         = this.baseR;
    this.baseAlpha = 0.62 + Math.random() * 0.25;  // much stronger
    this.alpha     = this.baseAlpha;
    this.hue       = 188 + Math.random() * 35;
    this.sat       = 80 + Math.random() * 15;
    this.phase     = Math.random() * Math.PI * 2;
    this.pPhase    = Math.random() * Math.PI * 2;
    this.freq      = 0.0004 + Math.random() * 0.0005;   // faster drift
    this.pFreq     = 0.001  + Math.random() * 0.0012;   // faster pulse
    this.drift     = 80 + Math.random() * 100;           // wider movement
    this.hueShift  = (Math.random() - 0.5) * 0.02;
  }
  update(t) {
    this.x    = this.baseX + Math.cos(t * this.freq + this.phase) * this.drift;
    this.y    = this.baseY + Math.sin(t * this.freq * 1.5 + this.phase + 1) * this.drift * 0.7;
    const p   = Math.sin(t * this.pFreq + this.pPhase);
    this.r    = this.baseR * (1 + p * 0.32);             // bigger pulse ±32%
    this.alpha = this.baseAlpha * (0.65 + (p + 1) * 0.25);
    this.hue  += this.hueShift;
  }
  draw() {
    // inner solid core (no blur filter — stays visible on light bg)
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,    `hsla(${this.hue},${this.sat}%,68%,${this.alpha})`);
    g.addColorStop(0.35, `hsla(${this.hue},${this.sat}%,65%,${this.alpha * 0.7})`);
    g.addColorStop(0.7,  `hsla(${this.hue},${this.sat}%,60%,${this.alpha * 0.2})`);
    g.addColorStop(1,    `hsla(${this.hue},${this.sat}%,58%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
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
let gradientBlobs = [];
let ringParticles = [];

function init() {
  gradientBlobs = Array.from({ length: 10 }, (_, i) => new GradientBlob(i));
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

  // 1. white base so blobs blend cleanly
  ctx.fillStyle = 'rgba(240,248,255,1)';
  ctx.fillRect(0, 0, W, H);

  // 2. flowing gradient blobs
  gradientBlobs.forEach(b => { b.update(t); b.draw(); });

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

// ── Avatar smile interaction ──────────────────────────────
const avatar   = document.querySelector('.hero-avatar');
const navLogo  = document.getElementById('nav-logo-trigger');
let smileTimer = null;

function triggerSmile() {
  if (!avatar) return;
  avatar.classList.add('smiling');
  clearTimeout(smileTimer);
  smileTimer = setTimeout(() => avatar.classList.remove('smiling'), 1000);
}

if (navLogo) navLogo.addEventListener('click', triggerSmile);

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
