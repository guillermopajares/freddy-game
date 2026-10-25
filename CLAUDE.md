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
| `js/assets.js` | **~60 MB** de imágenes en base64, solo para `file://`. Generado: no editar ni leer entero |
| `js/sprite.js` | Coordenadas de frames de las hojas, chroma key, `SpriteSheet` |
| `js/characters.js` | Frames de los personajes elegibles y del coche de Dani; `CHARACTERS` (escala, stats y ulti de cada uno) |
| `js/input.js` | Teclado + mando + botones táctiles → acciones (`BINDINGS`: `jump`, `fire`, `melee`, `dash`...) |
| `js/sound.js` | Efectos y música sintetizados con Web Audio (sin ficheros de audio) |
| `js/collision.js` | AABB y resolución contra plataformas |
| `js/projectile.js` | Proyectiles del jugador y enemigos (`PROJECTILE_TYPES`) |
| `js/enemy.js` | `Enemy` base, `CodeBug`, `Error404`, jefes; `ENEMY_TYPES` |
| `js/collectible.js` | Monedas, estrellas, corazones, papel, poderes |
| `js/player.js` | Freddy: física, ataques, poderes, daño |
| `js/scenery.js` | Decorado de David: fondo con parallax, plataformas con relieve, sombras, puerta |
| `js/level.js` | Clase `Level` + datos de los 5 niveles (formato compacto, ver `docs/levels.md`) |
| `js/story.js` | Historia entre niveles (`STORY`) y, por personaje, lema, frase por nivel y final (`CHARACTER_STORY`) |
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

- **`js/assets.js` pesa ~60 MB en una línea por imagen.** No hacer `cat`, `grep` sin excluirlo ni `Read` sin límite.
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
- **Leer acciones, no teclas:** `input.isDown('jump')`, no `'KeyW'`. Las teclas viven solo en `BINDINGS`; el mando
  y los botones táctiles (`data-action`) dan acciones directamente. Start del mando es `start`: pausa en juego y
  confirma en menús (si mandase Enter y Esc a la vez, la pausa se anularía en el mismo frame).
- **`InputHandler` ignora teclas cuyo destino es `input/select/button/summary`**: escribir el nombre del ranking
  no mueve a Freddy. Los botones del overlay hacen `preventDefault` en `pointerdown` para no quedarse con el foco
  (si no, Enter activa el botón y el juego a la vez).
- **`setPointerCapture` lanza con punteros sintéticos**; va en `try` tras marcar la tecla.
- **Resolución del canvas:** `Game.resize` le da tantos píxeles como se ven (escala CSS × `devicePixelRatio`,
  tope 2x) y dibuja con `setTransform`; si se deja en 960×720 el escalado CSS lo pixela.
  No volver a `imageSmoothingQuality = 'high'` (a 2x hundía los fps) ni a `image-rendering: pixelated`.
- **Medir rendimiento sin `getImageData`:** leer píxeles del canvas hace que Chrome lo pase a modo software
  y falsea la medida (y ralentiza la pestaña hasta recargar).
- **Personajes:** el elegido se guarda en `settings.character`; `Player` recibe su entrada de `CHARACTERS`
  (`speed`, `jumpForce`, `punch`, `reach`, `car`). Los no elegidos salen como `BossRival` en el nivel 1 y,
  con `rivalChance`, en lugar del minijefe de los niveles 2 y 4. `BossRival` no mira bordes: solo en arenas con suelo entero.
- **`assets/guille.jpg` viene de `art/guille.jpeg`**, que traía un fondo de cuadros (falsa transparencia) en vez de
  verde: se convirtió a verde croma una vez. Las hojas de personajes (todas menos Freddy) usan `keepLargest` para
  borrar trozos de frames vecinos y `seeThrough` para el verde encerrado entre brazo y cuerpo.
- **Nuevo personaje:** hoja en `art/` → copiarla a `assets/<id>.jpg`, entrada en `ASSET_FILES`, frames y entrada en
  `CHARACTERS` (`js/characters.js`), su historia en `CHARACTER_STORY` (`js/story.js`; un test exige una frase por nivel),
  `node tools/build-assets.js`. `tests/levels.test.js` comprueba con la velocidad y
  el salto de cada personaje que llega a todo. La selección muestra al elegido en grande con barras
  (`characterStats` en `game.js`, calculadas de los mismos campos que usa `Player`) y cuatro tarjetas por fila: tocar una
  la previsualiza, tocarla otra vez o «¡A jugar!» la elige.
- **Ulti:** un personaje con `ultimate` en `CHARACTERS` (hoy Dani → Spider Dani) llena una barra matando enemigos y
  cogiendo monedas/estrellas; con ella llena, `ultimate` (I/V, Y del mando, botón ⚡) lo transforma `ULT_TIME` frames.
  `Player.form` = personaje con la ulti encima: leer de ahí `punch/reach/car/dash`, no de `character`. La hoja de la
  ulti va en `game.ultSheets` (no en `sheets`: no es elegible ni rival). Para dar ulti a otro, hoja nueva + entrada.
- **Hoja de objetos (`assets/elements.jpg`, `ITEM_FRAMES`):** fuego intermitente (`fires` del nivel), veneno (quita
  vida), poción turbo, portátil (vida extra hasta 9) y los emojis que dispara el Glitch 404. Va a media resolución.
- **Mueble de recreativa:** `main.js` (`fit`) pone `data-cabinet="full|compact|off"` en `<html>` según el ajuste
  `cabinet` y el tamaño de la ventana (táctil: siempre `off`), y `no-crt` si se quita el efecto del cristal. Cada modo
  tiene su tamaño lógico en `SIZES`; si se añade algo al mueble que cambie su alto, actualizarlo ahí.
- **Táctil:** el juego ocupa todo el alto en horizontal (los mandos, semitransparentes, pisan el borde si no caben) y todo
  el ancho en vertical (`touchScale` en `main.js`). Moverse es una palanca (`data-stick`, `input.js`) que se arrastra sin
  levantar el dedo. Los mandos de juego solo se ven con `<html class="playing">` (lo pone `game.js`). En táctil se
  empieza en Fácil (`new Progress(storage, defaults)`), pensada para el móvil: `mercy` y `hearts` en `DIFFICULTY`.
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
- **Nuevo objeto:** tipo en `collectible.js` (dibujo o entrada en `ITEM_SPRITES` y `value`) + efecto en `Game.handleCollectibles`.
  Solo `coin/star/heart` cuentan para las estrellas del nivel (`STAR_TYPES`).
- **Nuevo logro:** entrada en `ACHIEVEMENTS` (`js/progress.js`) + `game.unlockAchievement(id)` donde ocurra.
- **Nuevo sonido:** `case` en `Sound.play` (`js/sound.js`), sintetizado con `tone`/`noise`.

## Despliegue

- `.github/workflows/test.yml`: tests en cada push/PR.
- `.github/workflows/pages.yml`: publica en GitHub Pages desde `main` (sin `js/assets.js`, no hace falta online).
  Requiere una vez: Settings → Pages → Source: GitHub Actions.
