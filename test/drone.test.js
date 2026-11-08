// Test headless de js/drone.js: lógica pura del dron, sin navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Mundo } from "../js/world.js";
import {
  Dron,
  alturaSpawn,
  BATERIA_INICIAL,
  COSTO_MOVER,
  COSTO_ARRIBA,
  COSTO_EXCAVAR,
} from "../js/drone.js";

// Mundo vacío con suelo plano en y=0 (controlado, sin ruido del terreno).
function mundoPlano() {
  const m = new Mundo(42, new Map());
  for (let x = -10; x <= 10; x++) {
    for (let z = -10; z <= 10; z++) m.colocar(x, 0, z, "piedra");
  }
  return m;
}

function dron(mundo, extra = {}) {
  return new Dron(mundo, { x: 0, y: 1, z: 0, dir: "este", ...extra });
}

test("alturaSpawn deja el dron sobre el terreno", () => {
  const m = mundoPlano();
  const y = alturaSpawn(m, 0, 0);
  assert.equal(y, 1, "suelo en 0 → spawn en 1");
  const d = dron(m, { y });
  assert.ok(d.soportado(), "está apoyado en el suelo");
});

test("adelante avanza una celda vacía y gasta batería", () => {
  const d = dron(mundoPlano());
  const r = d.mover("adelante");
  assert.equal(r.ok, true);
  assert.deepEqual([d.x, d.z], [1, 0]);
  assert.equal(r.bateria, BATERIA_INICIAL - COSTO_MOVER);
  assert.deepEqual(r.pasos, [[1, 1, 0]]);
});

test("adelante contra un bloque no se mueve ni gasta", () => {
  const m = mundoPlano();
  m.colocar(1, 1, 0, "piedra");
  const d = dron(m);
  const r = d.mover("adelante");
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "bloque");
  assert.equal(d.x, 0);
  assert.equal(d.bateria, BATERIA_INICIAL);
});

test("sin suelo debajo, avanza y cae hasta el suelo", () => {
  const m = new Mundo(42, new Map()); // sin suelo
  m.colocar(3, 0, 0, "piedra"); // suelo solo en x=3
  const d = new Dron(m, { x: 0, y: 5, z: 0, dir: "este" });
  const r = d.mover("adelante");
  assert.equal(r.ok, true);
  // Avanza a x=1 y cae hasta y=0 (sin suelo bajo esa columna, el fondo
  // del mundo detiene la caída).
  assert.deepEqual([d.x, d.y, d.z], [1, 0, 0]);
  assert.ok(r.pasos.length > 1, "los pasos incluyen la caída");
});

test("arriba sube, gasta el doble y no cae de vuelta", () => {
  const d = dron(mundoPlano());
  const r = d.mover("arriba");
  assert.equal(r.ok, true);
  assert.equal(d.y, 2, "las hélices aguantan: no regresa al suelo");
  assert.equal(r.bateria, BATERIA_INICIAL - COSTO_ARRIBA);
});

test("abajo al aire desciende gratis hasta el suelo", () => {
  const m = mundoPlano();
  m.destruir(0, 0, 0); // hueco en la columna del dron
  const d = new Dron(m, { x: 0, y: 3, z: 0 });
  const r = d.mover("abajo");
  assert.equal(r.ok, true);
  assert.equal(d.y, 0, "cae hasta el fondo del hueco");
  assert.equal(r.bateria, BATERIA_INICIAL, "caer es gratis");
});

test("abajo sobre bloque lo excava al inventario", () => {
  const m = mundoPlano();
  const d = dron(m);
  const r = d.mover("abajo");
  assert.equal(r.ok, true);
  assert.equal(m.obtener(0, 0, 0), null, "el bloque desaparece del mundo");
  assert.equal(r.inventario.piedra, 1, "va al inventario");
  assert.equal(r.bateria, BATERIA_INICIAL - COSTO_EXCAVAR);
  assert.deepEqual(r.cambio, [0, 0, 0, null]);
});

test("minar extrae el bloque de delante y recarga batería", () => {
  const m = mundoPlano();
  m.colocar(1, 1, 0, "madera");
  const d = dron(m, { bateria: 50 });
  const r = d.minar();
  assert.equal(r.ok, true);
  assert.equal(m.obtener(1, 1, 0), null);
  assert.equal(r.inventario.madera, 1);
  assert.equal(r.bateria, 51, "romper bloques recarga +1");
  assert.deepEqual(r.cambio, [1, 1, 0, null]);
});

test("minar al aire falla sin tocar nada", () => {
  const d = dron(mundoPlano());
  const r = d.minar();
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "vacio");
  assert.equal(d.bateria, BATERIA_INICIAL);
});

test("poner consume inventario y batería", () => {
  const m = mundoPlano();
  const d = dron(m, { inventario: { ladrillo: 2 }, bateria: 10 });
  const r = d.poner("ladrillo");
  assert.equal(r.ok, true);
  assert.equal(m.obtener(1, 1, 0), "ladrillo");
  assert.equal(r.inventario.ladrillo, 1);
  assert.equal(r.bateria, 9);
});

test("poner falla sin inventario, sin batería o con celda ocupada", () => {
  const m = mundoPlano();
  assert.equal(dron(m).poner("ladrillo").motivo, "inventario");
  assert.equal(dron(m, { inventario: { ladrillo: 1 }, bateria: 0 }).poner("ladrillo").motivo, "bateria");
  m.colocar(1, 1, 0, "piedra");
  assert.equal(dron(m, { inventario: { ladrillo: 1 } }).poner("ladrillo").motivo, "bloque");
  assert.equal(dron(m, { inventario: { diamante: 1 } }).poner("diamante").motivo, "tipo");
});

test("batería agotada bloquea el movimiento", () => {
  const d = dron(mundoPlano(), { bateria: 0 });
  assert.equal(d.mover("adelante").motivo, "bateria");
  assert.equal(d.mover("arriba").motivo, "bateria");
  assert.equal(d.mover("abajo").motivo, "bateria", "excavar también cuesta");
});

test("girar rota las 4 direcciones en ambos sentidos", () => {
  const d = dron(mundoPlano());
  d.girar("izquierda");
  assert.equal(d.dir, "norte", "este → norte");
  d.girar("derecha");
  assert.equal(d.dir, "este");
  d.girar("derecha");
  assert.equal(d.dir, "sur");
  assert.equal(d.girar("arriba").motivo, "lado");
});

test("detectar lee la celda de delante", () => {
  const m = mundoPlano();
  const d = dron(m);
  assert.equal(d.detectar(), null, "aire");
  m.colocar(1, 1, 0, "madera");
  assert.equal(d.detectar(), "madera");
  d.girar("derecha"); // mira al sur
  assert.equal(d.detectar(), null);
});
