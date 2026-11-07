// Editor de código y consola dentro del juego.
// Guarda el código antes de ejecutar para no perder nada si Python se cuelga
// (shortcut: no hay límite de tiempo de ejecución; un bucle infinito congela
// la pestaña. Subirlo a un Web Worker si hace falta).
const CLAVE_GUARDADO = "voxelcraft:codigo";

export function crearEditor({ correr }) {
  const textarea = document.getElementById("codigo");
  const consola = document.getElementById("consola");
  const btnEjecutar = document.getElementById("ejecutar");
  const btnReiniciar = document.getElementById("reiniciar");
  const estadoMision = document.getElementById("estado-mision");

  let codigoInicial = "";
  let ejecutando = false;

  function pintar(lineas) {
    consola.replaceChildren(
      ...lineas.map(({ texto, clase }) => {
        const p = document.createElement("p");
        p.textContent = texto;
        if (clase) p.className = clase;
        return p;
      }),
    );
    consola.scrollTop = consola.scrollHeight;
  }

  function cargar(codigo) {
    codigoInicial = codigo;
    textarea.value = codigo;
    localStorage.setItem(CLAVE_GUARDADO, codigo);
    pintar([{ texto: "Listo. Pulsa Ejecutar para correr tu código.", clase: "nota" }]);
    estadoMision.textContent = "Misión: pendiente";
    estadoMision.className = "pendiente";
  }

  function marcarEstado(texto, clase) {
    estadoMision.textContent = texto;
    estadoMision.className = clase;
  }

  async function ejecutar() {
    if (ejecutando) return;
    const codigo = textarea.value;
    // Se guarda antes de correr: si el código se cuelga, no se pierde nada.
    localStorage.setItem(CLAVE_GUARDADO, codigo);
    ejecutando = true;
    btnEjecutar.disabled = true;
    pintar([{ texto: "Ejecutando…", clase: "nota" }]);

    let r;
    try {
      r = await correr(codigo);
    } catch (e) {
      pintar([{ texto: `Error al iniciar Python: ${e.message}`, clase: "error" }]);
      return;
    } finally {
      ejecutando = false;
      btnEjecutar.disabled = false;
    }

    if (!r) {
      pintar([{ texto: "Ejecutando…", clase: "nota" }]);
      return;
    }

    const lineas = [];
    if (r.salida) lineas.push({ texto: r.salida.replace(/\n$/, "") });
    if (r.error) lineas.push({ texto: r.error, clase: "error" });
    if (r.mision) {
      lineas.push({
        texto: r.mision.completada ? `✔ ${r.mision.mensaje}` : `✘ ${r.mision.mensaje}`,
        clase: r.mision.completada ? "ok" : "fallo",
      });
      marcarEstado(
        r.mision.completada ? "Misión: completada" : "Misión: pendiente",
        r.mision.completada ? "completada" : "pendiente",
      );
    } else if (r.ok && !r.error) {
      lineas.push({ texto: "✓ Terminado sin errores", clase: "ok" });
    }
    if (!lineas.length) lineas.push({ texto: "(sin salida)" });
    pintar(lineas);
  }

  btnEjecutar.addEventListener("click", ejecutar);
  btnReiniciar.addEventListener("click", () => cargar(codigoInicial));
  textarea.addEventListener("keydown", (e) => {
    // Ctrl/Cmd+Enter ejecuta; el tabulador mete 4 espacios (Python).
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      ejecutar();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b } = textarea;
      textarea.value =
        textarea.value.slice(0, a) + "    " + textarea.value.slice(b);
      textarea.selectionStart = textarea.selectionEnd = a + 4;
    }
  });

  return { cargar, ejecutar, marcarEstado };
}
