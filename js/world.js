// Lógica pura del mundo: sin dependencias de Three.js ni del DOM,
// para poder testearla con Node.

// Colores de cada tipo de bloque (hex).
export const TIPOS = Object.freeze({
  hierba: 0x5fbf4a,
  tierra: 0x8d5a3b,
  piedra: 0x8a8a8a,
  arena: 0xe0c078,
  madera: 0x6b4423,
  ladrillo: 0xa8402f,
});

export const TIPOS_LISTA = Object.freeze(Object.keys(TIPOS));

// Tamaño del terreno (lado del cuadrado), en bloques.
const LADO = 48;
const RUIDO_SEMILLA = 1337;

function hash2(x, z, seed) {
  let h = seed + x * 374761393 + z * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

// Ruido de valor suave (interpolado) para colinas.
function ruido(x, z, seed) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, seed);
  const b = hash2(xi + 1, zi, seed);
  const c = hash2(xi, zi + 1, seed);
  const d = hash2(xi + 1, zi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function alturaGenerada(x, z, seed) {
  const h1 = ruido(x * 0.08, z * 0.08, seed);
  const h2 = ruido(x * 0.2, z * 0.2, seed + 91);
  return Math.floor(5 + h1 * 9 + h2 * 3);
}

export class Mundo {
  // Si se pasa un mapa de bloques (snapshot), se usa tal cual sin generar
  // terreno: sirve para reconstruir el mundo dentro del worker de Python.
  constructor(seed = 42, bloques = null) {
    this.seed = seed;
    this.bloques = bloques ?? new Map(); // "x,y,z" -> tipo
    if (!bloques) this.generarTerreno();
  }

  clave(x, y, z) {
    return `${x},${y},${z}`;
  }

  // Genera el terreno: piedra, tierra y encima hierba (o arena en las zonas bajas).
  generarTerreno() {
    const mitad = LADO / 2;
    for (let x = -mitad; x < mitad; x++) {
      for (let z = -mitad; z < mitad; z++) {
        const h = alturaGenerada(x, z, this.seed);
        for (let y = 0; y <= h; y++) {
          let tipo;
          if (y === h) tipo = h <= 6 ? "arena" : "hierba";
          else if (y >= h - 3) tipo = h <= 6 ? "arena" : "tierra";
          else tipo = "piedra";
          this.bloques.set(this.clave(x, y, z), tipo);
        }
      }
    }
  }

  obtener(x, y, z) {
    return this.bloques.get(this.clave(x, y, z)) ?? null;
  }

  colocar(x, y, z, tipo) {
    if (!(tipo in TIPOS)) {
      throw new Error(
        `Tipo de bloque desconocido: '${tipo}'. Tipos válidos: ${TIPOS_LISTA.join(", ")}`,
      );
    }
    this.bloques.set(this.clave(x, y, z), tipo);
  }

  destruir(x, y, z) {
    this.bloques.delete(this.clave(x, y, z));
  }

  // Y del bloque más alto de la columna (para colocar sobre el suelo).
  alturaTerreno(x, z) {
    for (let y = 63; y >= 0; y--) {
      if (this.bloques.has(this.clave(x, y, z))) return y;
    }
    return -1;
  }

  // Bloques con al menos una cara al aire (los únicos que hace falta dibujar).
  bloquesVisibles() {
    const out = [];
    for (const [k, tipo] of this.bloques) {
      const [x, y, z] = k.split(",").map(Number);
      if (
        !this.bloques.has(this.clave(x + 1, y, z)) ||
        !this.bloques.has(this.clave(x - 1, y, z)) ||
        !this.bloques.has(this.clave(x, y + 1, z)) ||
        !this.bloques.has(this.clave(x, y - 1, z)) ||
        !this.bloques.has(this.clave(x, y, z + 1)) ||
        !this.bloques.has(this.clave(x, y, z - 1))
      ) {
        out.push([x, y, z, tipo]);
      }
    }
    return out;
  }

  // Raycast DDA sobre la rejilla de bloques: devuelve el bloque tocado y
  // la normal de la cara golpeada, o null si no choca con nada.
  raycast(ox, oy, oz, dx, dy, dz, maxDist = 6) {
    let x = Math.floor(ox);
    let y = Math.floor(oy);
    let z = Math.floor(oz);
    const pasoX = dx > 0 ? 1 : -1;
    const pasoY = dy > 0 ? 1 : -1;
    const pasoZ = dz > 0 ? 1 : -1;
    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tMaxX =
      dx !== 0 ? (dx > 0 ? x + 1 - ox : ox - x) * tDeltaX : Infinity;
    let tMaxY =
      dy !== 0 ? (dy > 0 ? y + 1 - oy : oy - y) * tDeltaY : Infinity;
    let tMaxZ =
      dz !== 0 ? (dz > 0 ? z + 1 - oz : oz - z) * tDeltaZ : Infinity;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let t = 0;
    while (t <= maxDist) {
      if (this.bloques.has(this.clave(x, y, z))) {
        return { x, y, z, nx, ny, nz };
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += pasoX;
        t = tMaxX;
        tMaxX += tDeltaX;
        nx = -pasoX;
        ny = 0;
        nz = 0;
      } else if (tMaxY < tMaxZ) {
        y += pasoY;
        t = tMaxY;
        tMaxY += tDeltaY;
        nx = 0;
        ny = -pasoY;
        nz = 0;
      } else {
        z += pasoZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0;
        ny = 0;
        nz = -pasoZ;
      }
    }
    return null;
  }
}
