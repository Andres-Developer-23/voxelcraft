// Arranque del juego: mundo, jugador en primera persona y render.
import * as THREE from "three";
import { Mundo } from "./world.js";
import { crearEscena, crearRenderer, reconstruirMundo } from "./render.js";
import { crearJugador } from "./player.js";

const canvas = document.getElementById("game");
const renderer = crearRenderer(canvas);
const { escena, grupo } = crearEscena();

const mundo = new Mundo(42);
reconstruirMundo(mundo, grupo);

const camara = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  300,
);

function alCambiar() {
  reconstruirMundo(mundo, grupo);
}

const jugador = crearJugador(camara, canvas, mundo, alCambiar);

// HUD: bloque elegido y aviso de captura del ratón.
const etiquetaBloque = document.getElementById("bloque-actual");
const aviso = document.getElementById("aviso");
setInterval(() => {
  etiquetaBloque.textContent = `Bloque: ${jugador.estado.tipoBloque}`;
  aviso.textContent = jugador.estado.bloqueado
    ? "Clic en la pantalla para empezar"
    : "Pulsa Esc para liberar el ratón";
}, 200);

function redimensionar() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
}
window.addEventListener("resize", redimensionar);
redimensionar();

let ultimo = performance.now();
renderer.setAnimationLoop(() => {
  const ahora = performance.now();
  const dt = Math.min((ahora - ultimo) / 1000, 0.05);
  ultimo = ahora;
  jugador.actualizar(dt);
  renderer.render(escena, camara);
});
