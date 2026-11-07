// Render del mundo con Three.js: dibuja los bloques visibles en InstancedMesh.
import * as THREE from "three";
import { TIPOS } from "./world.js";

const TAM_BLOQUE = 1;

export function crearEscena() {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x87ceeb);
  escena.fog = new THREE.Fog(0x87ceeb, 40, 110);

  const luz = new THREE.DirectionalLight(0xffffff, 1.6);
  luz.position.set(40, 80, 30);
  escena.add(luz);
  escena.add(new THREE.AmbientLight(0xffffff, 0.55));

  const grupo = new THREE.Group();
  escena.add(grupo);
  return { escena, grupo };
}

export function crearRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  return renderer;
}

// Reconstruye todas las mallas de bloques a partir del mundo.
// shortcut: se reconstruye entero con cada cambio; si el mundo crece y va
// lento, actualizar solo los bloques tocados.
export function reconstruirMundo(mundo, grupo) {
  while (grupo.children.length) {
    const hijo = grupo.children.pop();
    hijo.geometry?.dispose();
    hijo.material?.dispose();
  }

  // Agrupa las posiciones por tipo de bloque.
  const porTipo = new Map();
  for (const [x, y, z, tipo] of mundo.bloquesVisibles()) {
    if (!porTipo.has(tipo)) porTipo.set(tipo, []);
    porTipo.get(tipo).push([x, y, z]);
  }

  const geo = new THREE.BoxGeometry(TAM_BLOQUE, TAM_BLOQUE, TAM_BLOQUE);
  const matrix = new THREE.Matrix4();
  for (const [tipo, lista] of porTipo) {
    const material = new THREE.MeshLambertMaterial({ color: TIPOS[tipo] });
    const mesh = new THREE.InstancedMesh(geo, material, lista.length);
    for (let i = 0; i < lista.length; i++) {
      const [x, y, z] = lista[i];
      matrix.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    grupo.add(mesh);
  }
}
