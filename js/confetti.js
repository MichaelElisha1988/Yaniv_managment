/**
 * מודול אפקטי חגיגה וקונפטי (Confetti Effect)
 */

export function fireConfetti(duration = 2500) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#fbbf24', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#ffffff'];
  const particles = [];
  const particleCount = 120;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4 + (Math.random() - 0.5) * 100,
      radius: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -14 - 4,
      gravity: 0.45,
      tilt: Math.random() * 10 - 5,
      tiltAngle: 0,
      tiltAngleInc: (Math.random() * 0.07) + 0.04,
      opacity: 1,
    });
  }

  let startTime = Date.now();

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - startTime;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.tiltAngle += p.tiltAngleInc;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.tilt = Math.sin(p.tiltAngle) * 12;

      if (elapsed > duration * 0.7) {
        p.opacity = Math.max(0, 1 - (elapsed - duration * 0.7) / (duration * 0.3));
      }

      ctx.beginPath();
      ctx.lineWidth = p.radius;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.moveTo(p.x + p.tilt + p.radius / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.radius / 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(animate);
}
