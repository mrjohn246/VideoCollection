/**
 * tablas.js
 * ---------
 * Añade:
 * - Buscador global (#buscador)
 * - Paginación (#paginacion)
 * - Ordenamiento al hacer click en <th>
 *
 * Importante: este script se inicializa cuando recibe el evento "tabla:procesada"
 * (emitido por tabla-procesos.js). Si no existe tabla-procesos.js, igual intenta iniciar.
 */

(() => {
  console.log("tablas.js: cargado (esperando init)");

  // Evita inicializaciones dobles
  let iniciado = false;

  // Intenta iniciar al recibir evento del procesamiento
  document.addEventListener("tabla:procesada", () => {
    if (iniciado) return;
    iniciado = true;
    initTablas();
  });

  // Fallback: si nunca llega el evento, intenta inicializar igual al DOM listo
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (iniciado) return;
      iniciado = true;
      initTablas();
    }, 0);
  });

  function initTablas() {
    console.log("tablas.js: inicio initTablas()");

    // ========== CONFIG ==========
    const filasPorPagina = 200;
    let paginaActual = 1;
    let ordenAsc = true;

    // ========== BUSCAR TABLA ==========
    const selectores = [
      ".table-wrapper table",
      "#miTabla",
      "table.table",
      "table"
    ];

    let tabla = null;
    for (const sel of selectores) {
      const t = document.querySelector(sel);
      if (t && t.querySelector("tbody")) {
        tabla = t;
        console.log("tablas.js: tabla encontrada con selector:", sel);
        break;
      }
    }

    if (!tabla) {
      console.error("tablas.js: No se encontró tabla válida.");
      return;
    }

    const tbody = tabla.querySelector("tbody");
    const contenedor = document.getElementById("paginacion");
    const buscador = document.getElementById("buscador");

    const encabezados = Array.from(tabla.querySelectorAll("thead th"));
    const filasOriginales = Array.from(tbody.querySelectorAll("tr"));

    if (!filasOriginales.length) {
      console.warn("tablas.js: No hay filas en tbody.");
      return;
    }

    if (!contenedor) {
      console.warn("tablas.js: No existe #paginacion (controles no se verán).");
    }

    // Estado dinámico
    let filasFiltradas = [...filasOriginales];

    // ========== UTILIDAD: obtener índice de columna por nombre ==========
    function getColIndexByName(names) {
      for (let i = 0; i < encabezados.length; i++) {
        const text = encabezados[i].textContent.trim().toLowerCase();
        if (names.some((n) => text.includes(n))) return i;
      }
      return -1;
    }

    // Ajustado a tu tabla final (ya procesada):
    // Artist, Track, Resolution, FPS, Bitrate, Codec, Size, Audio Tracks, Directory/Rating...
    const idxNombre = getColIndexByName(["artist", "artista", "track", "nombre", "name"]);
    const idxResol  = getColIndexByName(["resolution", "resolución", "ancho", "width"]);
    const idxAudio  = getColIndexByName(["audio"]); // (no meter "codec" aquí)

    console.log("tablas.js: índices detectados -> nombre:", idxNombre, "resol:", idxResol, "audio:", idxAudio);

    // ========== FILTRADO ==========
    function aplicarFiltros() {
      const textoGlobal = buscador ? buscador.value.toLowerCase() : "";

      filasFiltradas = filasOriginales.filter((fila) => {
        const textoFila = fila.textContent.toLowerCase();
        if (!textoGlobal) return true;
        return textoFila.includes(textoGlobal);
      });

      paginaActual = 1;
      render();
    }

    // ========== PAGINACIÓN ==========
    function mostrarPagina() {
      const inicio = (paginaActual - 1) * filasPorPagina;
      const fin = inicio + filasPorPagina;

      // Oculta todas
      filasOriginales.forEach((r) => (r.style.display = "none"));

      // Muestra solo el rango actual
      filasFiltradas.forEach((fila, idx) => {
        if (idx >= inicio && idx < fin) fila.style.display = "";
      });
    }

    function crearControles() {
      if (!contenedor) return;

      contenedor.innerHTML = "";
      const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / filasPorPagina));

      const btnPrev = document.createElement("button");
      btnPrev.textContent = "◀";
      btnPrev.disabled = paginaActual <= 1;
      btnPrev.addEventListener("click", () => {
        if (paginaActual > 1) paginaActual--;
        render();
      });

      const btnNext = document.createElement("button");
      btnNext.textContent = "▶";
      btnNext.disabled = paginaActual >= totalPaginas;
      btnNext.addEventListener("click", () => {
        if (paginaActual < totalPaginas) paginaActual++;
        render();
      });

      contenedor.appendChild(btnPrev);

      // Ventana de botones (si hay muchas páginas)
      const maxBtns = 9;
      let start = 1;
      let end = totalPaginas;

      if (totalPaginas > maxBtns) {
        start = Math.max(1, paginaActual - Math.floor(maxBtns / 2));
        end = start + maxBtns - 1;
        if (end > totalPaginas) {
          end = totalPaginas;
          start = end - maxBtns + 1;
        }
      }

      for (let i = start; i <= end; i++) {
        const b = document.createElement("button");
        b.textContent = String(i);
        if (i === paginaActual) b.classList.add("active");
        b.addEventListener("click", () => {
          paginaActual = i;
          render();
        });
        contenedor.appendChild(b);
      }

      contenedor.appendChild(btnNext);
    }

    function render() {
      mostrarPagina();
      crearControles();
    }

    // ========== ORDENAR POR CLICK EN TH ==========
    // Nota: solo ordena por texto (o número si detecta parseFloat útil).
    encabezados.forEach((th, colIndex) => {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        ordenAsc = !ordenAsc;

        filasFiltradas.sort((a, b) => {
          const A = (a.children[colIndex]?.textContent || "").trim().toLowerCase();
          const B = (b.children[colIndex]?.textContent || "").trim().toLowerCase();

          // Intenta numérico si aplica (sirve para FPS, tamaños simples, etc.)
          const numA = parseFloat(A.replace(/[^0-9.\-]/g, ""));
          const numB = parseFloat(B.replace(/[^0-9.\-]/g, ""));

          if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
            return ordenAsc ? numA - numB : numB - numA;
          }

          return ordenAsc
            ? A.localeCompare(B, undefined, { numeric: true })
            : B.localeCompare(A, undefined, { numeric: true });
        });

        // Reordenar DOM según el orden filtrado
        filasFiltradas.forEach((f) => tbody.appendChild(f));

        paginaActual = 1;
        render();
      });
    });

    // ========== EVENTOS UI ==========
    if (buscador) {
      buscador.addEventListener("input", aplicarFiltros);
      console.log("tablas.js: buscador activo");
    } else {
      console.log("tablas.js: #buscador no existe (opcional)");
    }

    // ========== INIT ==========
    render();
    console.log("tablas.js: listo. filas totales:", filasOriginales.length);
  }
})();
