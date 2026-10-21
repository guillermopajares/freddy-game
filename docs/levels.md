# Diseño de niveles

Los niveles viven en `js/level.js` como datos compactos. `tests/levels.test.js` comprueba con la física real
que la puerta y todos los objetos se pueden alcanzar: **`npm test` después de cualquier cambio de nivel.**

## Formato

```js
new Level({
    name: 'Nivel 2: La Escalada',
    background: 'bg_02',              // clave de ASSET_FILES; también elige el tema de scenery.js
    width: 3360,                      // ancho del mundo en px (pantalla: 960x720)
    spawn: [80, 530],                 // posición inicial de Freddy (esquina superior izquierda)
    exit: [3280, 570],                // puerta de 60x80; y = superficie - 80
    ground: [[0, 400], [1000, 300]],  // [x, ancho] a GROUND_Y = 650, 70 de alto
    platforms: [
        [450, 580, 120],              // [x, y, ancho]          20 de alto
        [1520, 480, 120, 60, 0.02],   // [x, y, ancho, moveX, speed]  móvil: ±moveX px, speed rad/frame
    ],
    hazards: [[1150, 650, 70]],       // [x, ySuperficie, ancho]  montículo de caca que hace daño
    checkpoints: [[1050, 650]],       // [x, ySuperficie]  punto de reaparición al caer
    enemies: [
        ['CodeBug', 200, 570],        // [tipo, x, y, opciones?]
        ['Error404', 700, 200, { elite: true, health: 3 }],
    ],
    collectibles: [['coin', 480, 540], ['paper', 650, 290]],  // [tipo, x, y]
    boss: { type: 'BossBug', x: 3200, y: 480, arenaX: 2400 }, // opcional
    flood: { delay: 180, speed: 1.6 },                         // opcional (riada desde la izquierda)
})
```

- **y de enemigos:** los que caminan (`CodeBug`) caen hasta la plataforma: basta `superficie - 80`.
  Los `Error404` flotan exactamente a esa altura (`baseY`).
- **y de objetos:** `superficie - 40` aprox. El test considera que un objeto está "sobre" una plataforma si está
  hasta 160 px por encima.
- **Tipos de objeto:** `coin`, `star`, `heart` (cuentan para las estrellas), `paper` (+5 munición),
  `triple`, `gold`, `shield` (poderes).
- **Tipos de enemigo/jefe:** claves de `ENEMY_TYPES` en `js/enemy.js`.

## Física de Freddy (para diseñar saltos)

Valores de `js/player.js`: gravedad 0.5/frame, salto −12, doble salto −9.6, velocidad 3.5 px/frame,
dash 9 px/frame durante 14 frames. Hitbox 40×108 (agachado 80).

| Subir (px) | Distancia horizontal máxima (salto + doble salto) |
|---|---|
| 0 (mismo nivel) | ~250 |
| 100 | ~225 |
| 150 | ~210 |
| 200 | ~180 |
| ≥ 236 | imposible |

- Salto simple: ~144 px de altura. Con doble salto: ~236 px.
- Regla práctica: escalones de ≤ 120 px de altura y huecos de ≤ 150 px se hacen sin dash ni precisión.
- Las plataformas móviles cuentan con todo su recorrido (`x ± moveX`) en el test.
- El techo: Freddy no se levanta de agachado si choca con una plataforma; deja ≥ 110 px libres sobre suelos
  por donde haya que pasar de pie.

## Jefes y arenas

- La arena ocupa `[arenaX, arenaX + 960]`. Al cruzar `arenaX + 60` se cierra el muro izquierdo
  (`level.leftWall`), la cámara se fija y aparece el jefe. La puerta se abre al vencerlo.
- La puerta tiene que estar **dentro** de la arena y `arenaX + 960 <= width` (lo comprueba el test).
- Los jefes con gravedad (`BossBug`, `BossSpider`) deben aparecer **sobre el suelo, no encima de una plataforma
  pequeña**: no saltan bordes y se quedan atascados. Los flotantes (`Boss404`, `BossGlitch`) dan igual.
- Durante el combate cae un paquete de papel cada 6 s en una plataforma fija de la arena: deja al menos una.
- Pon un checkpoint justo antes de `arenaX` para no repetir el nivel entero al perder.

## Riada (`flood`)

Empieza en `x = -400` tras `delay` frames y avanza `speed` px/frame hasta 250 px antes de la arena
(o del final del nivel). Hace daño a Freddy, arrastra a los enemigos normales y retrocede si Freddy reaparece
en un checkpoint por detrás. Freddy corre a 3.5 px/frame: con `speed` ≤ 2 hay margen para esperar
alguna plataforma móvil.

## Dificultad

`DIFFICULTY` en `js/progress.js` escala la vida de enemigos y jefes al crearlos (`Game.createEnemy`), y en
Difícil todos los enemigos normales son élite. Diseña para Normal.
