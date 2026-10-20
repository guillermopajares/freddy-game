// Escenografía con sensación de profundidad: fondo con parallax, bruma,
// plataformas pseudo-3D, sombras de los personajes y un primer plano desenfocado.
// Todo es procedural; lo estático se precalcula en canvas fuera de pantalla por nivel.

const VIEW_W = 960;
const VIEW_H = 720;
let vanishX = VIEW_W / 2;  // las aristas traseras convergen hacia el centro de la pantalla
const PERSPECTIVE = 0.022;
const TOP_BACK = 7;        // la cara superior sube 7 px sobre p.y y baja 6:
const TOP_FRONT = 6;       // los pies (en p.y) quedan en mitad de la superficie
const BG_SHIFT_X = 18;     // desplazamiento máximo del fondo con el parallax
const BG_SHIFT_Y = 12;
const FG_SHIFT_X = 34;     // el primer plano se mueve más y en sentido contrario

const MATERIALS = {
    wood:      { top: '#d6a066', topDark: '#a87444', front: ['#9a6334', '#5a3618'], side: '#4a2c12', line: '#2e1b0b', detail: '#4a2c12', highlight: '#f1cb98' },
    stone:     { top: '#959a74', topDark: '#6f7452', front: ['#716c53', '#423e2d'], side: '#35321f', line: '#211f15', detail: '#2c2a1d', highlight: '#c0c59a' },
    sandstone: { top: '#e7b47c', topDark: '#b98252', front: ['#a8683d', '#64361a'], side: '#55301a', line: '#3a1f0c', detail: '#5a3118', highlight: '#fbdcb2' },
    metal:     { top: '#b0bcc2', topDark: '#7f8c93', front: ['#6b7880', '#394147'], side: '#2c3338', line: '#161b1f', detail: '#262d32', highlight: '#eef6f9' },
    tile:      { top: '#f7f9fb', topDark: '#cbd6e1', front: ['#a9cbe6', '#5f86ab'], side: '#4f7397', line: '#2c3e52', detail: '#e8f2fa', highlight: '#ffffff' },
};

// Ambientación por fondo. ground: 'soil' usa p.color con hierba; si no, otro material.
const THEMES = {
    bg_01: {
        material: 'wood', ground: 'soil', grass: '#74a12b', haze: '#f6e7a2', hazeY: 470,
        motes: { color: '#fffbe0', count: 42, vx: 0.18, vy: -0.1, size: 2.2 },
        foreground: 'grass', fgColor: '#28320f',
    },
    bg_02: {
        material: 'stone', moss: '#8cc63f', ground: 'soil', grass: '#6c9a2c', haze: '#f2b3a6', hazeY: 430,
        motes: { color: '#c3f55a', count: 34, vx: 0, vy: -0.32, size: 2.6 },
        foreground: 'grass', fgColor: '#1d260d',
    },
    bg_03: {
        material: 'sandstone', ground: 'soil', grass: '#a19445', haze: '#f9d3a4', hazeY: 520,
        motes: { color: '#f6e2c0', count: 46, vx: 0.4, vy: 0.04, size: 1.8 },
        foreground: 'rocks', fgColor: '#3a2213',
    },
    bg_04: {
        material: 'metal', ground: 'metal', haze: '#3b7d88', hazeY: 560,
        motes: { color: '#d4f2ff', count: 38, vx: 0.05, vy: -0.28, size: 2.2 },
        foreground: 'pipes', fgColor: '#11171b',
    },
    bg_05: {
        material: 'tile', ground: 'tile', haze: '#f7b68c', hazeY: 500,
        motes: { color: '#fff3c2', count: 40, vx: 0.06, vy: -0.08, size: 2.4, twinkle: true },
        foreground: 'none', fgColor: '#000',
    },
};

const DEFAULT_THEME = THEMES.bg_01;

// PRNG determinista para que las texturas no parpadeen entre frames.
function seededRandom(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}

// amount > 0 aclara hacia blanco, < 0 oscurece hacia negro.
function shade(hex, amount) {
    const target = amount > 0 ? 255 : 0;
    const k = Math.abs(amount);
    const [r, g, b] = hexToRgb(hex).map(c => Math.round(c + (target - c) * k));
    return `rgb(${r},${g},${b})`;
}

function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// --- Geometría de las plataformas -------------------------------------------

function platformShape(p) {
    const x0 = p.x;
    const x1 = p.x + p.width;
    const yb = p.y - TOP_BACK;
    const yf = p.y + TOP_FRONT;
    const bottom = p.y + p.height + 4;
    return {
        x0, x1, yb, yf, bottom,
        fh: bottom - yf,
        bx0: x0 + (vanishX - x0) * PERSPECTIVE,
        bx1: x1 + (vanishX - x1) * PERSPECTIVE,
    };
}

// Contorno exterior: cara superior + frontal + la cara lateral que mira al centro.
function traceSilhouette(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.bottom);
    if (s.bx0 < s.x0) {
        ctx.lineTo(s.bx0, s.yb + s.fh);
        ctx.lineTo(s.bx0, s.yb);
    } else {
        ctx.lineTo(s.x0, s.yf);
        ctx.lineTo(s.bx0, s.yb);
    }
    ctx.lineTo(s.bx1, s.yb);
    if (s.bx1 > s.x1) {
        ctx.lineTo(s.bx1, s.yb + s.fh);
    } else {
        ctx.lineTo(s.x1, s.yf);
    }
    ctx.lineTo(s.x1, s.bottom);
    ctx.closePath();
}

function traceTop(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(s.x0, s.yf);
    ctx.lineTo(s.bx0, s.yb);
    ctx.lineTo(s.bx1, s.yb);
    ctx.lineTo(s.x1, s.yf);
    ctx.closePath();
}

// Líneas que van de la arista frontal a la trasera (dan la fuga de perspectiva).
function drawTopRulings(ctx, s, spacing, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = s.x0 + spacing; x < s.x1 - 2; x += spacing) {
        const t = (x - s.x0) / (s.x1 - s.x0);
        ctx.moveTo(x, s.yf);
        ctx.lineTo(s.bx0 + (s.bx1 - s.bx0) * t, s.yb);
    }
    ctx.stroke();
}

function platformMaterial(p, theme) {
    if (p.moveX) return MATERIALS.metal;
    if (!p.ground) return MATERIALS[theme.material];
    if (theme.ground !== 'soil') return MATERIALS[theme.ground];
    const base = p.color || '#5d4037';
    const grass = theme.grass;
    return {
        soil: true,
        top: grass, topDark: shade(grass, -0.3),
        front: [shade(base, 0.12), shade(base, -0.45)],
        side: shade(base, -0.55), line: shade(base, -0.7), detail: shade(base, -0.3),
        highlight: shade(grass, 0.35),
    };
}

// --- Texturas de la cara frontal --------------------------------------------

function textureWood(ctx, s, m, rnd) {
    const seams = [];
    let x = s.x0;
    while (true) {
        x += 38 + rnd() * 34;
        if (x > s.x1 - 14) break;
        seams.push(x);
    }
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = m.detail;
    ctx.lineWidth = 1;
    const rows = Math.max(2, Math.round(s.fh / 7));
    for (let j = 1; j < rows; j++) {
        const y = s.yf + (s.fh * j) / rows + (rnd() - 0.5) * 2;
        const phase = rnd() * 6;
        ctx.beginPath();
        ctx.moveTo(s.x0, y);
        for (let gx = s.x0; gx <= s.x1; gx += 8) {
            ctx.lineTo(gx, y + Math.sin(gx * 0.09 + phase) * 1.1);
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = m.line;
    ctx.lineWidth = 1.5;
    seams.forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx, s.yf);
        ctx.lineTo(sx, s.bottom);
        ctx.stroke();
        ctx.fillStyle = m.line;
        [-4, 4].forEach(dx => {
            ctx.beginPath();
            ctx.arc(sx + dx, s.yf + 4, 1.2, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    if (s.x1 - s.x0 > 80 && rnd() < 0.7) {
        const kx = s.x0 + 20 + rnd() * (s.x1 - s.x0 - 40);
        ctx.strokeStyle = m.detail;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(kx, s.yf + s.fh * 0.55, 4, 2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function textureBlocks(ctx, s, m, rnd, rowHeight) {
    const rows = Math.max(1, Math.round(s.fh / rowHeight));
    const rh = s.fh / rows;
    for (let r = 0; r < rows; r++) {
        const y0 = s.yf + r * rh;
        let x = s.x0 - rnd() * 14;
        while (x < s.x1) {
            const w = 18 + rnd() * 20;
            ctx.fillStyle = rgba(m.highlight, 0.12 + rnd() * 0.12);
            ctx.fillRect(x + 2, y0 + 2, w - 4, 2);
            ctx.strokeStyle = m.detail;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + w, y0 + 1);
            ctx.lineTo(x + w + (rnd() - 0.5) * 2, y0 + rh - 1);
            ctx.stroke();
            x += w;
        }
        if (r > 0) {
            ctx.beginPath();
            ctx.moveTo(s.x0, y0);
            ctx.lineTo(s.x1, y0);
            ctx.stroke();
        }
    }
}

function textureStrata(ctx, s, m, rnd) {
    ctx.strokeStyle = rgba(m.detail, 0.55);
    ctx.lineWidth = 1;
    const layers = Math.max(2, Math.round(s.fh / 6));
    for (let j = 1; j < layers; j++) {
        const y = s.yf + (s.fh * j) / layers;
        const phase = rnd() * 6;
        ctx.beginPath();
        ctx.moveTo(s.x0, y);
        for (let x = s.x0; x <= s.x1; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.05 + phase) * 1.6);
        ctx.stroke();
    }
    ctx.strokeStyle = m.line;
    for (let i = 0; i < (s.x1 - s.x0) / 60; i++) {
        let x = s.x0 + rnd() * (s.x1 - s.x0);
        let y = s.yf;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (y < s.yf + s.fh * 0.7) {
            x += (rnd() - 0.5) * 6;
            y += 3 + rnd() * 3;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

function textureMetal(ctx, s, m, rnd) {
    ctx.strokeStyle = m.line;
    ctx.lineWidth = 1.2;
    for (let x = s.x0 + 46; x < s.x1 - 10; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, s.yf);
        ctx.lineTo(x, s.bottom);
        ctx.stroke();
    }
    const rivetRows = s.fh > 30 ? [s.yf + 4, s.bottom - 5] : [s.yf + s.fh / 2];
    rivetRows.forEach(y => {
        for (let x = s.x0 + 8; x < s.x1 - 4; x += 16) {
            ctx.fillStyle = m.line;
            ctx.beginPath();
            ctx.arc(x, y, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(m.highlight, 0.7);
            ctx.fillRect(x - 1, y - 1.5, 1, 1);
        }
    });
    // Brillo diagonal
    const sx = s.x0 + rnd() * (s.x1 - s.x0) * 0.6;
    const g = ctx.createLinearGradient(sx, s.yf, sx + 30, s.bottom);
    g.addColorStop(0, rgba(m.highlight, 0));
    g.addColorStop(0.5, rgba(m.highlight, 0.22));
    g.addColorStop(1, rgba(m.highlight, 0));
    ctx.fillStyle = g;
    ctx.fillRect(s.x0, s.yf, s.x1 - s.x0, s.fh);
}

function textureTile(ctx, s, m) {
    const size = 14;
    ctx.strokeStyle = m.detail;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = s.x0 + size; x < s.x1; x += size) {
        ctx.moveTo(x, s.yf);
        ctx.lineTo(x, s.bottom);
    }
    for (let y = s.yf + size; y < s.bottom; y += size) {
        ctx.moveTo(s.x0, y);
        ctx.lineTo(s.x1, y);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(m.highlight, 0.6);
    for (let y = s.yf; y < s.bottom; y += size) ctx.fillRect(s.x0, y + 1, s.x1 - s.x0, 1);
}

function textureSoil(ctx, s, m, rnd) {
    const count = Math.round(((s.x1 - s.x0) * s.fh) / 260);
    for (let i = 0; i < count; i++) {
        const x = s.x0 + rnd() * (s.x1 - s.x0);
        const y = s.yf + 6 + rnd() * (s.fh - 8);
        const r = 1.5 + rnd() * 3.5;
        ctx.fillStyle = rnd() < 0.5 ? rgba(m.highlight, 0.18) : 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < (s.x1 - s.x0) / 70; i++) {
        let x = s.x0 + rnd() * (s.x1 - s.x0);
        let y = s.yf + 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
            x += (rnd() - 0.5) * 10;
            y += 4 + rnd() * 6;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

function drawGrassFringe(ctx, s, color, rnd) {
    const dark = shade(color, -0.35);
    const light = shade(color, 0.25);
    // Borde de hierba que cuelga sobre la cara frontal
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(s.x0, s.yf - 1);
    for (let x = s.x0; x <= s.x1; x += 6) {
        ctx.lineTo(x + 3, s.yf + 3 + rnd() * 5);
        ctx.lineTo(x + 6, s.yf + 1);
    }
    ctx.lineTo(s.x1, s.yf - 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Briznas que asoman por delante y por detrás
    for (let x = s.x0 + 2; x < s.x1 - 2; x += 4 + rnd() * 5) {
        const h = 4 + rnd() * 8;
        const back = rnd() < 0.5;
        const t = (x - s.x0) / (s.x1 - s.x0);
        const baseY = back ? s.yb + 2 : s.yf;
        const bx = back ? s.bx0 + (s.bx1 - s.bx0) * t : x;
        const lean = (rnd() - 0.5) * 5;
        ctx.fillStyle = back ? dark : (rnd() < 0.3 ? light : color);
        ctx.beginPath();
        ctx.moveTo(bx - 1.6, baseY);
        ctx.quadraticCurveTo(bx + lean * 0.3, baseY - h * 0.6, bx + lean, baseY - h);
        ctx.quadraticCurveTo(bx + lean * 0.3 + 1, baseY - h * 0.5, bx + 1.6, baseY);
        ctx.closePath();
        ctx.fill();
    }
}

function drawMoss(ctx, s, color, rnd) {
    ctx.fillStyle = color;
    for (let x = s.x0 + 4; x < s.x1 - 4; x += 7 + rnd() * 16) {
        const w = 3 + rnd() * 6;
        const len = 3 + rnd() * 9;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, s.yf - 1);
        ctx.lineTo(x - w / 2, s.yf + len - w / 2);
        ctx.arc(x, s.yf + len - w / 2, w / 2, Math.PI, 0, true);
        ctx.lineTo(x + w / 2, s.yf - 1);
        ctx.fill();
    }
    ctx.fillStyle = rgba(color, 0.7);
    for (let i = 0; i < (s.x1 - s.x0) / 18; i++) {
        const t = rnd();
        const d = rnd();
        const x = s.x0 + (s.x1 - s.x0) * t + (s.bx0 - s.x0) * d;
        const y = s.yf - (s.yf - s.yb) * d;
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + rnd() * 5, 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlatform(ctx, p, theme, shadowPass) {
    const s = platformShape(p);
    const m = platformMaterial(p, theme);

    if (shadowPass) {
        // Sombra proyectada sobre el fondo (abajo a la derecha, difuminada)
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetX = 9;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = m.side;
        traceSilhouette(ctx, s);
        ctx.fill();
        ctx.restore();
        return;
    }

    const rnd = seededRandom((p.baseX * 73856093) ^ (p.y * 19349663) ^ (p.width * 83492791));

    // Cara lateral (la que mira al centro de la pantalla)
    ctx.fillStyle = m.side;
    traceSilhouette(ctx, s);
    ctx.fill();

    // Cara frontal
    const front = ctx.createLinearGradient(0, s.yf, 0, s.bottom);
    front.addColorStop(0, m.front[0]);
    front.addColorStop(1, m.front[1]);
    ctx.fillStyle = front;
    ctx.fillRect(s.x0, s.yf, s.x1 - s.x0, s.fh);

    ctx.save();
    ctx.beginPath();
    ctx.rect(s.x0, s.yf, s.x1 - s.x0, s.fh);
    ctx.clip();
    if (m.soil) textureSoil(ctx, s, m, rnd);
    else if (m === MATERIALS.wood) textureWood(ctx, s, m, rnd);
    else if (m === MATERIALS.stone) textureBlocks(ctx, s, m, rnd, 12);
    else if (m === MATERIALS.sandstone) textureStrata(ctx, s, m, rnd);
    else if (m === MATERIALS.metal) textureMetal(ctx, s, m, rnd);
    else if (m === MATERIALS.tile) textureTile(ctx, s, m);
    // Oclusión ambiental bajo el borde de la cara superior
    const ao = ctx.createLinearGradient(0, s.yf, 0, s.yf + 7);
    ao.addColorStop(0, 'rgba(0,0,0,0.35)');
    ao.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ao;
    ctx.fillRect(s.x0, s.yf, s.x1 - s.x0, 7);
    ctx.restore();

    // Cara superior: más oscura al fondo, más clara en la arista delantera
    const top = ctx.createLinearGradient(0, s.yb, 0, s.yf);
    top.addColorStop(0, m.topDark);
    top.addColorStop(1, m.top);
    ctx.fillStyle = top;
    traceTop(ctx, s);
    ctx.fill();
    if (m === MATERIALS.tile) drawTopRulings(ctx, s, 14, m.detail);
    else if (m === MATERIALS.metal) drawTopRulings(ctx, s, 8, rgba(m.line, 0.45));
    else if (m === MATERIALS.wood) {
        ctx.strokeStyle = rgba(m.detail, 0.45);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo((s.x0 + s.bx0) / 2, (s.yf + s.yb) / 2);
        ctx.lineTo((s.x1 + s.bx1) / 2, (s.yf + s.yb) / 2);
        ctx.stroke();
    }

    // Brillo de la arista delantera
    ctx.strokeStyle = rgba(m.highlight, 0.85);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x0 + 1, s.yf - 0.5);
    ctx.lineTo(s.x1 - 1, s.yf - 0.5);
    ctx.stroke();

    // Contorno grueso, a juego con el trazo de los fondos
    ctx.strokeStyle = m.line;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    traceSilhouette(ctx, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x0, s.yf);
    ctx.lineTo(s.x1, s.yf);
    if (s.bx1 > s.x1) { ctx.moveTo(s.x1, s.yf); ctx.lineTo(s.bx1, s.yb); }
    if (s.bx0 < s.x0) { ctx.moveTo(s.x0, s.yf); ctx.lineTo(s.bx0, s.yb); }
    ctx.stroke();

    if (m.soil) drawGrassFringe(ctx, s, theme.grass, rnd);
    else if (theme.moss && !p.moveX) drawMoss(ctx, s, theme.moss, rnd);
}

// --- Capas precalculadas ----------------------------------------------------

function buildHazeLayer(theme) {
    const w = 1200;
    const c = makeCanvas(w, VIEW_H);
    const ctx = c.getContext('2d');
    const rnd = seededRandom(hexToRgb(theme.haze).reduce((a, b) => a * 31 + b, 7));
    for (let i = 0; i < 9; i++) {
        const x = rnd() * w;
        const y = theme.hazeY + (rnd() - 0.5) * 160;
        const rx = 160 + rnd() * 220;
        const ry = 30 + rnd() * 40;
        // Se pinta también desplazado ±w para que la capa sea cíclica
        [-w, 0, w].forEach(off => {
            ctx.save();
            ctx.translate(x + off, y);
            ctx.scale(rx / ry, 1);
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
            g.addColorStop(0, rgba(theme.haze, 0.55));
            g.addColorStop(1, rgba(theme.haze, 0));
            ctx.fillStyle = g;
            ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
            ctx.restore();
        });
    }
    return c;
}

// Perspectiva atmosférica: aclara el fondo para separarlo del plano de juego.
function buildVeil(theme) {
    const c = makeCanvas(VIEW_W, VIEW_H);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, rgba(theme.haze, 0.34));
    g.addColorStop(0.55, rgba(theme.haze, 0.18));
    g.addColorStop(0.8, rgba(theme.haze, 0.26));
    g.addColorStop(1, rgba(theme.haze, 0.1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return c;
}

function buildVignette() {
    const c = makeCanvas(VIEW_W, VIEW_H);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(480, 380, 260, 480, 380, 720);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    return c;
}

function drawForegroundShapes(ctx, theme, rnd, w) {
    ctx.fillStyle = theme.fgColor;
    const corners = [[-20, 150], [w - 150, w + 20]];

    if (theme.foreground === 'grass') {
        corners.forEach(([a, b]) => {
            for (let i = 0; i < 34; i++) {
                const x = a + rnd() * (b - a);
                const edge = Math.min(x - a, b - x) / ((b - a) / 2);
                const h = (22 + rnd() * 36) * (0.55 + 0.45 * (1 - edge));
                const lean = (rnd() - 0.5) * 30;
                const bw = 3 + rnd() * 4;
                ctx.beginPath();
                ctx.moveTo(x - bw, VIEW_H + 2);
                ctx.quadraticCurveTo(x + lean * 0.2, VIEW_H - h * 0.6, x + lean, VIEW_H - h);
                ctx.quadraticCurveTo(x + lean * 0.2 + bw * 0.5, VIEW_H - h * 0.5, x + bw, VIEW_H + 2);
                ctx.fill();
            }
        });
    } else if (theme.foreground === 'rocks') {
        corners.forEach(([a, b]) => {
            for (let i = 0; i < 3; i++) {
                const x = a + rnd() * (b - a);
                ctx.beginPath();
                ctx.ellipse(x, VIEW_H + 12, 40 + rnd() * 40, 28 + rnd() * 22, (rnd() - 0.5) * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    } else if (theme.foreground === 'pipes') {
        ctx.fillRect(-20, VIEW_H - 34, 200, 30);
        ctx.fillRect(150, VIEW_H - 40, 16, 42);
        ctx.fillRect(w - 110, VIEW_H - 78, 32, 90);
        ctx.fillRect(w - 116, VIEW_H - 66, 44, 12);
        ctx.beginPath();
        ctx.arc(w - 94, VIEW_H - 78, 16, Math.PI, 0);
        ctx.fill();
    }
}

function buildForeground(theme) {
    if (theme.foreground === 'none') return null;
    const w = VIEW_W + FG_SHIFT_X * 2;
    const rnd = seededRandom(hexToRgb(theme.fgColor).reduce((a, b) => a * 37 + b, 11));
    const shapes = makeCanvas(w, VIEW_H);
    drawForegroundShapes(shapes.getContext('2d'), theme, rnd, w);

    // Desenfoque de "cerca de cámara" (si el navegador soporta ctx.filter)
    const c = makeCanvas(w, VIEW_H);
    const ctx = c.getContext('2d');
    if ('filter' in ctx) ctx.filter = 'blur(2.5px)';
    ctx.drawImage(shapes, 0, 0);
    return c;
}

function buildMoteSprite(color) {
    const c = makeCanvas(32, 32);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, rgba(color, 1));
    g.addColorStop(0.35, rgba(color, 0.6));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return c;
}

// --- Puerta de salida: rota y llena de caca ---------------------------------

const POOP = { light: '#8a5526', dark: '#4f2c0e', line: '#2b1606' };
const DOOR_WOOD = { light: '#9a6a3a', dark: '#5e3a1a', line: '#2a1708' };

// Pila clásica de tres roscas con pegote en la punta.
function drawPoopPile(ctx, cx, by, size) {
    const tiers = [[0.5, 0.17], [0.37, 0.15], [0.24, 0.13]];
    let cy = by;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = POOP.line;
    tiers.forEach(([rk, hk], i) => {
        const rx = size * rk;
        const ry = size * hk;
        cy -= i === 0 ? ry : ry * 1.25;
        const g = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
        g.addColorStop(0, POOP.light);
        g.addColorStop(1, POOP.dark);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx + (i % 2 ? 1.5 : -1), cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,210,0.35)';
        ctx.beginPath();
        ctx.ellipse(cx - rx * 0.4, cy - ry * 0.35, rx * 0.25, ry * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();
    });
    const tipY = cy - size * 0.13;
    ctx.fillStyle = POOP.light;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.12, cy - 1);
    ctx.quadraticCurveTo(cx - size * 0.05, tipY - size * 0.12, cx + size * 0.12, tipY - size * 0.08);
    ctx.quadraticCurveTo(cx + size * 0.02, tipY, cx + size * 0.12, cy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// Salpicadura irregular con churretes que caen.
function drawSplat(ctx, x, y, r, rnd) {
    ctx.fillStyle = POOP.dark;
    ctx.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = r * (0.65 + rnd() * 0.55);
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr * 0.85;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.fill();
    const drips = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < drips; i++) {
        const dx = x + (rnd() - 0.5) * r * 1.2;
        const len = r * (0.8 + rnd() * 1.6);
        const w = 1.5 + rnd() * 2;
        ctx.fillRect(dx - w / 2, y, w, len);
        ctx.beginPath();
        ctx.arc(dx, y + len, w * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = rgba(POOP.light, 0.8);
    ctx.beginPath();
    ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
        const a = rnd() * Math.PI * 2;
        const d = r * (1.3 + rnd() * 0.7);
        ctx.fillStyle = POOP.dark;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + rnd() * 1.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Hoja de la puerta en coordenadas locales (0,0)-(w,h): tablones, grietas y una esquina arrancada.
function drawDoorPanel(ctx, w, h, rnd) {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, DOOR_WOOD.light);
    g.addColorStop(1, DOOR_WOOD.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    // Esquina superior derecha rota a mordiscos
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.55, 0);
    ctx.lineTo(w * 0.62, h * 0.07);
    ctx.lineTo(w * 0.74, h * 0.03);
    ctx.lineTo(w * 0.8, h * 0.14);
    ctx.lineTo(w * 0.92, h * 0.12);
    ctx.lineTo(w, h * 0.22);
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.3, h);
    ctx.lineTo(w * 0.24, h * 0.92);
    ctx.lineTo(w * 0.12, h * 0.95);
    ctx.lineTo(0, h * 0.88);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.strokeStyle = DOOR_WOOD.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 1; i < 3; i++) {
        ctx.moveTo((w * i) / 3, 0);
        ctx.lineTo((w * i) / 3, h);
    }
    ctx.stroke();
    // Travesaños
    ctx.fillStyle = shade(DOOR_WOOD.dark, -0.15);
    ctx.fillRect(0, h * 0.22, w, 5);
    ctx.fillRect(0, h * 0.72, w, 5);
    // Grietas
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        let x = rnd() * w;
        let y = rnd() * h * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
            x += (rnd() - 0.5) * 8;
            y += 4 + rnd() * 5;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    for (let i = 0; i < 7; i++) drawSplat(ctx, rnd() * w, h * 0.08 + rnd() * h * 0.65, 3.5 + rnd() * 4.5, rnd);
    // Pegote que sube desde la base, con dedos que trepan por la madera
    ctx.fillStyle = POOP.dark;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 5) ctx.lineTo(x, h * 0.84 - rnd() * h * 0.08 - (rnd() < 0.2 ? h * 0.12 : 0));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(POOP.light, 0.7);
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(rnd() * w, h * 0.9 + rnd() * h * 0.06, 2 + rnd() * 3, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = DOOR_WOOD.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Pomo
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(w * 0.82, h * 0.55, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

function drawFlies(ctx, cx, cy, t) {
    for (let i = 0; i < 3; i++) {
        const a = t * (2.2 + i * 0.7) + i * 2.1;
        const x = cx + Math.sin(a) * (12 + i * 4) + Math.sin(a * 3.1) * 3;
        const y = cy + Math.cos(a * 1.3) * (7 + i * 2);
        const flap = Math.sin(t * 60 + i) > 0 ? 2.2 : 1.2;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(x - 1.5, y - 1.5, flap, 1, -0.6, 0, Math.PI * 2);
        ctx.ellipse(x + 1.5, y - 1.5, flap, 1, 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawExitDoor(ctx, x, y, w, h, open, t) {
    const rnd = seededRandom(x * 7919 + y * 104729);
    const frame = 6;
    const lintel = 14;

    // Marco con sombra proyectada
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 7;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = shade(DOOR_WOOD.dark, -0.2);
    ctx.fillRect(x - frame, y - lintel, w + frame * 2, h + lintel);
    ctx.restore();

    // Hueco: oscuro si está cerrada, luz verdosa al otro lado si está abierta
    if (open) {
        const pulse = 0.85 + Math.sin(t * 3) * 0.15;
        const g = ctx.createRadialGradient(x + w / 2, y + h * 0.6, 4, x + w / 2, y + h * 0.6, h * 0.8);
        g.addColorStop(0, '#fffbd0');
        g.addColorStop(0.4, `rgba(150,255,110,${pulse})`);
        g.addColorStop(1, '#173a12');
        ctx.fillStyle = g;
    } else {
        ctx.fillStyle = '#140a04';
    }
    ctx.fillRect(x, y, w, h);

    // Marco con vetas y el cartel en el dintel
    ctx.strokeStyle = DOOR_WOOD.line;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - frame, y - lintel, w + frame * 2, h + lintel);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = open ? '#b6ff8a' : '#e0b98a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SALIDA', x + w / 2, y - lintel / 2);
    ctx.textBaseline = 'alphabetic';
    drawSplat(ctx, x - frame + 4, y - lintel + 4, 3, rnd);
    drawSplat(ctx, x + w + 2, y + h * 0.3, 2.5, rnd);

    if (open) {
        // Haz de luz que sale al suelo
        ctx.fillStyle = `rgba(190,255,140,${0.18 + Math.sin(t * 3) * 0.05})`;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w + 26, y + h + 8);
        ctx.lineTo(x - 26, y + h + 8);
        ctx.closePath();
        ctx.fill();

        // La hoja cuelga de una sola bisagra, abierta hacia fuera y torcida
        ctx.save();
        ctx.translate(x, y + 2);
        ctx.rotate(0.12 + Math.sin(t * 1.7) * 0.025);
        ctx.scale(-0.42, 1);
        drawDoorPanel(ctx, w, h - 2, rnd);
        ctx.restore();
    } else {
        ctx.save();
        ctx.translate(x, y);
        drawDoorPanel(ctx, w, h, rnd);
        ctx.restore();

        // Tablones en aspa y candado
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        [0.9, -0.9].forEach(a => {
            ctx.save();
            ctx.rotate(a);
            ctx.fillStyle = '#b98a55';
            ctx.fillRect(-h * 0.55, -5, h * 1.1, 10);
            ctx.strokeStyle = DOOR_WOOD.line;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-h * 0.55, -5, h * 1.1, 10);
            ctx.fillStyle = '#333';
            [-h * 0.45, h * 0.45].forEach(nx => {
                ctx.beginPath();
                ctx.arc(nx, 0, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        });
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 2, 6, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(-8, 2, 16, 13);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8, 2, 16, 13);
        ctx.fillStyle = '#333';
        ctx.fillRect(-1, 6, 2, 5);
        ctx.restore();
    }

    // Charco y pila delante de la puerta, con sus moscas
    ctx.fillStyle = rgba(POOP.dark, 0.85);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.6, y + h + 1, w * 0.55, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawPoopPile(ctx, x + w * 0.7, y + h + 2, 34);
    drawFlies(ctx, x + w * 0.7, y + h - 30, t);
}

class Scenery {
    constructor(backgrounds) {
        this.backgrounds = backgrounds;
        this.vignette = null;
        this.level = null;
        this.px = 0;
        this.py = 0;
        this.time = 0;
        this.motes = [];
    }

    setLevel(level) {
        this.level = level;
        this.theme = THEMES[level.background] || DEFAULT_THEME;
        this.haze = buildHazeLayer(this.theme);
        this.veil = buildVeil(this.theme);
        this.foreground = buildForeground(this.theme);
        this.moteSprite = buildMoteSprite(this.theme.motes.color);
        if (!this.vignette) this.vignette = buildVignette();
        this.px = 0;
        this.py = 0;
        this.initMotes();
    }

    initMotes() {
        const cfg = this.theme.motes;
        this.motes = [];
        for (let i = 0; i < cfg.count; i++) {
            // z < 1: detrás del plano de juego; z > 1: delante, grandes y desenfocadas
            const z = 0.35 + Math.random() * 1.15;
            this.motes.push({
                x: Math.random() * VIEW_W,
                y: Math.random() * VIEW_H,
                z,
                phase: Math.random() * Math.PI * 2,
                speed: 0.6 + Math.random() * 0.8,
            });
        }
        this.motes.sort((a, b) => a.z - b.z);
    }

    // camX: el parallax depende de la posición de Freddy en pantalla, no en el mundo.
    update(player, camX = 0) {
        this.time++;
        if (player && !player.dead) {
            const tx = clamp((player.x - camX + player.width / 2 - VIEW_W / 2) / (VIEW_W / 2), -1, 1);
            const ty = clamp((player.y + player.height / 2 - VIEW_H / 2) / (VIEW_H / 2), -1, 1);
            this.px += (tx - this.px) * 0.04;
            this.py += (ty - this.py) * 0.04;
        }

        const cfg = this.theme.motes;
        this.motes.forEach(m => {
            m.phase += 0.02 * m.speed;
            m.x += (cfg.vx + Math.sin(m.phase) * 0.15) * m.z * m.speed;
            m.y += (cfg.vy + Math.cos(m.phase * 0.7) * 0.08) * m.z * m.speed;
            if (m.x < -30) m.x += VIEW_W + 60;
            if (m.x > VIEW_W + 30) m.x -= VIEW_W + 60;
            if (m.y < -30) m.y += VIEW_H + 60;
            if (m.y > VIEW_H + 30) m.y -= VIEW_H + 60;
        });
    }

    drawBackground(ctx) {
        const bg = this.backgrounds[this.level.background];
        const bx = this.px * BG_SHIFT_X;
        const by = this.py * BG_SHIFT_Y;
        if (bg) {
            // Algo más grande que la pantalla para que el parallax no deje huecos.
            // Algunos fondos traen ~28 px de margen blanco a la izquierda.
            ctx.drawImage(bg, 30, 0, bg.width - 30, bg.height, -34 + bx, -24 + by, 1028, 768);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
            gradient.addColorStop(0, '#87ceeb');
            gradient.addColorStop(1, '#98fb98');
            ctx.fillStyle = gradient;
            ctx.fillRect(-10, -10, VIEW_W + 20, VIEW_H + 20);
        }

        // Desaturar un poco el fondo: lo lejano pierde color
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = 'rgba(128,128,128,0.3)';
        ctx.fillRect(-10, -10, VIEW_W + 20, VIEW_H + 20);
        ctx.restore();

        // Bancos de bruma a media distancia, entre el fondo y el plano de juego
        const hw = this.haze.width;
        const hx = -((this.time * 0.15) % hw) + bx * 0.5 - 40;
        ctx.globalAlpha = 0.8;
        ctx.drawImage(this.haze, hx, by * 0.5);
        ctx.drawImage(this.haze, hx + hw, by * 0.5);
        ctx.globalAlpha = 1;

        ctx.drawImage(this.veil, 0, 0);
        this.drawMotes(ctx, m => m.z < 1);
    }

    // Con scroll el punto de fuga sigue a la cámara, así que se pintan todas cada frame.
    // ponytail: sin caché por plataforma; precalcular si el FPS cae en niveles largos.
    drawPlatforms(ctx, platforms, camX = 0) {
        vanishX = camX + VIEW_W / 2;
        const visible = platforms.filter(p => p.x + p.width > camX - 40 && p.x < camX + VIEW_W + 40);
        visible.forEach(p => drawPlatform(ctx, p, this.theme, true));
        visible.forEach(p => drawPlatform(ctx, p, this.theme, false));
    }

    drawExit(ctx, x, y, w, h, open) {
        drawExitDoor(ctx, x, y, w, h, open, this.time / 60);
    }

    // Sombra elíptica sobre la plataforma de debajo; mengua al alejarse del suelo.
    drawShadows(ctx, entities, platforms) {
        entities.forEach(e => {
            const cx = e.x + e.width / 2;
            const bottom = e.y + e.height;
            let support = null;
            platforms.forEach(p => {
                if (cx < p.x || cx > p.x + p.width || p.y < bottom - 4) return;
                if (!support || p.y < support.y) support = p;
            });
            if (!support) return;
            const dist = support.y - bottom;
            if (dist > 320) return;
            const t = 1 - dist / 320;
            const rx = e.width * 0.6 * (0.45 + 0.55 * t);
            const ry = 4.5 * (0.6 + 0.4 * t);

            ctx.save();
            ctx.beginPath();
            ctx.rect(support.x, support.y - TOP_BACK - 2, support.width, TOP_BACK + TOP_FRONT + 4);
            ctx.clip();
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
            g.addColorStop(0, `rgba(0,0,0,${0.45 * t + 0.08})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.translate(cx, support.y + 0.5);
            ctx.scale(rx, ry);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    drawMotes(ctx, filter) {
        const cfg = this.theme.motes;
        this.motes.forEach(m => {
            if (!filter(m)) return;
            // Lo lejano acompaña al fondo; lo cercano se mueve al revés
            const ox = -(m.z - 1) * 40 * this.px;
            const oy = -(m.z - 1) * 24 * this.py;
            const size = cfg.size * m.z * (m.z > 1 ? 4.5 : 3);
            let alpha = m.z > 1 ? 0.35 : 0.25 + 0.5 * m.z;
            if (cfg.twinkle) alpha *= 0.5 + 0.5 * Math.sin(this.time * 0.08 * m.speed + m.phase * 3);
            ctx.globalAlpha = clamp(alpha, 0, 1);
            ctx.drawImage(this.moteSprite, m.x + ox - size / 2, m.y + oy - size / 2, size, size);
        });
        ctx.globalAlpha = 1;
    }

    drawForeground(ctx) {
        this.drawMotes(ctx, m => m.z >= 1);
        if (this.foreground) {
            ctx.globalAlpha = 0.92;
            ctx.drawImage(this.foreground, -FG_SHIFT_X - this.px * FG_SHIFT_X, -this.py * 10 + 6);
            ctx.globalAlpha = 1;
        }
        ctx.drawImage(this.vignette, 0, 0);
    }
}

if (typeof module !== 'undefined') module.exports = { Scenery, THEMES, MATERIALS, platformShape, seededRandom };
