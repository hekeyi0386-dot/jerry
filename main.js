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
  { h: 200, s: 85, l: 76 },
  { h: 190, s: 80, l: 80 },
  { h: 210, s: 78, l: 78 },
  { h: 185, s: 82, l: 74 },
  { h: 218, s: 72, l: 82 },
  { h: 197, s: 84, l: 75 },
  { h: 204, s: 76, l: 77 },
  { h: 222, s: 68, l: 84 },
  { h: 193, s: 86, l: 73 },
  { h: 213, s: 74, l: 79 },
];

class GradientBlob {
  constructor(i) {
    const c        = BG_COLORS[i % BG_COLORS.length];
    this.h         = c.h;
    this.s         = c.s;
    this.l         = c.l;
    this.cx        = W * (0.1 + Math.random() * 0.8);
    this.cy        = H * (0.1 + Math.random() * 0.8);
    // very tiny orbit so movement is barely perceptible
    this.rx        = W  * (0.02 + Math.random() * 0.03);
    this.ry        = H  * (0.02 + Math.random() * 0.03);
    this.r         = Math.min(W, H) * (0.30 + Math.random() * 0.32);
    this.alpha     = 0.48 + Math.random() * 0.18;
    this.phase     = Math.random() * Math.PI * 2;
    this.phaseY    = Math.random() * Math.PI * 2;
    // extremely slow drift
    this.speed     = 0.0000006 + Math.random() * 0.0000006;
    this.hDrift    = (Math.random() - 0.5) * 0.008;
  }
  update(t) {
    this.x  = this.cx + Math.cos(t * this.speed + this.phase)  * this.rx;
    this.y  = this.cy + Math.sin(t * this.speed * 0.7 + this.phaseY) * this.ry;
    this.h += this.hDrift;
    if (this.h > 225) this.hDrift = -Math.abs(this.hDrift);
    if (this.h < 183) this.hDrift =  Math.abs(this.hDrift);
  }
  draw() {
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
    g.addColorStop(0,    `hsla(${this.h},${this.s}%,${this.l}%,${this.alpha})`);
    g.addColorStop(0.45, `hsla(${this.h},${this.s}%,${this.l+5}%,${this.alpha * 0.55})`);
    g.addColorStop(0.78, `hsla(${this.h},${this.s}%,${this.l+10}%,${this.alpha * 0.12})`);
    g.addColorStop(1,    `hsla(${this.h},${this.s}%,${this.l+14}%,0)`);
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
  mouse.speed = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
  lastMX = mouse.x = e.clientX;
  lastMY = mouse.y = e.clientY;
  const count = Math.max(5, Math.floor(mouse.speed * 2.0));
  emitDust(mouse.x, mouse.y, count);
});
window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; mouse.speed = 0; });
window.addEventListener('touchmove', e => {
  const touch = e.touches[0];
  mouse.speed = Math.min(Math.hypot(touch.clientX - lastMX, touch.clientY - lastMY), 40);
  lastMX = mouse.x = touch.clientX;
  lastMY = mouse.y = touch.clientY;
  emitDust(mouse.x, mouse.y, Math.max(5, Math.floor(mouse.speed * 2.0)));
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

// ── DUST TRAIL PARTICLES ─────────────────────────────────
// Emitted at cursor when mouse moves; drift with slight gravity and fade.

const MAX_DUST = 1200;
const dustPool = [];

class DustParticle {
  reset(x, y, speed) {
    const spread = Math.min(speed * 0.6, 8);
    const angle  = Math.random() * Math.PI * 2;
    this.x    = x + (Math.random() - 0.5) * 4;
    this.y    = y + (Math.random() - 0.5) * 4;
    this.vx   = Math.cos(angle) * spread * (0.1 + Math.random() * 0.4);
    this.vy   = Math.sin(angle) * spread * (0.1 + Math.random() * 0.4) - Math.random() * 0.6;
    this.r    = 1.5 + Math.random() * 3.5;
    this.life = 1.0;
    this.decay = 0.005 + Math.random() * 0.008;
    this.hue  = 190 + Math.random() * 30;
    this.alive = true;
    return this;
  }
  update() {
    this.vx *= 0.97;
    this.vy  = this.vy * 0.97 + 0.04;
    this.x  += this.vx;
    this.y  += this.vy;
    this.life -= this.decay;
    if (this.life <= 0) this.alive = false;
  }
  draw() {
    const a = this.life * 0.65;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue},85%,55%,${a.toFixed(3)})`;
    ctx.fill();
  }
}

function emitDust(x, y, count) {
  const speed = mouse.speed;
  for (let i = 0; i < count; i++) {
    const dead = dustPool.find(p => !p.alive);
    if (dead) {
      dead.reset(x, y, speed);
    } else if (dustPool.length < MAX_DUST) {
      dustPool.push(new DustParticle().reset(x, y, speed));
    }
  }
}

// ── Init ─────────────────────────────────────────────────
let gradientBlobs = [];

function init() {
  gradientBlobs = Array.from({ length: 10 }, (_, i) => new GradientBlob(i));
}

// ── Animate ───────────────────────────────────────────────
let t = 0;

function animate() {
  ctx.clearRect(0, 0, W, H);
  t += 16;

  ctx.fillStyle = 'rgba(240,248,255,1)';
  ctx.fillRect(0, 0, W, H);

  gradientBlobs.forEach(b => { b.update(t); b.draw(); });

  for (let i = 0; i < dustPool.length; i++) {
    if (dustPool[i].alive) { dustPool[i].update(); dustPool[i].draw(); }
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
const avatar   = document.querySelector('.nav-avatar');
const navLogo  = document.getElementById('nav-logo-trigger');
let smileTimer = null;

function triggerSmile() {
  if (!avatar) return;
  avatar.classList.add('smiling');
  clearTimeout(smileTimer);
  smileTimer = setTimeout(() => avatar.classList.remove('smiling'), 1500);
}

document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', triggerSmile));

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
