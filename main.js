// ── Particle System ──────────────────────────────────────
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let W, H, particles;
const PARTICLE_COUNT = 60;
const mouse = { x: -9999, y: -9999 };

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

class Particle {
  constructor() { this.reset(true); }

  reset(initial) {
    this.x  = Math.random() * W;
    this.y  = initial ? Math.random() * H : H + 20;
    this.r  = Math.random() * 3 + 1.2;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -(Math.random() * 0.4 + 0.1);
    this.alpha = Math.random() * 0.5 + 0.15;
    this.targetAlpha = this.alpha;
  }

  update() {
    // gentle mouse attraction
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 180) {
      const force = (180 - dist) / 180 * 0.018;
      this.vx += dx / dist * force;
      this.vy += dy / dist * force;
    }

    // dampen
    this.vx *= 0.97;
    this.vy *= 0.97;

    this.x += this.vx;
    this.y += this.vy;

    // recycle off-screen
    if (this.y < -20 || this.x < -40 || this.x > W + 40) this.reset(false);
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 2.5);
    grad.addColorStop(0, 'rgba(125,211,252,0.9)');
    grad.addColorStop(0.5, 'rgba(56,189,248,0.4)');
    grad.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // solid core
    ctx.globalAlpha = this.alpha * 0.9;
    ctx.fillStyle = 'rgba(186,230,255,0.95)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function initParticles() {
  particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
}

function animate() {
  ctx.clearRect(0, 0, W, H);

  // draw faint connection lines near mouse
  particles.forEach(p => {
    const dx = mouse.x - p.x;
    const dy = mouse.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 130) {
      ctx.save();
      ctx.globalAlpha = (1 - d / 130) * 0.12;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.stroke();
      ctx.restore();
    }
  });

  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animate);
}

window.addEventListener('resize', () => { resize(); initParticles(); });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

resize();
initParticles();
animate();

// ── Scroll Reveal ────────────────────────────────────────
const observer = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
);

document.querySelectorAll(
  '.timeline-card, .project-card, .edu-item, .about-text, .skills-box'
).forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${(i % 3) * 80}ms`;
  observer.observe(el);
});

// ── Navbar active link ───────────────────────────────────
const sections  = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 140) current = s.id;
  });
  navLinks.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}` ? 'var(--accent)' : '';
  });
}, { passive: true });
