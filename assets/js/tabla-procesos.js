/**
 * tabla-procesos.js
 * -----------------
 * 1) Normaliza columnas para que coincidan con el <thead> (10 columnas):
 *    - Separa "Artist - Track" -> Artist | Track
 *    - Separa "VideoInfo"      -> Resolution | FPS | Bitrate
 * 2) Formatea "Audio Tracks" a:
 *    Canales • Codec • Frecuencia • Bitdepth • Bitrate
 *    y separa múltiples pistas con " | "
 * 3) Por defecto muestra SOLO la primera pista completa y agrega un toggle
 * 4) Controla el botón "volver arriba" (con guardas)
 * 5) Dispara el evento: "tabla:procesada"
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ tabla-procesos.js cargado");

  const tbody = document.getElementById("tabla-body");
  if (!tbody) {
    console.warn("tabla-procesos.js: No se encontró #tabla-body. Se omite procesamiento.");
    document.dispatchEvent(new CustomEvent("tabla:procesada"));
    initVolverArriba();
    return;
  }

  // ===== 1 y 2) NORMALIZAR FILAS =====
  const filas = tbody.querySelectorAll("tr");

  filas.forEach((fila) => {
    const celdas = Array.from(fila.querySelectorAll("td"));
    if (celdas.length < 7) return;

    // ---- 1) Separar Artist / Track ----
    const textoArtistTrack = (celdas[1].textContent || "").trim();
    const partes = textoArtistTrack.split(/\s*-\s*(.+)/);

    const artist = (partes[0] || textoArtistTrack).trim();
    const track = (partes[1] || "").trim();

    celdas[1].outerHTML = `<td>${escapeHTML(artist)}</td><td>${escapeHTML(track)}</td>`;

    const nuevas = Array.from(fila.querySelectorAll("td"));

    // ---- 2) Separar VideoInfo -> Resolution | FPS | Bitrate ----
    const videoInfo = (nuevas[3]?.textContent || "").trim();

    const resolucion = (videoInfo.match(/(\d{3,5}x\d{3,5})/i) || [])[1] || "";
    const fpsNum = (videoInfo.match(/(\d+(?:\.\d+)?)\s*fps/i) || [])[1] || "";
    const fps = fpsNum ? `${fpsNum} Fps` : "";

    const br = videoInfo.match(/(\d+(?:\.\d+)?)\s*(kb\/s|mb\/s)/i);
    const bitrateVid = br ? `${br[1]} ${br[2]}` : "";

    nuevas[3].outerHTML = `
      <td>${escapeHTML(resolucion)}</td>
      <td>${escapeHTML(fps)}</td>
      <td>${escapeHTML(bitrateVid)}</td>
    `;
  });

  // ===== 3) AUDIO + TOGGLE =====
  formatearAudioTracksConToggle();

  // ===== 4) EVENTO =====
  document.dispatchEvent(new CustomEvent("tabla:procesada"));

  // ===== 5) VOLVER ARRIBA =====
  initVolverArriba();
});

function formatearAudioTracksConToggle() {
  const tabla = document.querySelector("table");
  if (!tabla) return;

  const ths = Array.from(tabla.querySelectorAll("thead th"));
  const idxAudio = ths.findIndex(th => th.textContent.toLowerCase().includes("audio"));
  if (idxAudio === -1) {
    console.warn("tabla-procesos.js: No se encontró el <th> de Audio Tracks (no se formatea audio).");
    return;
  }

  const filas = document.querySelectorAll("#tabla-body tr");

  filas.forEach(fila => {
    const td = fila.children[idxAudio];
    if (!td) return;

    const original = (td.textContent || "").trim();
    if (!original) return;

    const pistas = original.split(/\s*;\s*/);

    const formateadas = pistas
      .map(pista => formatearUnaPistaAudio(pista))
      .filter(Boolean);

    if (formateadas.length === 0) return;

    const full = formateadas.join(" • ");

    if (formateadas.length === 1) {
      td.textContent = full;
      td.dataset.audioFull = full;
      return;
    }

    const first = formateadas[0];
    const rest = formateadas.slice(1).join(" • ");

    td.dataset.audioFull = full;
    td.dataset.audioFirst = first;
    td.dataset.audioRest = rest;

    // ✅ CAMBIO 1: el botón ya NO lleva "+" dentro
    td.innerHTML = `
      <span class="audio-first">${escapeHTML(first)}</span>
      <span class="audio-rest" style="display:none;"> • ${escapeHTML(rest)}</span>
      <button type="button" class="audio-toggle" aria-expanded="false"></button>
    `;
  });

  if (!tabla.dataset.audioToggleBound) {
    tabla.dataset.audioToggleBound = "1";

    tabla.addEventListener("click", (e) => {
      const btn = e.target.closest(".audio-toggle");
      if (!btn) return;

      const td = btn.closest("td");
      if (!td) return;

      const restSpan = td.querySelector(".audio-rest");
      if (!restSpan) return;

      const isOpen = btn.getAttribute("aria-expanded") === "true";
      restSpan.style.display = isOpen ? "none" : "inline";
      btn.setAttribute("aria-expanded", String(!isOpen));

      // ✅ CAMBIO 2: NO cambiamos textContent (el CSS muestra +/− o el knob)
      // btn.textContent = isOpen ? "+" : "-";
    });
  }
}

function formatearUnaPistaAudio(pista) {
  const p = String(pista).replace(/\s+/g, " ").trim();
  if (!p) return "";

  let canales =
    (p.match(/\b(\d+(?:\.\d+)?)\s*ch\b/i)?.[1]) ||
    (p.match(/\b(\d\.\d)\b/)?.[1]) ||
    "";

  if (canales && !canales.includes(".")) canales = `${canales}.0`;

  let codec = "";
  if (/(e[\s-]?ac[\s-]?3|eac3)/i.test(p)) codec = "E-AC-3";
  else if (/(ac[\s-]?3)/i.test(p)) codec = "AC-3";
  else if (/\bpcm\b/i.test(p)) codec = "PCM";
  else if (/\baac\b/i.test(p)) codec = "AAC";
  else if (/\bflac\b/i.test(p)) codec = "FLAC";
  else if (/\bopus\b/i.test(p)) codec = "OPUS";
  else if (/\bmp3\b/i.test(p) || /mpeg audio/i.test(p)) codec = "MP3";

  const khz = p.match(/(\d+(?:\.\d+)?)\s*k\s*hz/i)?.[1] || "";
  const bit = p.match(/(\d+)\s*bit/i)?.[1] || "";
  const kbps = p.match(/(\d+(?:\.\d+)?)\s*kbps/i)?.[1] || "";

  return [
    canales,
    codec,
    khz ? `${khz}kHz` : "",
    bit ? `${bit}bit` : "",
    kbps ? `${kbps}kbps` : ""
  ].filter(Boolean).join(", ");
}

function initVolverArriba() {
  const btnArriba = document.getElementById("volver-arriba");
  if (!btnArriba) return;

  const toggleBtn = () => {
    btnArriba.style.display = window.scrollY > 300 ? "block" : "none";
  };

  window.addEventListener("scroll", toggleBtn);
  toggleBtn();

  btnArriba.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
