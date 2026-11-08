// Jugador en primera persona: pointer lock, WASD, gravedad, salto,
// colisión con bloques, picar (clic izq.) y colocar (clic der.).
import * as THREE from "three";

const VELOCIDAD = 5.5;
const FUERZA_SALTO = 8.5;
const GRAVEDAD = -25;
const ALTURA_JUGADOR = 1.7;
const RADIO = 0.3;
const ALCANCE = 6;

export function crearJugador(camara, canvas, mundo, alCambiar) {
  const estado = {
    pos: new THREE.Vector3(0.5, 20, 0.5),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: -0.3,
    enSuelo: false,
    tipoBloque: "ladrillo",
    bloqueado: true, // esperando clic para capturar el ratón
  };

  // Coloca al jugador sobre el terreno del punto (0, 0).
  estado.pos.y = mundo.alturaTerreno(0, 0) + 3;

  const teclas = new Set();

  canvas.addEventListener("click", () => {
    if (estado.bloqueado) canvas.requestPointerLock();
  });
  document.addEventListener("pointerlockchange", () => {
    estado.bloqueado = document.pointerLockElement !== canvas;
  });

  document.addEventListener("mousemove", (e) => {
    if (estado.bloqueado) return;
    estado.yaw -= e.movementX * 0.0022;
    estado.pitch -= e.movementY * 0.0022;
    estado.pitch = Math.max(-1.55, Math.min(1.55, estado.pitch));
  });

  window.addEventListener("keydown", (e) => {
    if (!estado.bloqueado) return;
    teclas.add(e.code);
    if (e.code === "Digit1") estado.tipoBloque = "ladrillo";
    if (e.code === "Digit2") estado.tipoBloque = "madera";
    if (e.code === "Digit3") estado.tipoBloque = "piedra";
    if (e.code === "Digit4") estado.tipoBloque = "arena";
  });
  window.addEventListener("keyup", (e) => teclas.delete(e.code));

  function dirMirada() {
    return new THREE.Vector3(
      -Math.sin(estado.yaw) * Math.cos(estado.pitch),
      Math.sin(estado.pitch),
      -Math.cos(estado.yaw) * Math.cos(estado.pitch),
    );
  }

  canvas.addEventListener("mousedown", (e) => {
    if (estado.bloqueado) return;
    const origen = camara.position;
    const dir = dirMirada();
    const golpe = mundo.raycast(
      origen.x, origen.y, origen.z,
      dir.x, dir.y, dir.z,
      ALCANCE,
    );
    if (!golpe) return;
    if (e.button === 0) {
      mundo.destruir(golpe.x, golpe.y, golpe.z);
      alCambiar();
    } else if (e.button === 2) {
      const x = golpe.x + golpe.nx;
      const y = golpe.y + golpe.ny;
      const z = golpe.z + golpe.nz;
      // No colocar un bloque dentro del propio jugador.
      const p = estado.pos;
      const dentro =
        x + 1 > p.x - RADIO && x < p.x + RADIO &&
        z + 1 > p.z - RADIO && z < p.z + RADIO &&
        y + 1 > p.y && y < p.y + ALTURA_JUGADOR;
      if (!dentro) {
        mundo.colocar(x, y, z, estado.tipoBloque);
        alCambiar();
      }
    }
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ¿La caja del jugador choca con algún bloque en (px, py, pz)?
  function choca(px, py, pz) {
    const minX = Math.floor(px - RADIO);
    const maxX = Math.floor(px + RADIO);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + ALTURA_JUGADOR);
    const minZ = Math.floor(pz - RADIO);
    const maxZ = Math.floor(pz + RADIO);
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (mundo.obtener(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  function actualizar(dt) {
    // La cámara se actualiza siempre (también con el puntero sin capturar),
    // pero la física solo corre cuando se está jugando.
    const jugando = !estado.bloqueado;
    const p = estado.pos;

    if (jugando) {
      // Dirección en el plano XZ según la mirada.
      const adelante = new THREE.Vector3(-Math.sin(estado.yaw), 0, -Math.cos(estado.yaw));
      const derecha = new THREE.Vector3(-adelante.z, 0, adelante.x);
      const movimiento = new THREE.Vector3();
      if (teclas.has("KeyW")) movimiento.add(adelante);
      if (teclas.has("KeyS")) movimiento.sub(adelante);
      if (teclas.has("KeyD")) movimiento.add(derecha);
      if (teclas.has("KeyA")) movimiento.sub(derecha);
      if (movimiento.lengthSq() > 0) movimiento.normalize().multiplyScalar(VELOCIDAD);

      estado.vel.x = movimiento.x;
      estado.vel.z = movimiento.z;
      estado.vel.y += GRAVEDAD * dt;
      if (teclas.has("Space") && estado.enSuelo) {
        estado.vel.y = FUERZA_SALTO;
        estado.enSuelo = false;
      }

      // Eje X.
      const nx = p.x + estado.vel.x * dt;
      if (!choca(nx, p.y, p.z)) p.x = nx;
      // Eje Z.
      const nz = p.z + estado.vel.z * dt;
      if (!choca(p.x, p.y, nz)) p.z = nz;
      // Eje Y.
      const ny = p.y + estado.vel.y * dt;
      if (!choca(p.x, ny, p.z)) {
        p.y = ny;
        estado.enSuelo = false;
      } else {
        if (estado.vel.y < 0) estado.enSuelo = true;
        estado.vel.y = 0;
      }
      // Red de seguridad: si cae al vacío, reaparece sobre el terreno.
      if (p.y < -30) {
        p.set(0.5, mundo.alturaTerreno(0, 0) + 3, 0.5);
        estado.vel.set(0, 0, 0);
      }
    }

    camara.position.set(p.x, p.y + ALTURA_JUGADOR - 0.15, p.z);
    camara.rotation.order = "YXZ";
    camara.rotation.y = estado.yaw;
    camara.rotation.x = estado.pitch;
  }

  return { estado, actualizar };
}
