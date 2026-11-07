# VoxelCraft

Juego tipo Minecraft en el navegador para **aprender a programar en Python**.

Mínés, construye y avanza en misiones escribiendo Python real desde el juego.
El motor es JavaScript (Three.js) y tu código corre con
[Pyodide](https://pyodide.org) dentro del navegador.

## Cómo ejecutar

Necesitas Python 3 para servir los archivos (o cualquier servidor estático):

```bash
cd voxelcraft
python3 -m http.server 8000
```

Abre <http://localhost:8000>.

> La primera vez tarda unos segundos en cargar Pyodide (desde CDN).
> Requiere internet.

## Cómo jugar

| Acción | Tecla / ratón |
|--------|---------------|
| Moverse | `W` `A` `S` `D` |
| Saltar | `Espacio` |
| Picar bloque | clic izquierdo |
| Colocar bloque | clic derecho |
| Capturar/soltar ratón | clic en el canvas |
| Editor de código | pestaña lateral |

## Misiones

El panel derecho muestra la misión activa. Escribe Python, pulsa
**Ejecutar** y el juego comprueba el resultado en el mundo:

1. `01_colocar_bloque.py` — primer bloque con `colocar_bloque`
2. `02_excavar_tunel.py` — un túnel con `for`
3. `03_escalera.py` — una escalera de N peldaños con `range`
4. `04_casa.py` — una casa básica con funciones

Cada misión avanza automáticamente cuando la verificación pasa.

## API de Python

Expuesta en el juego (todas las coordenadas son enteras):

```python
colocar_bloque(x, y, z, tipo)   # tipo: "hierba" "tierra" "piedra" "arena" "madera" "ladrillo"
destruir_bloque(x, y, z)
obtener_bloque(x, y, z)         # -> str o None
altura_terreno(x, z)            # -> int
distancia(a, b)                 # a, b: tuplas (x, y, z) -> float
```

## Publicar

Es estático: sube la carpeta a GitHub Pages
(*Settings → Pages → deploy from branch*) o a cualquier hosting.

## Desarrollo

```bash
npm test        # test headless de world.js (requiere Node)
```

## Licencia

MIT
