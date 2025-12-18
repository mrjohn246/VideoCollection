document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // 1) Recolectar data por categoría (para el donut) desde las tarjetas del grid
  // =========================
  const cards = document.querySelectorAll(".music-card:not(.floating-card)");
  const categorias = [];

  cards.forEach(card => {
    const h3 = card.querySelector(".text-block h3");
    const pVideos = Array.from(card.querySelectorAll(".text-block p"))
      .find(p => /Videos\s*:/i.test(p.textContent));

    if (!h3 || !pVideos) return;

    const mVideos = pVideos.textContent.match(/Videos:\s*([\d]+)/i);
    if (!mVideos) return;

    const videos = parseInt(mVideos[1], 10) || 0;
    categorias.push({ nombre: h3.textContent.trim(), videos });
  });

  // =========================
  // 2) Calcular totales (Videos / Peso / Tiempo)
  // =========================
  let totalVideos = 0;
  let totalPesoGiB = 0;
  let totalSegundos = 0;

  const items = document.querySelectorAll(".music-card:not(.floating-card) .text-block p");

  items.forEach(item => {
    const texto = item.textContent;

    const matchVideos = texto.match(/Videos:\s*([\d]+)/i);
    if (matchVideos) totalVideos += parseInt(matchVideos[1], 10) || 0;

    const matchPeso = texto.match(/Peso:\s*([\d.,]+)\s*(GiB|GB)/i);
    if (matchPeso) {
      let valor = parseFloat(matchPeso[1].replace(",", "."));
      if (!Number.isFinite(valor)) valor = 0;

      const unidad = matchPeso[2].toUpperCase();
      if (unidad === "GB") valor = valor / 1.073741824;

      totalPesoGiB += valor;
    }

    const matchTiempo = texto.match(/(\d{1,}):(\d{2}):(\d{2})h?/);
    if (matchTiempo) {
      const h = parseInt(matchTiempo[1], 10) || 0;
      const m = parseInt(matchTiempo[2], 10) || 0;
      const s = parseInt(matchTiempo[3], 10) || 0;
      totalSegundos += (h * 3600) + (m * 60) + s;
    }
  });

  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);

  let tiempoFormateado = "";
  if (dias > 0) tiempoFormateado += `${dias} día${dias !== 1 ? "s" : ""} • `;
  tiempoFormateado += `${horas} h`;

  // =========================
  // 3) Crear tarjeta flotante
  // =========================
  const card = document.createElement("div");
  card.className = "music-card floating-card";
  card.innerHTML = `
    <div class="info">
      <div class="text-block">
        <h3>Totales Generales</h3><hr class="major">
        <p>Videos: ${totalVideos}</p>
        <p>Peso: ${totalPesoGiB.toFixed(2)} GiB</p>
        <p>Tiempo de rep.: ${tiempoFormateado}</p>

        <div class="totals-pie">
          <svg viewBox="0 0 120 120" aria-label="Distribución por categoría">
            <g transform="rotate(-90 60 60)">
              <circle class="ring-bg" cx="60" cy="60" r="36" stroke="currentColor" stroke-width="14"></circle>
              <g class="pieChart"></g>
            </g>
            <text class="pie-center" x="60" y="66" text-anchor="middle">${totalVideos}</text>
          </svg>
          <ul class="pie-legend"></ul>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(card);

  // =========================
  // 4) Estados (ready/hidden) + toggle
  // =========================
  const esMovil = window.innerWidth <= 600;

  if (esMovil) card.classList.add("hidden");
  requestAnimationFrame(() => card.classList.add("ready"));

  card.addEventListener("click", () => {
    card.classList.toggle("hidden");
  });

  // =========================
  // 5) Donut: Top 6 + "Otros"
  // =========================
  const ordenadas = categorias
    .filter(x => x.videos > 0)
    .sort((a, b) => b.videos - a.videos);

  if (!ordenadas.length) return;

  const TOP_N = 6;
  const top = ordenadas.slice(0, TOP_N);
  const resto = ordenadas.slice(TOP_N);

  const otrosVideos = resto.reduce((acc, x) => acc + x.videos, 0);
  const data = [...top];

  if (otrosVideos > 0) {
    data.push({ nombre: "Otros", videos: otrosVideos });
  }

  const sum = data.reduce((acc, x) => acc + x.videos, 0);
  if (!sum) return;

  const pieWrap = card.querySelector(".totals-pie");
  const pieChart = card.querySelector(".pieChart");
  const legend = card.querySelector(".pie-legend");
  const centerTxt = card.querySelector(".pie-center");

  // =========================
  // 6) Animación suave del centro (total <-> %)
  // =========================
  let centerAnimId = null;

  function animateCenter(toValue, suffix = "") {
    if (centerAnimId) cancelAnimationFrame(centerAnimId);

    const currentText = centerTxt.textContent.trim();
    const fromValue = parseFloat(currentText.replace(/[^\d.]/g, "")) || 0;

    const start = performance.now();
    const duration = 380; // ms

    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const v = fromValue + (toValue - fromValue) * eased;

      centerTxt.textContent = `${Math.round(v)}${suffix}`;

      if (p < 1) centerAnimId = requestAnimationFrame(step);
    };

    centerAnimId = requestAnimationFrame(step);
  }

  const defaultCenter = () => animateCenter(totalVideos, "");
  defaultCenter();

  // Evitar que tocar el donut/leyenda cierre la tarjeta
  const stop = (e) => e.stopPropagation();
  ["pointerdown", "click"].forEach(evt => pieWrap.addEventListener(evt, stop));
  pieWrap.addEventListener("pointerleave", defaultCenter);

  const colors = ["#f94144", "#f9844a", "#f9c74f", "#43aa8b", "#4d908e", "#577590", "#277da1", "#9CA3AF"];

  const r = 36;
  const C = 2 * Math.PI * r;
  let startPct = 0;

  data.forEach((it, i) => {
    const pct = (it.videos / sum) * 100;
    const len = (pct / 100) * C;

    const seg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    seg.setAttribute("class", "seg");
    seg.setAttribute("cx", "60");
    seg.setAttribute("cy", "60");
    seg.setAttribute("r", r);
    seg.setAttribute("stroke", colors[i % colors.length]);
    seg.setAttribute("stroke-width", "14");

    seg.style.strokeDasharray = `0 ${C}`;
    seg.style.strokeDashoffset = `${-(startPct / 100) * C}`;

    const show = () => animateCenter(Math.round(pct), "%");

    seg.addEventListener("pointerdown", (e) => { e.stopPropagation(); show(); });
    seg.addEventListener("pointerenter", show);
    seg.addEventListener("pointerleave", defaultCenter);

    pieChart.appendChild(seg);

    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch"></span><span>${it.nombre}</span>`;
    li.querySelector(".swatch").style.background = colors[i % colors.length];

    li.addEventListener("pointerdown", (e) => { e.stopPropagation(); show(); });
    li.addEventListener("pointerenter", show);
    li.addEventListener("pointerleave", defaultCenter);

    legend.appendChild(li);

    requestAnimationFrame(() => {
      seg.style.strokeDasharray = `${len} ${C - len}`;
    });

    startPct += pct;
  });

  // No cerrar/abrir tocando el gráfico o la leyenda
  ["pointerdown", "click"].forEach(evt => {
    legend.addEventListener(evt, stop);
    pieChart.addEventListener(evt, stop);
  });
});
