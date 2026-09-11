export function createLoop(update) {
  let rafId = 0;
  let last = performance.now();

  function step(now) {
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    update(delta);
    rafId = requestAnimationFrame(step);
  }

  return {
    start() {
      last = performance.now();
      rafId = requestAnimationFrame(step);
    },
    stop() {
      cancelAnimationFrame(rafId);
    },
  };
}