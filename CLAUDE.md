# Freddy Game

Plataformas 2D en canvas, ambientado en Rick y Morty: Freddy limpia "bugs" con rollos de papel
(distancia) y un desatascador (cuerpo a cuerpo). JavaScript puro, sin bundler ni framework.

## Ejecutar y probar

```bash
python3 -m http.server 8000      # y abrir http://localhost:8000 (modo normal, carga rápida)
npm test                         # Jest: física, niveles, progreso, colisiones, proyectiles
node --check js/<fichero>.js     # sintaxis rápida tras editar (no hay build que lo detecte)
```

- Abrir `index.html` con doble clic (`file://`) también funciona, pero usa `js/assets.js` embebido.
- **No hay paso de compilación**: un error de sintaxis en cualquier `js/*.js` deja el juego en negro.
  Antes de commitear: `node --check` en lo tocado + `npm test`.
- Si `npm`/`npx` reescribe `package-lock.json` (añade campos `libc`), revertirlo: no es un cambio real.

## Arquitectura

Scripts clásicos cargados en orden desde `index.html`; todo son globales (`class Player`, `levels`,
`Sound`...). El orden importa: un fichero solo puede usar lo definido en los anteriores **al cargar**.

| Fichero | Qué hace |
|---|---|
| `js/asset-files.js` | Rutas de imágenes (`ASSET_FILES`) |
| `js/assets.js` | **20 MB** de imágenes en base64, solo para `file://`. Generado: no editar ni leer entero |
| `js/sprite.js` | Coordenadas de frames de las hojas, chroma key, `SpriteSheet` |
| `js/input.js` | Teclado + mando + botones táctiles → mismos códigos (`KeyA`, `Space`...) |
| `js/sound.js` | Efectos y música sintetizados con Web Audio (sin ficheros de audio) |
| `js/collision.js` | AABB y resolución contra plataformas |
| `js/projectile.js` | Proyectiles del jugador y enemigos (`PROJECTILE_TYPES`) |
| `js/enemy.js` | `Enemy` base, `CodeBug`, `Error404`, jefes; `ENEMY_TYPES` |
| `js/collectible.js` | Monedas, estrellas, corazones, papel, poderes |
| `js/player.js` | Freddy: física, ataques, poderes, daño |
| `js/scenery.js` | Decorado de David: fondo con parallax, plataformas con relieve, sombras, puerta |
| `js/level.js` | Clase `Level` + datos de los 5 niveles (formato compacto, ver `docs/levels.md`) |
| `js/story.js` | Textos de historia entre niveles |
| `js/progress.js` | Guardado (localStorage), ajustes, dificultad, logros, ranking local. Sin DOM: testeable |
| `js/api.js` | Cliente del ranking online (`RankingApi`, contrato en `api.md`). Sin DOM: testeable |
| `js/game.js` | Bucle, estados, cámara, combate, jefes, riada, menús HTML |
| `tools/build-assets.js` | Regenera `js/assets.js` desde `assets/` |

Detalles clave:

- **Bucle a paso fijo de 60 Hz** (`STEP` en `game.js`): toda la física cuenta en frames. No usar `Date.now()`
  para lógica de juego.
- **Lienzo lógico 960×720.** `main.js` lo escala con la variable CSS `--scale`. Nunca leer el tamaño real del canvas.
- **Coordenadas de mundo vs pantalla.** Los niveles miden hasta 3840 px; `game.camX` es la cámara. Se dibuja el
  mundo dentro de `ctx.translate(-camX, 0)`; HUD, barra de jefe, banners, `scenery.drawBackground` y
  `scenery.drawForeground` van en coordenadas de pantalla (fuera del translate).
- **Estados de `Game`:** `loading, menu, story, playing, paused, exiting, levelComplete, gameOver, victory`.
  Los menús son HTML (`#overlay`, `showOverlay({...buttons})`); el juego solo se dibuja en el canvas.
- **Exportar para tests:** los ficheros que se prueban en Node terminan con
  `if (typeof module !== 'undefined') module.exports = ...`. Si un test necesita globales (`Collision`,
  `Sound`...), los define en `global` (ver `tests/player.test.js`).

## Convenciones

- Identificadores en inglés; **comentarios, textos de UI y mensajes de commit en español**.
- Comentarios breves que explican el porqué, no el qué.
- Solución mínima: sin dependencias nuevas, sin abstracciones de un solo uso. Las ramas generadas por otros
  agentes (Jules) ya rompieron el juego con merges mal resueltos y coordenadas inventadas: verificar siempre.

## Trampas conocidas (aprendidas a base de errores)

- **`js/assets.js` pesa 20 MB en una línea por imagen.** No hacer `cat`, `grep` sin excluirlo ni `Read` sin límite.
  Para cambiar imágenes: editar `assets/` y `js/asset-files.js`, luego `node tools/build-assets.js`.
- **`file://` no permite `getImageData` sobre imágenes sueltas** (canvas "tainted"); por eso existe la versión
  embebida. Por http se cargan los ficheros. Probar siempre por http.
- **Chroma key por flood-fill desde los bordes** (`chromaKeyFrame`): el verde de los dígitos "404" y de las babas
  es casi igual al fondo. Una clave por color global los borraría. No cambiarlo a umbral simple.
- **Las hojas de sprites miran a la derecha.** `facing = -1` voltea; el Error 404 usa `mirror = false`
  (si no, "404" sale al revés).
- **Los fondos `bg_01`/`bg_05` traen ~28 px blancos a la izquierda**: `scenery.drawBackground` recorta 30 px.
- **Jefes que caen:** si aparecen encima de una plataforma pequeña se quedan atascados (no saltan bordes).
  Los flotantes (`Boss404`, `BossGlitch`) no tienen gravedad y da igual.
- **La micro-pausa (`hitstop`) se comprueba antes de `handleInput`**; si no, M/Esc se procesan dos veces.
- **`InputHandler` ignora teclas cuyo destino es `input/select/button/summary`**: escribir el nombre del ranking
  no mueve a Freddy. Los botones del overlay hacen `preventDefault` en `pointerdown` para no quedarse con el foco
  (si no, Enter activa el botón y el juego a la vez).
- **`setPointerCapture` lanza con punteros sintéticos**; va en `try` tras marcar la tecla.
- **Resolución del canvas:** `Game.resize` le da tantos píxeles como se ven (escala CSS × `devicePixelRatio`,
  tope 2x) y dibuja con `setTransform`; si se deja en 960×720 el escalado CSS lo pixela.
  No volver a `imageSmoothingQuality = 'high'` (a 2x hundía los fps) ni a `image-rendering: pixelated`.
- **Medir rendimiento sin `getImageData`:** leer píxeles del canvas hace que Chrome lo pase a modo software
  y falsea la medida (y ralentiza la pestaña hasta recargar).
- **`localStorage` puede lanzar** (modo privado): todo el guardado pasa por `Progress`, que lo tolera.
- **El ranking online es producción**: no enviar puntuaciones de prueba a `API_URL`. En tests se simula `fetch`;
  en el navegador, interceptar `**/api/**` con Playwright. Si la API falla se muestra el ranking local.

## Depurar en el navegador

- Exponer el juego temporalmente: en `main.js`, `game.init(); window.game = game;`. **No commitearlo.**
- Atajos útiles desde consola: `game.startLevel(i, { lives: 5, ammo: 20 })`, `game.player.invincibleTimer = 1e9`,
  teletransportar con `game.player.x = ...`, `game.boss.takeDamage(n)`.
- `python3 -m http.server` cachea: recargar con caché vacía tras editar.
- Medir FPS con varios segundos de `requestAnimationFrame`; los primeros frames tras `startLevel` son más lentos
  (se generan capas de `scenery`) y falsean la media.

## Tareas habituales

- **Nuevo nivel o cambio de plataformas:** editar datos en `js/level.js` y pasar `npm test`.
  `tests/levels.test.js` simula el salto real y falla si la puerta o algún objeto quedan inalcanzables.
  Guía y límites de salto en `docs/levels.md`.
- **Nuevo enemigo/jefe:** subclase en `js/enemy.js` (`think(player, level, game)`), registrarla en `ENEMY_TYPES`,
  frames en `ENEMY_FRAMES` si hace falta. Jefes: `isBoss`, `name`, `achievement`, `phase`; aparecen con
  `boss: { type, x, y, arenaX }` en el nivel. Ver `docs/sprites.md` para recortar frames nuevos.
- **Nuevo objeto:** tipo en `collectible.js` (dibujo y `value`) + efecto en `Game.handleCollectibles`.
  Solo `coin/star/heart` cuentan para las estrellas del nivel (`STAR_TYPES`).
- **Nuevo logro:** entrada en `ACHIEVEMENTS` (`js/progress.js`) + `game.unlockAchievement(id)` donde ocurra.
- **Nuevo sonido:** `case` en `Sound.play` (`js/sound.js`), sintetizado con `tone`/`noise`.

## Despliegue

- `.github/workflows/test.yml`: tests en cada push/PR.
- `.github/workflows/pages.yml`: publica en GitHub Pages desde `main` (sin `js/assets.js`, no hace falta online).
  Requiere una vez: Settings → Pages → Source: GitHub Actions.
