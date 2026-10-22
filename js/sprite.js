// Frames en píxeles de la hoja original: [x, y, w, h] o [x, y, w, h, anchorX].
// anchorX = centro del cuerpo dentro del recorte cuando un arma sobresale (por defecto, w / 2).
// Todos los personajes de las hojas miran a la derecha.
const FREDDY_FRAMES = {
    idle: [[126, 52, 100, 274], [342, 56, 92, 270]],
    walk: [
        [856, 48, 110, 278], [1046, 48, 132, 274], [1260, 48, 118, 274], [1462, 48, 124, 274],
        [1926, 48, 90, 278], [2124, 48, 124, 276], [2352, 48, 132, 278], [2586, 48, 134, 274],
    ],
    run: [
        [94, 426, 174, 262], [322, 428, 174, 262], [576, 426, 122, 264],
        [760, 428, 158, 262], [980, 428, 168, 254], [1202, 424, 164, 262],
    ],
    jump: [[1886, 382, 182, 214]],
    fall: [[2098, 424, 180, 272]],
    crouch: [[2346, 486, 136, 206]],
    melee: [[1380, 794, 204, 260, 52], [1032, 794, 240, 258, 58], [130, 794, 246, 258, 52]],
    throw: [[1796, 794, 116, 260, 42], [2034, 802, 128, 252, 50], [2298, 802, 138, 252, 44]],
    hurt: [[162, 1162, 138, 254], [420, 1150, 206, 266]],
    knock: [[1598, 1166, 244, 246]],
    downed: [[820, 1140, 342, 272], [1206, 1130, 342, 284]],
    land: [[1594, 464, 106, 228]],
    death: [[2106, 1312, 288, 98]],
    mound: [[1754, 592, 318, 106]],
};

const ENEMY_FRAMES = {
    bug_walk: [[78, 58, 190, 268], [296, 58, 190, 268], [516, 58, 182, 268]],
    bug_run: [
        [80, 434, 222, 250], [332, 436, 190, 252], [556, 432, 166, 260],
        [768, 434, 170, 254], [980, 428, 188, 262], [1208, 432, 178, 256],
    ],
    bug_attack: [[818, 54, 168, 274], [1022, 52, 170, 264], [1234, 52, 168, 274], [1442, 58, 188, 264]],
    e404_idle: [[1858, 54, 180, 256], [2110, 60, 174, 252], [2344, 54, 184, 258], [2582, 60, 180, 252]],
    e404_throw: [[1850, 412, 176, 258], [2136, 428, 160, 252]],
    e404_steal: [[1760, 802, 184, 254], [2020, 802, 184, 254], [2282, 804, 184, 254]],
    e404_death: [[2356, 458, 166, 226], [2560, 440, 240, 260]],
    spider_walk: [[88, 806, 306, 252]],
    spider_spit: [[428, 806, 284, 252, 110], [994, 806, 262, 252, 105], [1326, 806, 260, 252, 105]],
    spider_hurt: [[82, 1166, 262, 252], [392, 1168, 260, 236]],
    spaghetti: [[830, 1206, 338, 202], [1188, 1158, 385, 252], [1585, 1158, 333, 252]],
    spider_death: [[2086, 1240, 336, 170], [2472, 1252, 338, 166]],
};

// Objetos de assets/elements.jpg (1376x768, mitad de resolución que las demás hojas).
// El verde del veneno va dentro de la botella: el flood-fill desde el borde no lo toca.
const ITEM_FRAMES = {
    fire: [
        [23, 257, 63, 93], [109, 253, 64, 96], [195, 256, 63, 94], [282, 262, 60, 88], [365, 264, 55, 86],
        [474, 252, 67, 98], [563, 253, 77, 97], [660, 257, 56, 93], [736, 255, 63, 95], [818, 272, 52, 78],
    ],
    poison: [[954, 12, 48, 83]],
    potion: [[1023, 105, 49, 82]],
    laptop: [[134, 12, 107, 83]],
    emoji: [[942, 223, 64, 66], [1028, 223, 63, 66], [1114, 223, 63, 66], [942, 297, 64, 65], [1028, 297, 63, 65]],
    emojiRed: [[1200, 223, 63, 66], [1286, 223, 63, 66], [1114, 296, 63, 66], [1200, 296, 63, 66], [1286, 297, 63, 65]],
};

// Recorta un frame y quita el fondo verde. Solo se borra el verde conectado con el borde del
// recorte (más los huecos de verde puro), así sobreviven los verdes internos: dígitos 404, babas.
// keepLargest: borra todo lo que no esté unido a la figura principal (trozos de frames vecinos que
// se solapan en hojas apretadas).
// seeThrough: también se borra el verde encerrado (parabrisas, entre ruedas). Solo para hojas sin
// verdes propios: el JPEG ensucia esos huecos y la pasada de verde puro no los coge.
function chromaKeyFrame(img, [x, y, w, h], { keepLargest = false, seeThrough = false } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    const isBackground = i => d[i + 1] > 140 && d[i + 1] - d[i] > 70 && d[i + 1] - d[i + 2] > 70;
    const stack = [];
    for (let px = 0; px < w; px++) stack.push(px, (h - 1) * w + px);
    for (let py = 0; py < h; py++) stack.push(py * w, py * w + w - 1);
    while (stack.length) {
        const p = stack.pop();
        const i = p * 4;
        if (d[i + 3] === 0 || !isBackground(i)) continue;
        d[i + 3] = 0;
        const px = p % w;
        if (px > 0) stack.push(p - 1);
        if (px < w - 1) stack.push(p + 1);
        if (p >= w) stack.push(p - w);
        if (p < w * (h - 1)) stack.push(p + w);
    }

    for (let i = 0; i < d.length; i += 4) {
        if ((d[i + 1] > 240 && d[i] < 15 && d[i + 2] < 15) || (seeThrough && isBackground(i))) d[i + 3] = 0;
    }

    if (keepLargest) keepLargestBlob(d, w, h);

    // Despill: el halo verdoso pegado al fondo se neutraliza.
    for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (d[i + 3] === 0) continue;
        const px = p % w;
        const nearBg = (px > 0 && d[i - 1] === 0) || (px < w - 1 && d[i + 7] === 0) ||
            (p >= w && d[i - w * 4 + 3] === 0) || (p < w * (h - 1) && d[i + w * 4 + 3] === 0);
        if (nearBg) d[i + 1] = Math.min(d[i + 1], Math.max(d[i], d[i + 2]));
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Etiqueta las manchas opacas (4-vecinos) y deja transparentes todas menos la mayor.
function keepLargestBlob(d, w, h) {
    const label = new Int32Array(w * h);
    const sizes = [0];
    const stack = [];
    for (let start = 0; start < w * h; start++) {
        if (label[start] || d[start * 4 + 3] === 0) continue;
        const id = sizes.length;
        let size = 0;
        label[start] = id;
        stack.push(start);
        while (stack.length) {
            const p = stack.pop();
            size++;
            const px = p % w;
            for (const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p - w, p + w]) {
                if (q < 0 || q >= w * h || label[q] || d[q * 4 + 3] === 0) continue;
                label[q] = id;
                stack.push(q);
            }
        }
        sizes.push(size);
    }
    const biggest = sizes.indexOf(Math.max(...sizes));
    for (let p = 0; p < w * h; p++) {
        if (label[p] !== biggest) d[p * 4 + 3] = 0;
    }
}

class SpriteSheet {
    // keyOpts: opciones de chromaKeyFrame ({ keepLargest, seeThrough }).
    constructor(src, frameDefs, keyOpts = {}) {
        this.src = src;
        this.frameDefs = frameDefs;
        this.keyOpts = keyOpts;
        this.frames = {};
    }

    load() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                for (const [name, rects] of Object.entries(this.frameDefs)) {
                    this.frames[name] = rects.map(r => ({ canvas: chromaKeyFrame(img, r, this.keyOpts), anchorX: r[4] ?? r[2] / 2 }));
                }
                resolve();
            };
            img.onerror = reject;
            img.src = this.src;
        });
    }

    // Variante coloreada de una animación (enemigos élite).
    addTint(name, tintedName, color) {
        this.frames[tintedName] = this.frames[name].map(f => {
            const canvas = document.createElement('canvas');
            canvas.width = f.canvas.width;
            canvas.height = f.canvas.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(f.canvas, 0, 0);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return { canvas, anchorX: f.anchorX };
        });
    }

    count(name) {
        return this.frames[name] ? this.frames[name].length : 0;
    }

    // Dibuja el frame con los pies en (x, bottom).
    draw(ctx, name, frame, x, bottom, scale, facing = 1) {
        const list = this.frames[name];
        if (!list) return;
        const f = list[frame % list.length];
        const w = f.canvas.width * scale;
        const h = f.canvas.height * scale;
        ctx.save();
        ctx.translate(x, bottom);
        ctx.scale(facing, 1);
        ctx.drawImage(f.canvas, -f.anchorX * scale, -h, w, h);
        ctx.restore();
    }
}
