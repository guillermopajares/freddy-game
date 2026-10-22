const GROUND_Y = 650;

// Formato compacto de nivel (coordenadas de mundo; la pantalla mide 960x720):
//   ground:       [x, ancho]                      suelo a GROUND_Y
//   platforms:    [x, y, ancho, moveX?, speed?]   moveX/speed = plataforma móvil (amplitud px, rad/frame)
//   hazards:      [x, yDeLaSuperficie, ancho]     montículos de caca
//   checkpoints:  [x, yDeLaSuperficie]
//   enemies:      [tipo, x, y, { health, elite }]
//   collectibles: [tipo, x, y]
//   boss:         { type, x, y, arenaX, rivalChance? }  la arena va de arenaX a arenaX + 960;
//                 rivalChance = probabilidad de que lo sustituya un rival (BossRival)
class Level {
    constructor(data) {
        this.name = data.name;
        this.background = data.background;
        this.width = data.width;
        [this.spawnX, this.spawnY] = data.spawn;
        [this.exitX, this.exitY] = data.exit;
        this.exitWidth = 60;
        this.exitHeight = 80;
        this.platforms = [
            ...data.ground.map(([x, w]) => ({ x, y: GROUND_Y, width: w, height: 70, ground: true })),
            ...data.platforms.map(([x, y, w, moveX, speed]) => ({ x, y, width: w, height: 20, moveX, speed })),
        ];
        this.platforms.forEach(p => { p.baseX = p.x; p.vx = 0; });
        this.hazards = (data.hazards || []).map(([x, top, width]) => ({ x, y: top - 30, width }));
        this.checkpoints = (data.checkpoints || []).map(([x, top]) => ({ x, y: top, reached: false }));
        this.enemies = data.enemies.map(([type, x, y, opts]) => ({ type, x, y, ...opts }));
        this.collectibles = data.collectibles.map(([type, x, y]) => ({ type, x, y }));
        this.boss = data.boss || null;
        this.flood = data.flood || null;
        this.leftWall = 0;
    }

    update(time) {
        this.platforms.forEach(p => {
            if (!p.moveX) return;
            const x = p.baseX + Math.sin(time * p.speed) * p.moveX;
            p.vx = x - p.x;
            p.x = x;
        });
    }

    reset() {
        this.platforms.forEach(p => { p.x = p.baseX; p.vx = 0; });
        this.checkpoints.forEach(c => { c.reached = false; });
        this.leftWall = 0;
    }

    // Hitbox de los montículos: solo la parte baja, para no castigar el roce.
    hazardBounds(h) {
        return { x: h.x + 10, y: h.y + 12, width: h.width - 20, height: 18 };
    }

    // Capa de mundo: se dibuja con la cámara ya aplicada.
    draw(ctx, scenery, sheet, exitOpen, camX) {
        scenery.drawPlatforms(ctx, this.platforms, camX);

        // Se apoya en el borde delantero de la superficie (los pies van en su mitad) para que no flote.
        this.hazards.forEach(h => {
            sheet.draw(ctx, 'mound', 0, h.x + h.width / 2, h.y + 30 + TOP_FRONT, h.width / 318);
        });

        this.checkpoints.forEach(c => this.drawCheckpoint(ctx, c));
        scenery.drawExit(ctx, this.exitX, this.exitY, this.exitWidth, this.exitHeight, exitOpen);
    }

    // Checkpoint: desatascador clavado con banderín (verde al activarlo).
    drawCheckpoint(ctx, c) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x, c.y - 70);
        ctx.stroke();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y - 4, 14, 7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = c.reached ? '#7CFC00' : '#9e9e9e';
        ctx.beginPath();
        ctx.moveTo(c.x + 2, c.y - 70);
        ctx.lineTo(c.x + 34, c.y - 60);
        ctx.lineTo(c.x + 2, c.y - 50);
        ctx.fill();
    }
}

const levels = [
    new Level({
        name: 'Nivel 1: El Baño',
        background: 'bg_01',
        width: 2880,
        spawn: [80, 530],
        exit: [2800, 570],
        ground: [[0, 700], [820, 380], [1300, 1580]],
        platforms: [
            [200, 550, 150], [450, 480, 150], [930, 540, 140], [1100, 440, 120],
            [1500, 520, 140], [1680, 420, 140],
            // Arena del rival
            [2150, 540, 130], [2400, 450, 160], [2650, 540, 130],
        ],
        hazards: [[600, 650, 80], [1450, 650, 70]],
        checkpoints: [[1000, 650], [1840, 650]],
        enemies: [
            ['CodeBug', 380, 570], ['CodeBug', 480, 400], ['CodeBug', 1050, 570],
            ['Error404', 1150, 330], ['CodeBug', 1600, 570],
        ],
        collectibles: [
            ['coin', 250, 510], ['coin', 500, 440], ['paper', 300, 610], ['shield', 960, 500],
            ['star', 1130, 400], ['coin', 1550, 480], ['star', 1720, 380], ['coin', 1350, 610],
        ],
        // Otro personaje jugable, elegido al azar entre los que no lleva el jugador
        boss: { type: 'BossRival', x: 2600, y: 500, arenaX: 1920 },
    }),

    new Level({
        name: 'Nivel 2: La Escalada',
        background: 'bg_02',
        width: 3360,
        spawn: [80, 530],
        exit: [3280, 570],
        ground: [[0, 400], [1000, 300], [2000, 1360]],
        platforms: [
            [450, 580, 120], [620, 500, 110], [800, 420, 120], [600, 330, 120], [820, 250, 140],
            [1350, 560, 120], [1520, 480, 120, 60, 0.02], [1720, 560, 140],
            [1350, 380, 120], [1560, 300, 120], [1780, 380, 140],
            // Arena del Rey Bug
            [2520, 540, 130], [2760, 450, 160], [3050, 540, 130], [2640, 340, 110], [2920, 340, 110],
        ],
        hazards: [[1150, 650, 70], [2150, 650, 70]],
        checkpoints: [[1050, 650], [2340, 650]],
        enemies: [
            ['CodeBug', 200, 570], ['CodeBug', 830, 340], ['Error404', 700, 200],
            ['CodeBug', 1220, 570, { elite: true }], ['Error404', 1600, 400],
            ['CodeBug', 2100, 570], ['Error404', 2250, 450],
        ],
        collectibles: [
            ['coin', 480, 540], ['coin', 650, 460], ['paper', 650, 290], ['star', 870, 210],
            ['coin', 1380, 520], ['triple', 1590, 260], ['star', 1820, 340], ['coin', 1760, 520],
            ['paper', 2050, 610], ['star', 1390, 340], ['heart', 2670, 300],
        ],
        boss: { type: 'BossBug', x: 3200, y: 480, arenaX: 2400, rivalChance: 0.5 },
    }),

    new Level({
        name: 'Nivel 3: Página No Encontrada',
        background: 'bg_03',
        width: 2880,
        spawn: [80, 530],
        exit: [2800, 570],
        ground: [[0, 500], [650, 350], [1150, 1730]],
        platforms: [
            [540, 580, 80], [250, 520, 120], [420, 400, 120], [750, 520, 120], [900, 420, 120],
            [700, 320, 120], [1250, 540, 120], [1420, 450, 120, 70, 0.02], [1650, 520, 120], [1500, 330, 120],
            // Arena del jefe
            [2050, 540, 140], [2300, 450, 160], [2550, 540, 140], [2150, 340, 120], [2450, 340, 120], [2700, 450, 140],
        ],
        hazards: [[1350, 650, 60]],
        checkpoints: [[1200, 650], [1860, 650]],
        enemies: [
            ['CodeBug', 300, 570], ['Error404', 450, 300], ['CodeBug', 800, 570],
            ['Error404', 950, 300], ['CodeBug', 1300, 570, { elite: true }],
            ['CodeBug', 1660, 440], ['Error404', 1550, 220],
        ],
        collectibles: [
            ['coin', 280, 480], ['paper', 450, 360], ['star', 730, 280], ['coin', 780, 480],
            ['coin', 930, 380], ['gold', 1530, 290], ['coin', 1280, 500], ['paper', 1700, 610],
            ['heart', 1800, 610], ['star', 2180, 300], ['star', 2480, 300],
        ],
        boss: { type: 'Boss404', x: 2350, y: 40, arenaX: 1920 },
    }),

    new Level({
        name: 'Nivel 4: El Desagüe',
        background: 'bg_04',
        width: 3840,
        spawn: [80, 530],
        exit: [3760, 570],
        ground: [[0, 350], [1300, 300], [2500, 1340]],
        // La riada de aguas sucias avanza desde la izquierda y se detiene antes de la arena
        flood: { delay: 180, speed: 1.6 },
        platforms: [
            [420, 600, 100], [580, 540, 110, 80, 0.02], [800, 480, 120], [980, 560, 120, 60, 0.025],
            [1150, 500, 100], [800, 300, 120], [1050, 250, 120],
            [1650, 560, 100, 90, 0.018], [1850, 480, 110], [2020, 400, 120, 70, 0.022],
            [2220, 480, 110], [2380, 560, 90], [1900, 290, 120],
            // Arena del Glitch 404
            [3000, 540, 130], [3250, 450, 150], [3550, 540, 130], [3120, 330, 110], [3420, 330, 110],
        ],
        hazards: [[1420, 650, 70], [1880, 480, 50], [2620, 650, 70]],
        checkpoints: [[1320, 650], [2520, 650], [2830, 650]],
        enemies: [
            ['Error404', 600, 380], ['CodeBug', 830, 400], ['Error404', 1100, 330, { elite: true }],
            ['CodeBug', 1450, 570], ['CodeBug', 1540, 570, { elite: true }], ['Error404', 1750, 350],
            ['CodeBug', 2240, 400], ['Error404', 2450, 420], ['CodeBug', 2700, 570, { elite: true }],
        ],
        collectibles: [
            ['coin', 450, 560], ['paper', 830, 440], ['star', 850, 260], ['coin', 1180, 460],
            ['star', 1080, 210], ['paper', 1500, 610], ['coin', 1860, 440], ['star', 1930, 250],
            ['shield', 2240, 440], ['heart', 2560, 610], ['coin', 2700, 610], ['triple', 1350, 610],
            ['star', 3290, 410],
        ],
        boss: { type: 'BossGlitch', x: 3400, y: 300, arenaX: 2880, rivalChance: 0.5 },
    }),

    new Level({
        name: 'Nivel 5: Código Espagueti',
        background: 'bg_05',
        width: 2880,
        spawn: [80, 530],
        exit: [2810, 570],
        ground: [[0, 450], [600, 400], [1100, 1780]],
        platforms: [
            [470, 580, 100], [700, 500, 120], [880, 420, 120, 60, 0.02], [1200, 520, 120],
            [1400, 440, 120], [1600, 520, 120], [1350, 300, 120], [1700, 340, 120],
            // Arena del jefe
            [2000, 560, 110], [2770, 560, 110], [2280, 470, 160, 120, 0.015], [2120, 370, 100], [2660, 370, 100],
        ],
        hazards: [[300, 650, 70], [1300, 650, 60], [2200, 650, 70], [2590, 650, 70]],
        checkpoints: [[1150, 650], [1860, 650]],
        enemies: [
            ['CodeBug', 200, 570, { elite: true }], ['Error404', 520, 380], ['CodeBug', 750, 420],
            ['Error404', 1000, 320, { elite: true }], ['CodeBug', 1250, 570, { elite: true }],
            ['Error404', 1450, 300], ['CodeBug', 1650, 440], ['Error404', 1750, 220, { elite: true }],
        ],
        collectibles: [
            ['coin', 490, 540], ['paper', 730, 460], ['star', 1380, 260], ['gold', 1230, 480],
            ['coin', 1430, 400], ['star', 1730, 300], ['paper', 1630, 480], ['heart', 1800, 610],
            ['paper', 2030, 520], ['paper', 2800, 520], ['star', 2150, 330], ['shield', 2690, 330],
        ],
        boss: { type: 'BossSpider', x: 2500, y: 565, arenaX: 1920 },
    }),
];

if (typeof module !== 'undefined') module.exports = { levels, Level, GROUND_Y };
