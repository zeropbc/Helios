export function createResizeHandler(renderer, camera, composer) {
  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    if (composer) composer.setSize(width, height);
  }
  window.addEventListener("resize", onResize);
  return { onResize };
}