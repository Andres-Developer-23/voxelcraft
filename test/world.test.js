// Test headless de js/world.js: no abre ventana ni necesita navegador.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Mundo, TIPOS, TIPOS_LISTA } from "../js/world.js";

test("la generación es determinista con la misma semilla", () => {
  const a = new Mundo(42);
  const b = new Mundo(42);
  assert.equal(a.bloques.size, b.bloques.size);
  assert.deepEqual([...a.bloques.keys()].sort(), [...b.bloques.keys()].sort());
});

test("semillas distintas generan mundos distintos", () => {
  const a = new Mundo(1);
  const b = new Mundo(2);
  assert.notDeepEqual([...a.bloques.keys()].sort(), [...b.bloques.keys()].sort());
});

test("cada columna tiene bloque y el terreno tiene hierba encima", () => {
  const m = new Mundo(42);
  assert.ok(m.bloques.size > 1000, "debería haber muchos bloques");
  const y = m.alturaTerreno(0, 0);
  assert.ok(y >= 0, "hay terreno en (0,0)");
  assert.equal(m.obtener(0, y, 0), "hierba");
  // Piedra en el fondo de la columna.
  assert.equal(m.obtener(0, 0, 0), "piedra");
});

test("obtener devuelve null donde no hay bloque", () => {
  const m = new Mundo(42);
  assert.equal(m.obtener(0, 999, 0), null);
  assert.equal(m.obtener(9999, 0, 9999), null);
});

test("picar un bloque lo elimina", () => {
  const m = new Mundo(42);
  const y = m.alturaTerreno(0, 0);
  assert.notEqual(m.obtener(0, y, 0), null);
  m.destruir(0, y, 0);
  assert.equal(m.obtener(0, y, 0), null);
});

test("colocar un bloque lo deja disponible con su tipo", () => {
  const m = new Mundo(42);
  m.colocar(0, 50, 0, "ladrillo");
  assert.equal(m.obtener(0, 50, 0), "ladrillo");
  assert.equal(m.alturaTerreno(0, 0), 50, "alturaTerreno sube al colocar encima");
});

test("colocar un tipo desconocido lanza error claro", () => {
  const m = new Mundo(42);
  assert.throws(() => m.colocar(0, 50, 0, "diamante"), /desconocido/);
  for (const tipo of TIPOS_LISTA) {
    assert.ok(tipo in TIPOS);
    m.colocar(1, 50, 1, tipo);
    assert.equal(m.obtener(1, 50, 1), tipo);
  }
});

test("bloquesVisibles solo devuelve bloques con cara al aire", () => {
  const m = new Mundo(42);
  const visibles = new Set(m.bloquesVisibles().map(([x, y, z]) => `${x},${y},${z}`));
  assert.ok(visibles.size > 0);
  assert.ok(visibles.size < m.bloques.size, "no dibuja los bloques enterrados");
  // Un bloque con vecinos en los 6 lados no debería estar en la lista.
  for (const [x, y, z] of m.bloquesVisibles()) {
    const vecinos =
      m.obtener(x + 1, y, z) && m.obtener(x - 1, y, z) &&
      m.obtener(x, y + 1, z) && m.obtener(x, y - 1, z) &&
      m.obtener(x, y, z + 1) && m.obtener(x, y, z - 1);
    assert.ok(!vecinos, `(${x},${y},${z}) está enterrado y no debería listarse`);
  }
});

test("raycast detecta el primer bloque y su normal", () => {
  const m = new Mundo(42);
  const y = m.alturaTerreno(0, 0);
  // Mirando hacia abajo desde encima de (0,0): golpea la cara superior.
  const g = m.raycast(0.5, y + 3, 0.5, 0, -1, 0, 10);
  assert.ok(g, "debería golpear el terreno");
  assert.equal(g.x, 0);
  assert.equal(g.z, 0);
  assert.equal(g.y, y);
  assert.equal(g.ny, 1, "normal hacia arriba");

  // Mirando al vacío: nada.
  assert.equal(m.raycast(0.5, y + 3, 0.5, 0, 1, 0, 10), null);
});

test("raycast respeta la distancia máxima", () => {
  const m = new Mundo(42);
  const y = m.alturaTerreno(0, 0);
  assert.equal(m.raycast(0.5, y + 3, 0.5, 0, -1, 0, 1), null, "queda fuera de alcance");
  assert.ok(m.raycast(0.5, y + 3, 0.5, 0, -1, 0, 6));
});

test("raycast lateral golpea la cara correcta", () => {
  const m = new Mundo(42);
  // Bloque aislado en el aire: se llega de frente desde -x.
  m.colocar(5, 40, 0, "piedra");
  const g = m.raycast(3.5, 40.5, 0.5, 1, 0, 0, 10);
  assert.ok(g, "debería golpear el bloque");
  assert.deepEqual([g.x, g.y, g.z], [5, 40, 0]);
  assert.equal(g.nx, -1, "normal apuntando hacia -x");
  // Desde arriba, cayendo: cara superior.
  const g2 = m.raycast(5.5, 45, 0.5, 0, -1, 0, 10);
  assert.equal(g2.ny, 1);
});
