// Arranque del juego (fase 1: mundo + cámara de vista general).
import * as THREE from "three";
import { Mundo } from "./world.js";
import { crearEscena, crearRenderer, reconstruirMundo } from "./render.js";

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
camara.position.set(30, 28, 30);
camara.lookAt(0, 6, 0);

function redimensionar() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
}
window.addEventListener("resize", redimensionar);
redimensionar();

renderer.setAnimationLoop(() => {
  renderer.render(escena, camara);
});
