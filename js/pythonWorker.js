// Web Worker que carga Pyodide y ejecuta el código del alumno.
// El mundo llega como snapshot en cada ejecución y los cambios vuelven
// en "cambios": así un bucle infinito solo puede colgar al worker,
// que bridge.js corta con un timeout.
import { Mundo } from "./world.js";

const VERSION = "0.26.4";
const BASE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;

let pyodide = null;
let mundo = null; // espejo local del mundo durante la ejecución
let cambios = []; // [x, y, z, tipo|null] mutaciones de la API de bloques

postMessage({ t: "cargando" });

try {
  const mod = await import(`${BASE}pyodide.mjs`);
  pyodide = await mod.loadPyodide({ indexURL: BASE });
} catch (e) {
  postMessage({ t: "errorPy", mensaje: String(e.message ?? e) });
  throw e;
}

// Salida capturada + utilidades puras de Python.
pyodide.runPython(`
import sys, io, math

def distancia(a, b):
    """Distancia entre dos puntos (x, y, z)."""
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(a, b)))

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

function vaciarSalida() {
  pyodide.runPython(
    "sys.stdout.seek(0); sys.stdout.truncate(0); sys.stderr.seek(0); sys.stderr.truncate(0)",
  );
}

function leerSalida() {
  return String(pyodide.runPython("sys.stdout.getvalue() + sys.stderr.getvalue()"));
}

// Escribe un aviso del juego dentro de la salida del alumno.
function anotar(texto) {
  pyodide.globals.set("__aviso__", String(texto));
  pyodide.runPython("sys.stdout.write(__aviso__ + chr(10))");
}

// --- API de bloques: opera sobre el espejo local ----------------------
const api = {
  colocar_bloque(x, y, z, tipo) {
    const X = Math.trunc(Number(x));
    const Y = Math.trunc(Number(y));
    const Z = Math.trunc(Number(z));
    mundo.colocar(X, Y, Z, String(tipo));
    cambios.push([X, Y, Z, String(tipo)]);
  },
  destruir_bloque(x, y, z) {
    const X = Math.trunc(Number(x));
    const Y = Math.trunc(Number(y));
    const Z = Math.trunc(Number(z));
    mundo.destruir(X, Y, Z);
    cambios.push([X, Y, Z, null]);
  },
  obtener_bloque(x, y, z) {
    return mundo.obtener(Math.trunc(Number(x)), Math.trunc(Number(y)), Math.trunc(Number(z)));
  },
  altura_terreno(x, z) {
    return mundo.alturaTerreno(Math.trunc(Number(x)), Math.trunc(Number(z)));
  },
};
for (const [nombre, fn] of Object.entries(api)) pyodide.globals.set(nombre, fn);

// --- Ejecución --------------------------------------------------------
onmessage = async (ev) => {
  const msg = ev.data;
  if (msg.t !== "ejecutar") return;

  mundo = new Mundo(42, new Map(msg.bloques));
  cambios = [];
  vaciarSalida();

  let ok = true;
  let error = null;
  try {
    // El alumno escribe `def` normal y usa `await` dentro: se convierte en
    // `async def` solo si el programa realmente usa await.
    let codigo = msg.codigo;
    const sinComentarios = codigo.split("\n").map((l) => l.replace(/#.*$/, "")).join("\n");
    if (/\bawait\b/.test(sinComentarios)) {
      codigo = codigo.replace(/^(\s*)def\b/gm, "$1async def");
    }
    await pyodide.runPythonAsync(codigo);
  } catch (e) {
    // Al redirigir sys.stderr, Pyodide puede dejar e.message vacío y
    // mandar el traceback a la salida: se usa como respaldo.
    ok = false;
    error = String(e.message ?? "").trim() || leerSalida();
  }

  postMessage({
    t: "resultado",
    id: msg.id,
    ok,
    salida: ok ? leerSalida() : "",
    error,
    cambios,
  });
};

postMessage({ t: "listo" });
