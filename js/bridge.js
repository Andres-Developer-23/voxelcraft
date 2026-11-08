// Puente Python <-> juego: carga Pyodide, expone la API de bloques y
// ejecuta el código del alumno capturando salida y errores.
const VERSION = "0.26.4";
const BASE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;

let pyodideListo = null;

function cargarPyodide() {
  if (pyodideListo) return pyodideListo;
  pyodideListo = (async () => {
    const script = document.createElement("script");
    script.src = `${BASE}pyodide.js`;
    document.head.appendChild(script);
    await new Promise((ok, mal) => {
      script.onload = ok;
      script.onerror = () => mal(new Error("No se pudo descargar Pyodide (¿sin internet?)"));
    });
    return await loadPyodide({ indexURL: BASE });
  })();
  return pyodideListo;
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

export async function crearPuente({ mundo, alCambiar }) {
  const pyodide = await cargarPyodide();

  // --- API expuesta a Python -------------------------------------------
  const api = {
    colocar_bloque(x, y, z, tipo) {
      mundo.colocar(Math.trunc(Number(x)), Math.trunc(Number(y)), Math.trunc(Number(z)), String(tipo));
      alCambiar();
    },
    destruir_bloque(x, y, z) {
      mundo.destruir(Math.trunc(Number(x)), Math.trunc(Number(y)), Math.trunc(Number(z)));
      alCambiar();
    },
    obtener_bloque(x, y, z) {
      return mundo.obtener(Math.trunc(Number(x)), Math.trunc(Number(y)), Math.trunc(Number(z)));
    },
    altura_terreno(x, z) {
      return mundo.alturaTerreno(Math.trunc(Number(x)), Math.trunc(Number(z)));
    },
  };
  for (const [nombre, fn] of Object.entries(api)) pyodide.globals.set(nombre, fn);

  // Utilidades puras de Python (matemática, sin pasar por JS).
  pyodide.runPython(`
import sys, io, math

def distancia(a, b):
    """Distancia entre dos puntos (x, y, z)."""
    return math.sqrt(sum((p - q) ** 2 for p, q in zip(a, b)))

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

  // --- Ejecución --------------------------------------------------------
  function vaciarSalida() {
    pyodide.runPython("sys.stdout.seek(0); sys.stdout.truncate(0); sys.stderr.seek(0); sys.stderr.truncate(0)");
  }

  function leerSalida() {
    return String(pyodide.runPython("sys.stdout.getvalue() + sys.stderr.getvalue()"));
  }

  async function ejecutar(codigo) {
    vaciarSalida();
    try {
      pyodide.runPython(codigo);
      return { ok: true, salida: leerSalida(), error: null };
    } catch (e) {
      // Al redirigir sys.stderr, Pyodide puede dejar e.message vacío y
      // mandar el traceback a la salida: se usa como respaldo.
      const texto = String(e.message ?? "").trim() || leerSalida();
      return { ok: false, salida: "", error: traducirError(texto) };
    }
  }

  return { ejecutar };
}
