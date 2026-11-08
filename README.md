# VoxelCraft

Juego tipo Minecraft en el navegador para **aprender a programar en Python**.

Mina, construye y avanza en misiones escribiendo Python real desde el juego.
El motor es JavaScript ([Three.js](https://threejs.org)) y tu código corre con
[Pyodide](https://pyodide.org) (Python en WebAssembly) dentro del navegador.

No hay nada que instalar: solo un servidor de archivos estáticos e internet.

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
| Elegir bloque | `1` ladrillo · `2` madera · `3` piedra · `4` arena |
| Capturar el ratón | clic en la pantalla |
| Liberar el ratón | `Esc` |
| Ejecutar el código | botón **▶ Ejecutar** o `Ctrl`+`Enter` |
| Indentar en el editor | `Tab` (mete 4 espacios) |

## Misiones

El panel derecho muestra la misión activa, con su progreso. Escribe Python,
pulsa **Ejecutar** y el juego comprueba el resultado en el mundo: si está bien
aparece **✔** y el botón **Siguiente ▶**; si no, el mensaje te dice qué falta.

| # | Archivo | Qué aprendes |
|---|---------|--------------|
| 1 | `lessons/01_colocar_bloque.py` | variables, `print` y llamar a `colocar_bloque` |
| 2 | `lessons/02_excavar_tunel.py` | bucle `for` con `range` |
| 3 | `lessons/03_escalera.py` | `range`, aritmética y posiciones |
| 4 | `lessons/04_casa.py` | definir funciones con `def` y llamarlas |

Cada misión guarda tu código por separado, así que puedes volver atrás sin
perder lo que hiciste. **↺ Reiniciar** restaura el código original.

## API de Python

Todo lo que puedes llamar desde tu código (coordenadas enteras):

```python
colocar_bloque(x, y, z, tipo)   # tipo: "hierba" "tierra" "piedra" "arena" "madera" "ladrillo"
destruir_bloque(x, y, z)        # quita el bloque de esa posición
obtener_bloque(x, y, z)         # -> str (el tipo) o None si no hay bloque
altura_terreno(x, z)            # -> int, y del bloque más alto de la columna
distancia(a, b)                 # a, b: (x, y, z) -> float
print(...)                      # escribe en la consola del juego
```

Errores comunes (`NameError`, `SyntaxError`, `IndentationError`…) se traducen
a un mensaje en español que explica qué hacer.

## Publicar en GitHub Pages

El juego es 100 % estático. Con el repositorio en GitHub:

1. **Settings → Pages**
2. En *Source*, elige **Deploy from a branch**
3. Rama `main`, carpeta `/ (root)` → **Save**
4. En unos segundos estará en
   `https://<usuario>.github.io/voxelcraft/`

Cualquier otro hosting estático (Netlify, Cloudflare Pages…) funciona igual:
sube la carpeta tal cual está.

## Estructura

```
voxelcraft/
├── index.html          # lienzo 3D + panel del editor
├── style.css
├── js/
│   ├── main.js         # arranque, misiones y bucle de render
│   ├── world.js        # mundo de bloques (puro, testeable en Node)
│   ├── render.js       # dibuja los bloques con Three.js
│   ├── player.js       # primera persona, gravedad, picar/colocar
│   ├── bridge.js       # puente Python ↔ juego (Pyodide)
│   ├── editor.js       # editor y consola del panel
│   └── lessons.js      # misiones y su verificación
├── lessons/            # código inicial de cada misión
├── test/               # tests headless con node --test
└── README.md
```

## Desarrollo

```bash
npm test        # tests headless de world.js (requiere Node)
```

Los tests no abren ventana ni necesitan navegador.

## Limitaciones conocidas

- Requiere internet (Three.js y Pyodide se cargan desde CDN).
- No hay límite de tiempo de ejecución: un bucle infinito en Python congela
  la pestaña. El código se guarda antes de ejecutar, así que no se pierde.
- Pensado para escritorio (necesita teclado y ratón).

## Licencia

MIT
