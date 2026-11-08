// Lógica pura del dron: celdas enteras, orientación, colisión, gravedad,
// batería e inventario. Sin DOM ni Three.js → testeable en Node.
import { TIPOS } from "./world.js";

export const BATERIA_INICIAL = 100;
export const COSTO_MOVER = 1; // adelante / atrás
export const COSTO_ARRIBA = 2; // subir cuesta el doble
export const COSTO_EXCAVAR = 2; // mover("abajo") sobre bloque sólido

const DELTA = Object.freeze({
  norte: [0, -1],
  este: [1, 0],
  sur: [0, 1],
  oeste: [-1, 0],
});

// Girar a la izquierda (visto desde arriba) y a la derecha.
const IZQUIERDA = Object.freeze({ este: "norte", norte: "oeste", oeste: "sur", sur: "este" });
const DERECHA = Object.freeze({ norte: "este", este: "sur", sur: "oeste", oeste: "norte" });

// Primera celda de aire por encima del terreno (por si hay torres o árboles).
export function alturaSpawn(mundo, x, z) {
  let y = mundo.alturaTerreno(x, z) + 1;
  while (mundo.obtener(x, y, z)) y++;
  return y;
}

export class Dron {
  constructor(mundo, estado = {}) {
    this.mundo = mundo;
    this.x = estado.x ?? 0;
    this.y = estado.y ?? 1;
    this.z = estado.z ?? 0;
    this.dir = estado.dir ?? "este";
    this.bateria = estado.bateria ?? BATERIA_INICIAL;
    this.inventario = { ...(estado.inventario ?? {}) };
  }

  estado() {
    return { x: this.x, y: this.y, z: this.z, dir: this.dir, bateria: this.bateria, inventario: { ...this.inventario } };
  }

  objetivo() {
    const [dx, dz] = DELTA[this.dir];
    return [this.x + dx, this.y, this.z + dz];
  }

  soportado() {
    return this.y <= 0 || this.mundo.obtener(this.x, this.y - 1, this.z) !== null;
  }

  // Cae hasta encontrar suelo (la gravedad manda al moverse horizontalmente).
  caer(pasos) {
    while (!this.soportado()) {
      this.y--;
      pasos.push([this.x, this.y, this.z]);
    }
  }

  #resultado(ok, motivo, pasos, cambio) {
    return { ok, motivo, pasos, cambio, ...this.estado() };
  }

  #fallo(motivo) {
    return this.#resultado(false, motivo, [], null);
  }

  mover(direccion) {
    if (direccion === "arriba") {
      if (this.mundo.obtener(this.x, this.y + 1, this.z)) return this.#fallo("bloque");
      if (this.bateria < COSTO_ARRIBA) return this.#fallo("bateria");
      this.y++;
      this.bateria -= COSTO_ARRIBA;
      // Las hélices aguantan al subir: no cae de vuelta.
      return this.#resultado(true, null, [[this.x, this.y, this.z]], null);
    }

    if (direccion === "abajo") {
      if (this.y <= 0) return this.#fallo("suelo");
      const bloque = this.mundo.obtener(this.x, this.y - 1, this.z);
      let cambio = null;
      if (bloque) {
        // Excava: extrae el bloque al inventario y gasta batería.
        if (this.bateria < COSTO_EXCAVAR) return this.#fallo("bateria");
        this.mundo.destruir(this.x, this.y - 1, this.z);
        this.inventario[bloque] = (this.inventario[bloque] ?? 0) + 1;
        this.bateria -= COSTO_EXCAVAR;
        cambio = [this.x, this.y - 1, this.z, null];
      }
      this.y--;
      const pasos = [[this.x, this.y, this.z]];
      this.caer(pasos);
      return this.#resultado(true, null, pasos, cambio);
    }

    if (direccion !== "adelante" && direccion !== "atras") return this.#fallo("direccion");

    const [dx, dz] = DELTA[this.dir];
    const salto = direccion === "atras" ? -1 : 1;
    const tx = this.x + dx * salto;
    const tz = this.z + dz * salto;
    if (this.mundo.obtener(tx, this.y, tz)) return this.#fallo("bloque");
    if (this.bateria < COSTO_MOVER) return this.#fallo("bateria");
    this.x = tx;
    this.z = tz;
    this.bateria -= COSTO_MOVER;
    const pasos = [[this.x, this.y, this.z]];
    this.caer(pasos);
    return this.#resultado(true, null, pasos, null);
  }

  girar(lado) {
    if (lado === "izquierda") this.dir = IZQUIERDA[this.dir];
    else if (lado === "derecha") this.dir = DERECHA[this.dir];
    else return this.#fallo("lado");
    return this.#resultado(true, null, [], null);
  }

  minar() {
    const [tx, , tz] = this.objetivo();
    const tipo = this.mundo.obtener(tx, this.y, tz);
    if (!tipo) return this.#fallo("vacio");
    this.mundo.destruir(tx, this.y, tz);
    this.inventario[tipo] = (this.inventario[tipo] ?? 0) + 1;
    // Romper bloques recarga la batería (hasta el tope).
    this.bateria = Math.min(BATERIA_INICIAL, this.bateria + 1);
    return this.#resultado(true, null, [], [tx, this.y, tz, null]);
  }

  poner(tipo) {
    if (!(tipo in TIPOS)) return this.#fallo("tipo");
    if ((this.inventario[tipo] ?? 0) < 1) return this.#fallo("inventario");
    if (this.bateria < 1) return this.#fallo("bateria");
    const [tx, , tz] = this.objetivo();
    if (this.mundo.obtener(tx, this.y, tz)) return this.#fallo("bloque");
    this.mundo.colocar(tx, this.y, tz, tipo);
    this.inventario[tipo]--;
    this.bateria--;
    return this.#resultado(true, null, [], [tx, this.y, tz, tipo]);
  }

  // Lee la celda de delante: "piedra", "madera"… o null si está vacía.
  detectar() {
    const [tx, , tz] = this.objetivo();
    return this.mundo.obtener(tx, this.y, tz);
  }
}
