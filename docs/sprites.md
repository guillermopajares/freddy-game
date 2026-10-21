# Sprites

## Hojas

| Fichero | Tamaño | Contenido |
|---|---|---|
| `assets/freddy_sprites.png` | 2854×1472 PNG | Freddy: quieto, caminar, correr, saltar, desatascador, papel, daño, derribado, muerte |
| `assets/enemies.jpg` | 2854×1472 **JPEG** | Bug de código, Bug araña, Error 404, Código espagueti |
| `assets/dani.jpg`, `assets/guille.jpg` | 2752×1536 JPEG | Personajes jugables (frames en `js/characters.js`) |
| `assets/fer.jpg`, `assets/dani_car.jpg` | 3168×1344 JPEG | Fer; Dani en coche (`drive`, `crash`) |

Ambas tienen **fondo verde croma** (≈ `rgb(2,253,2)`) y textos de etiqueta debajo de cada fila.
`chromaKeyFrame` (`js/sprite.js`) lo quita al cargar:

1. Flood-fill desde los bordes del recorte sobre píxeles verdosos → transparente.
2. Verde casi puro en huecos cerrados (entre brazo y cuerpo) → transparente.
3. Despill: los píxeles pegados al fondo pierden el tinte verde.

Así sobreviven los verdes internos (dígitos "404", babas), que son casi del mismo color que el fondo.
El JPEG tiene artefactos: no endurecer los umbrales sin revisar a ojo.

## Formato de frame

En `FREDDY_FRAMES` / `ENEMY_FRAMES`: `[x, y, w, h]` o `[x, y, w, h, anchorX]`, en píxeles de la hoja original.

- Se dibujan con los pies en el borde inferior del hitbox y centrados en `anchorX`
  (por defecto `w / 2`). Usa `anchorX` cuando un arma sobresale (desatascador, babas): es el centro del cuerpo
  dentro del recorte.
- Todos los personajes miran a la derecha. El Error 404 es frontal y no se voltea (`mirror = false`).
- Personajes: escala para que midan ~110 px como Freddy (`CHARACTERS[id].scale`); como rival, ×1.36.
  Coche de Dani: 0.22. Las hojas de Dani/Fer/Guille se cargan con `keepLargest` (solo la figura mayor del recorte).
- La escala se aplica al dibujar: Freddy 0.4, `CodeBug` 0.3 (crías 0.18), `Error404` 0.3, `BossBug` 0.6,
  `BossSpider` 0.55, `BossGlitch` 0.45, `Boss404` 0.7.
- Élites: `SpriteSheet.addTint(nombre, nombre + '_elite', color)` crea copias tintadas al cargar
  (para `bug_*` y `e404_*`).

## Encontrar coordenadas de un frame nuevo

No las adivines: las ramas que las inventaron recortaban frames equivocados. Detecta las cajas con componentes
conexas sobre la máscara "no verde", por bandas (filas) para que no se peguen las etiquetas:

```python
# python3 boxes.py assets/enemies.jpg  → imprime (x, y, w, h, píxeles) por banda
import sys
from PIL import Image
S, D = 2, 2  # submuestreo y dilatación
im = Image.open(sys.argv[1]).convert('RGB')
sm = im.resize((im.width // S, im.height // S), Image.BOX); px = sm.load(); w, h = sm.size
fg = lambda x, y: not (px[x, y][1] > 100 and px[x, y][1] > px[x, y][0] * 1.3 and px[x, y][1] > px[x, y][2] * 1.3)
for y0, y1 in [(40, 330), (395, 705), (780, 1062), (1140, 1425)]:  # bandas sin las etiquetas
    mask = {(x, y) for y in range(y0 // S, y1 // S) for x in range(w) if fg(x, y)}
    grown = {(x + dx, y + dy) for x, y in mask for dx in range(-D, D + 1) for dy in range(-D, D + 1)}
    seen, out = set(), []
    for p in grown:
        if p in seen: continue
        stack, xs, ys = [p], [], []; seen.add(p)
        while stack:
            cx, cy = stack.pop()
            if (cx, cy) in mask: xs.append(cx); ys.append(cy)
            for q in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if q in grown and q not in seen: seen.add(q); stack.append(q)
        if len(xs) > 150:
            out.append((min(xs) * S, min(ys) * S, (max(xs) - min(xs) + 1) * S, (max(ys) - min(ys) + 1) * S, len(xs)))
    print(sorted(out))
```

Luego **comprueba visualmente** recortando las cajas a una hoja de contacto antes de darlas por buenas.
Si una caja junta dos frames (cables del espagueti, montículos de barro), pártela a mano.

## Frames disponibles sin usar

- Freddy: perfil lateral quieto `[554, 56, 92, 272]`, asustado `[2600, 792, 156, 260]`.
- Freddy: el segundo frame de muerte `[2482, 1316, 286, 98]` lleva una marca de agua en la esquina: evitarlo.
- Error 404: herido `[2574, 792, 174, 258]`.
