// ── Canvas ───────────────────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// ── Mouse ────────────────────────────────────────────────
const mouse = { x: null, y: null };

window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});
window.addEventListener('touchmove', e => {
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', () => {
  mouse.x = null;
  mouse.y = null;
});

// ── AMBIENT blobs: always-on drifting background texture ─
class AmbientBlob {
  constructor() {
    this.baseX = W * (0.08 + Math.random() * 0.84);
    this.baseY = H * (0.05 + Math.random() * 0.90);
    this.x     = this.baseX;
    this.y     = this.baseY;
    this.r     = 100 + Math.random() * 140;
    this.alpha = 0.22 + Math.random() * 0.18;
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
    g.addColorStop(0.55, `hsla(${this.hue},85%,62%,${this.alpha * 0.35})`);
    g.addColorStop(1,    `hsla(${this.hue},80%,58%,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── RING PARTICLES: small dots, spring toward ring around cursor ─
// Different stiffness → different speeds → natural scatter when moving,
// tight ring when still. Ergonomic speed: stiffness 0.04–0.11.
const PARTICLE_COUNT = 100;

class RingParticle {
  constructor(i, total) {
    this.angle  = (i / total) * Math.PI * 2;
    this.ringR  = 26 + Math.random() * 22;   // each dot's ring radius
    // start off-screen
    this.x  = -300;
    this.y  = -300;
    this.vx = 0;
    this.vy = 0;
    // VARIED spring speed — key to the scatter effect
    this.k    = 0.04 + Math.random() * 0.075;
    this.damp = 0.78 + Math.random() * 0.12;
    this.r    = 1.4 + Math.random() * 1.8;
    this.alpha = 0.5 + Math.random() * 0.45;
    // slightly varied cyan hue
    this.color = `rgba(${14 + Math.floor(Math.random()*30)},${155 + Math.floor(Math.random()*40)},${220 + Math.floor(Math.random()*35)},${this.alpha.toFixed(2)})`;
  }

  update(mx, my) {
    // target = ring position around cursor
    const tx = mx + Math.cos(this.angle) * this.ringR;
    const ty = my + Math.sin(this.angle) * this.ringR;
    // spring toward target
    this.vx = this.vx * this.damp + (tx - this.x) * this.k;
    this.vy = this.vy * this.damp + (ty - this.y) * this.k;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// ── Init ─────────────────────────────────────────────────
let ambientBlobs   = [];
let ringParticles  = [];

function init() {
  ambientBlobs  = Array.from({ length: 6 }, () => new AmbientBlob());
  ringParticles = Array.from({ length: PARTICLE_COUNT }, (_, i) => new RingParticle(i, PARTICLE_COUNT));
}

// ── Animate ───────────────────────────────────────────────
let t = 0;

function animate() {
  ctx.clearRect(0, 0, W, H);
  t += 16;

  // 1. ambient background blobs (always on)
  ambientBlobs.forEach(b => { b.update(t); b.draw(); });

  // 2. ring particles — only active when mouse is on screen
  if (mouse.x !== null) {
    ctx.save();
    ringParticles.forEach(p => {
      p.update(mouse.x, mouse.y);
      p.draw();
    });
    ctx.restore();
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
document.querySelectorAll('.timeline-card, .project-card, .edu-item, .about-text, .skills-box')
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
