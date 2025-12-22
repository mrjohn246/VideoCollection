document.addEventListener("DOMContentLoaded", () => {
  // Solo móvil
  if (window.innerWidth > 600) return;

  // Observa visibilidad para pausar/reanudar animación
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, {
    threshold: 0.4
  });

  document.querySelectorAll(".music-card").forEach(card => {
    const wave = card.querySelector(".now-playing");
    if (!wave) return;

    // Leer el <p> que contiene Videos:
    const pVideos = Array.from(card.querySelectorAll(".text-block p"))
      .find(p => /Videos\s*:/i.test(p.textContent));
    if (!pVideos) return;

    const m = pVideos.textContent.match(/Videos\s*:\s*(\d+)/i);
    if (!m) return;

    const videoCount = parseInt(m[1], 10);

    // Escala que pediste
let bars;
if (videoCount < 100) {
  bars = 2;
} else if (videoCount < 250) {
  bars = 3;
} else if (videoCount < 550) {
  bars = 4;
} else {
  bars = 5;
}

    // Construir barras (con delays)
    wave.innerHTML = "";
    for (let i = 0; i < bars; i++) {
      const span = document.createElement("span");
      span.style.animationDelay = `${i * 0.15}s`;
      wave.appendChild(span);
    }

    // Activar/pausar según viewport
    observer.observe(card);
  });
});
