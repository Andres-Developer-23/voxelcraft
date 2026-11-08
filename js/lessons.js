// Misiones: código inicial (lessons/*.py) y verificación del mundo.
// La verificación compara contra una instantánea de alturas tomada ANTES
// de ejecutar el código del alumno.

const ok = (mensaje) => ({ completada: true, mensaje });
const fallo = (mensaje) => ({ completada: false, mensaje });

// Instantánea "x,z" -> altura del bloque más alto de la columna.
export function snapshotAlturas(mundo) {
  const alturas = new Map();
  for (const k of mundo.bloques.keys()) {
    const coma1 = k.indexOf(",");
    const coma2 = k.lastIndexOf(",");
    const clave = `${k.slice(0, coma1)},${k.slice(coma2 + 1)}`;
    const y = Number(k.slice(coma1 + 1, coma2));
    const actual = alturas.get(clave);
    if (actual === undefined || y > actual) alturas.set(clave, y);
  }
  return alturas;
}

export const MISIONES = [
  {
    id: "01",
    titulo: "Misión 1 — Tu primer bloque",
    desc: "Coloca un bloque de ladrillo encima del suelo en (5, 5). " +
      "Aprenderás a mirar la altura con altura_terreno y a llamar a colocar_bloque.",
    archivo: "lessons/01_colocar_bloque.py",
    verificar(mundo, prev) {
      const h = prev.get("5,5");
      const y = h + 1;
      const b = mundo.obtener(5, y, 5);
      if (b === "ladrillo") return ok("¡Bloque colocado en el sitio exacto!");
      if (b) return fallo(`En (5, ${y}, 5) hay '${b}', pero ahí debe ir 'ladrillo'.`);
      return fallo(
        `No hay ningún bloque en (5, ${y}, 5). ` +
        `Revisa la altura que da altura_terreno(5, 5) y sube un nivel.`,
      );
    },
  },
  {
    id: "02",
    titulo: "Misión 2 — Excava un surco",
    desc: "Cava 5 bloques en línea recta (z=0, de x=0 a x=4) a 2 niveles " +
      "bajo la superficie. Aquí aprenderás a usar un bucle for con range.",
    archivo: "lessons/02_excavar_tunel.py",
    verificar(mundo, prev) {
      const sinCavar = [];
      for (let x = 0; x < 5; x++) {
        const h = prev.get(`${x},0`);
        if (h === undefined || mundo.obtener(x, h - 2, 0) !== null) sinCavar.push(x);
      }
      if (sinCavar.length) {
        return fallo(
          `Falta cavar en x = ${sinCavar.join(", ")}. ` +
          `Prueba: y = altura_terreno(x, 0) - 2 y luego destruir_bloque(x, y, 0).`,
        );
      }
      return ok("Surco de 5 bloques excavado. ¡Los bucles for hacen trabajo repetitivo!");
    },
  },
  {
    id: "03",
    titulo: "Misión 3 — Escalera de 5 peldaños",
    desc: "Construye una escalera de piedra que sube hacia +x desde (0, 0). " +
      "Cada peldaño i va en (i, altura + 1 + i, 0). Practicarás range y variables.",
    archivo: "lessons/03_escalera.py",
    verificar(mundo, prev) {
      const malos = [];
      for (let i = 0; i < 5; i++) {
        const h = prev.get(`${i},0`);
        const y = h + 1 + i;
        if (mundo.obtener(i, y, 0) !== "piedra") malos.push(`(${i}, ${y}, 0)`);
      }
      if (malos.length) {
        return fallo(
          `Falta piedra en ${malos.slice(0, 3).join(", ")}` +
          `${malos.length > 3 ? ` y ${malos.length - 3} más` : ""}. ` +
          `Cada peldaño sube un nivel respecto al anterior.`,
        );
      }
      return ok("Escalera completa: 5 peldaños de piedra. ¡Bien!");
    },
  },
  {
    id: "04",
    titulo: "Misión 4 — Las 4 esquinas de una casa",
    desc: "Escribe la función torre(x, z) que apila 3 bloques de madera y " +
      "llámala para las esquinas (0,0), (0,4), (4,0) y (4,4). Aprenderás def y llamadas.",
    archivo: "lessons/04_casa.py",
    verificar(mundo, prev) {
      const esquinas = [[0, 0], [0, 4], [4, 0], [4, 4]];
      const malas = [];
      for (const [x, z] of esquinas) {
        const base = prev.get(`${x},${z}`);
        for (let dy = 1; dy <= 3; dy++) {
          if (mundo.obtener(x, base + dy, z) !== "madera") {
            malas.push(`(${x}, ${base + dy}, ${z})`);
            break; // una por esquina basta para el mensaje
          }
        }
      }
      if (malas.length) {
        return fallo(
          `La esquina no está completa en ${malas.join(", ")}. ` +
          `Cada torre necesita 3 bloques de madera apilados sobre su base.`,
        );
      }
      return ok("¡4 torres de 3 bloques! Tu función funciona en las 4 esquinas.");
    },
  },
];
