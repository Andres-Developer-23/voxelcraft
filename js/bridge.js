// Puente Python <-> juego: ejecuta el código del alumno en un Web Worker
// con Pyodide. Si el código no termina (bucle infinito), se corta a los 15 s
// y se reinicia el worker: la pestaña nunca se congela.
const TIMEOUT_MS = 15000;

export function crearPuente({ mundo }) {
  let worker = null;
  let listoP = null;
  let resolverListo = null;
  let rechazarListo = null;
  let temporizador = null;
  let pendiente = null; // { id, resolver } de la ejecución en curso
  let eid = 0;

  function rearmar() {
    // El reloj se reinicia con cada mensaje del worker: un script que
    // trabaja (recibe respuestas) no se corta; uno que no toca nada, sí.
    if (!pendiente) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(cortar, TIMEOUT_MS);
  }

  function cortar() {
    worker?.terminate();
    worker = null;
    listoP = null;
    const p = pendiente;
    pendiente = null;
    clearTimeout(temporizador);
    p?.resolver({
      ok: false,
      salida: "",
      error: "Se acabó el tiempo (15 s). ¿Bucle infinito? Python se ha reiniciado.",
      cambios: [],
    });
  }

  function destruirWorker() {
    worker?.terminate();
    worker = null;
    listoP = null;
  }

  function obtenerWorker() {
    if (worker) return worker;
    worker = new Worker(new URL("./pythonWorker.js", import.meta.url), { type: "module" });
    listoP = new Promise((ok, mal) => {
      resolverListo = ok;
      rechazarListo = mal;
    });
    worker.onmessage = (ev) => {
      const msg = ev.data;
      if (msg.t === "cargando") return;
      rearmar();
      if (msg.t === "listo") {
        resolverListo?.();
        resolverListo = rechazarListo = null;
      } else if (msg.t === "errorPy") {
        rechazarListo?.(new Error(msg.mensaje));
        resolverListo = rechazarListo = null;
      } else if (msg.t === "resultado" && pendiente?.id === msg.id) {
        clearTimeout(temporizador);
        const p = pendiente;
        pendiente = null;
        p.resolver({
          ok: msg.ok,
          salida: msg.salida,
          error: msg.error ? traducirError(msg.error) : null,
          cambios: msg.cambios,
        });
      }
    };
    worker.onerror = (ev) => {
      const texto = ev.message || "No se pudo cargar Pyodide (¿sin internet?)";
      destruirWorker();
      rechazarListo?.(new Error(texto));
      resolverListo = rechazarListo = null;
      const p = pendiente;
      pendiente = null;
      clearTimeout(temporizador);
      p?.resolver({ ok: false, salida: "", error: texto, cambios: [] });
    };
    return worker;
  }

  async function ejecutar(codigo) {
    const w = obtenerWorker();
    await listoP; // si falla la carga, lanza y el editor lo muestra
    if (pendiente) throw new Error("Ya hay un código en ejecución");
    const id = ++eid;
    const r = new Promise((resolver) => {
      pendiente = { id, resolver };
    });
    rearmar();
    w.postMessage({ t: "ejecutar", id, codigo, bloques: new Map(mundo.bloques) });
    return r;
  }

  return { ejecutar, destruir: destruirWorker };
}

// Traduce los errores típicos de quien empieza a programar.
const TRADUCCIONES = [
  [/^NameError: name '(.+?)' is not defined/, "No encuentro '$1'. ¿Definiste la variable o función antes de usarla?"],
  [/^SyntaxError/, "Error de sintaxis: revisa paréntesis, dos puntos (:), comillas y palabras reservadas."],
  [/^IndentationError/, "Error de indentación: usa 4 espacios al principio de cada línea del bloque (no mezcles con tabuladores)."],
  [/^TabError/, "Error de indentación: no mezcles tabuladores y espacios; usa solo 4 espacios."],
  [/^TypeError/, "Tipo incorrecto: revisa los valores que estás pasando (¿número en vez de texto, o al revés?)."],
  [/^IndexError/, "Índice fuera de rango: ese elemento no existe en la lista."],
  [/^KeyError/, "Esa clave no existe en el diccionario."],
  [/^ZeroDivisionError/, "No se puede dividir entre cero."],
  [/^AttributeError/, "Ese objeto no tiene ese atributo o método."],
  [/^ValueError/, "El valor no es válido para esa función."],
  [/^ImportError|^ModuleNotFoundError/, "No se puede importar ese módulo."],
];

function traducirError(mensaje) {
  const texto = String(mensaje);
  const lineas = texto.trim().split("\n");
  const ultima = lineas[lineas.length - 1] ?? "";
  // Python a veces añade "Did you mean: 'x'?" al final: se conserva como pista.
  const sugerencia = ultima.match(/Did you mean: '(.+?)'\?/)?.[1];
  // Línea donde falló, para poder señalarla al alumno.
  const linea = texto.match(/File "<exec>", line (\d+)/)?.[1];
  for (const [patron, salida] of TRADUCCIONES) {
    const m = ultima.match(patron);
    if (m) {
      const base = salida.replace(/\$1/g, m[1] ?? "");
      const pista = sugerencia ? ` (¿quisiste decir '${sugerencia}'?)` : "";
      const donde = linea ? ` [línea ${linea}]` : "";
      return `${base}${pista}${donde}`;
    }
  }
  // Sin traducción: la última línea (o el mensaje entero si está vacío).
  return ultima || texto;
}
