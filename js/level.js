class Level {
    constructor(data) {
        this.name = data.name;
        this.background = data.background;
        this.platforms = data.platforms;
        this.enemies = data.enemies;
        this.collectibles = data.collectibles;
        this.hazards = data.hazards || [];
        this.boss = data.boss || null;
        this.spawnX = data.spawnX || 100;
        this.spawnY = data.spawnY || 300;
        this.exitX = data.exitX;
        this.exitY = data.exitY;
        this.exitWidth = data.exitWidth || 60;
        this.exitHeight = data.exitHeight || 80;
        this.platforms.forEach(p => { p.baseX = p.x; p.vx = 0; });
    }

    // Plataformas móviles: { moveX: amplitud en px, speed: rad/frame }.
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
    }

    // Hitbox de los montículos: solo la parte baja, para no castigar el roce.
    hazardBounds(h) {
        return { x: h.x + 10, y: h.y + 12, width: h.width - 20, height: 18 };
    }

    draw(ctx, backgrounds, sheet, exitOpen) {
        const bg = backgrounds[this.background];
        if (bg) {
            // Algunos fondos traen ~28 px de margen blanco a la izquierda
            ctx.drawImage(bg, 30, 0, bg.width - 30, bg.height, 0, 0, 960, 720);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, 720);
            gradient.addColorStop(0, '#87ceeb');
            gradient.addColorStop(1, '#98fb98');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 960, 720);
        }

        this.platforms.forEach(p => {
            ctx.fillStyle = p.moveX ? '#607d8b' : (p.color || '#8b4513');
            ctx.beginPath();
            ctx.roundRect(p.x, p.y, p.width, p.height, 4);
            ctx.fill();

            ctx.fillStyle = p.moveX ? '#90a4ae' : '#a0522d';
            ctx.fillRect(p.x, p.y, p.width, 4);

            if (p.grass) {
                ctx.fillStyle = '#228b22';
                ctx.fillRect(p.x, p.y - 6, p.width, 8);
            }
        });

        this.hazards.forEach(h => {
            sheet.draw(ctx, 'mound', 0, h.x + h.width / 2, h.y + 30, h.width / 318);
        });

        ctx.fillStyle = exitOpen ? '#4caf50' : '#555';
        ctx.beginPath();
        ctx.roundRect(this.exitX, this.exitY, this.exitWidth, this.exitHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${exitOpen ? 14 : 10}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(exitOpen ? 'EXIT' : 'LOCKED', this.exitX + this.exitWidth / 2, this.exitY + this.exitHeight / 2 + 5);
    }
}

// y de enemigos: se dejan caer hasta la plataforma; los Error 404 flotan a esa altura.
const levels = [
    new Level({
        name: 'Nivel 1: El Baño',
        background: 'bg_01',
        spawnX: 80,
        spawnY: 500,
        exitX: 880,
        exitY: 200,
        platforms: [
            { x: 0, y: 650, width: 960, height: 70, color: '#5d4037', grass: true },
            { x: 200, y: 550, width: 150, height: 20 },
            { x: 450, y: 480, width: 150, height: 20 },
            { x: 700, y: 400, width: 150, height: 20 },
            { x: 850, y: 280, width: 110, height: 20 },
            { x: 100, y: 400, width: 120, height: 20 },
        ],
        hazards: [
            { x: 600, y: 620, width: 80 },
        ],
        enemies: [
            { x: 380, y: 570, type: 'CodeBug' },
            { x: 500, y: 400, type: 'CodeBug' },
        ],
        collectibles: [
            { x: 250, y: 510, type: 'coin' },
            { x: 500, y: 440, type: 'coin' },
            { x: 750, y: 360, type: 'star' },
            { x: 150, y: 360, type: 'paper' },
            { x: 880, y: 240, type: 'coin' },
        ]
    }),

    new Level({
        name: 'Nivel 2: La Escalada',
        background: 'bg_02',
        spawnX: 80,
        spawnY: 550,
        exitX: 850,
        exitY: 150,
        platforms: [
            { x: 0, y: 650, width: 300, height: 70, color: '#4a3728', grass: true },
            { x: 150, y: 520, width: 100, height: 20 },
            { x: 350, y: 580, width: 120, height: 20 },
            { x: 550, y: 500, width: 100, height: 20 },
            { x: 400, y: 400, width: 150, height: 20 },
            { x: 200, y: 320, width: 120, height: 20 },
            { x: 600, y: 350, width: 130, height: 20 },
            { x: 750, y: 250, width: 100, height: 20 },
            { x: 820, y: 230, width: 140, height: 20 },
        ],
        enemies: [
            { x: 380, y: 500, type: 'CodeBug' },
            { x: 450, y: 320, type: 'CodeBug', health: 3 },
            { x: 650, y: 280, type: 'Error404' },
        ],
        collectibles: [
            { x: 180, y: 480, type: 'coin' },
            { x: 400, y: 540, type: 'coin' },
            { x: 580, y: 460, type: 'star' },
            { x: 250, y: 280, type: 'paper' },
            { x: 650, y: 310, type: 'coin' },
            { x: 800, y: 210, type: 'star' },
        ]
    }),

    new Level({
        name: 'Nivel 3: Página No Encontrada',
        background: 'bg_03',
        spawnX: 80,
        spawnY: 550,
        exitX: 900,
        exitY: 100,
        boss: { type: 'Boss404', x: 430, y: 40 },
        platforms: [
            { x: 0, y: 650, width: 250, height: 70, color: '#3d2b1f', grass: true },
            { x: 300, y: 600, width: 100, height: 20 },
            { x: 500, y: 550, width: 120, height: 20 },
            { x: 700, y: 500, width: 100, height: 20 },
            { x: 450, y: 420, width: 150, height: 20 },
            { x: 200, y: 450, width: 120, height: 20 },
            { x: 100, y: 320, width: 130, height: 20 },
            { x: 350, y: 280, width: 100, height: 20 },
            { x: 600, y: 250, width: 120, height: 20 },
            { x: 850, y: 180, width: 110, height: 20 },
        ],
        enemies: [
            { x: 330, y: 520, type: 'CodeBug' },
            { x: 530, y: 470, type: 'Error404' },
            { x: 480, y: 340, type: 'CodeBug', health: 3 },
            { x: 650, y: 170, type: 'Error404' },
        ],
        collectibles: [
            { x: 340, y: 560, type: 'coin' },
            { x: 550, y: 510, type: 'paper' },
            { x: 740, y: 460, type: 'star' },
            { x: 250, y: 410, type: 'coin' },
            { x: 150, y: 280, type: 'paper' },
            { x: 400, y: 240, type: 'star' },
            { x: 650, y: 210, type: 'coin' },
            { x: 890, y: 140, type: 'heart' },
        ]
    }),

    new Level({
        name: 'Nivel 4: El Desagüe',
        background: 'bg_04',
        spawnX: 80,
        spawnY: 600,
        exitX: 880,
        exitY: 80,
        platforms: [
            { x: 0, y: 680, width: 180, height: 40, color: '#2c1810', grass: true },
            { x: 220, y: 620, width: 80, height: 20 },
            { x: 380, y: 560, width: 90, height: 20 },
            { x: 560, y: 620, width: 90, height: 20, moveX: 60, speed: 0.02 },
            { x: 700, y: 550, width: 100, height: 20 },
            { x: 500, y: 450, width: 140, height: 20 },
            { x: 300, y: 480, width: 100, height: 20 },
            { x: 150, y: 400, width: 110, height: 20 },
            { x: 350, y: 320, width: 100, height: 20 },
            { x: 560, y: 280, width: 90, height: 20, moveX: 70, speed: 0.018 },
            { x: 750, y: 200, width: 100, height: 20 },
            { x: 850, y: 160, width: 110, height: 20 },
        ],
        hazards: [
            { x: 540, y: 420, width: 60 },
        ],
        enemies: [
            { x: 250, y: 560, type: 'Error404', health: 3 },
            { x: 410, y: 480, type: 'CodeBug', health: 3 },
            { x: 730, y: 470, type: 'CodeBug', health: 3 },
            { x: 330, y: 400, type: 'CodeBug', health: 3 },
            { x: 180, y: 330, type: 'Error404', health: 3 },
            { x: 780, y: 120, type: 'Error404', health: 3 },
        ],
        collectibles: [
            { x: 250, y: 580, type: 'coin' },
            { x: 420, y: 520, type: 'paper' },
            { x: 740, y: 510, type: 'star' },
            { x: 600, y: 410, type: 'coin' },
            { x: 340, y: 440, type: 'coin' },
            { x: 200, y: 360, type: 'star' },
            { x: 400, y: 280, type: 'paper' },
            { x: 600, y: 240, type: 'coin' },
            { x: 800, y: 160, type: 'heart' },
        ]
    }),

    new Level({
        name: 'Nivel 5: Código Espagueti',
        background: 'bg_05',
        spawnX: 80,
        spawnY: 560,
        exitX: 890,
        exitY: 50,
        boss: { type: 'BossSpider', x: 420, y: 565 },
        platforms: [
            { x: 0, y: 680, width: 960, height: 40, color: '#1a0f0a', grass: true },
            { x: 120, y: 570, width: 110, height: 20 },
            { x: 730, y: 570, width: 110, height: 20 },
            { x: 400, y: 480, width: 160, height: 20, moveX: 120, speed: 0.015 },
            { x: 200, y: 380, width: 100, height: 20 },
            { x: 660, y: 380, width: 100, height: 20 },
            { x: 100, y: 280, width: 90, height: 20 },
            { x: 330, y: 230, width: 90, height: 20 },
            { x: 540, y: 280, width: 90, height: 20 },
            { x: 720, y: 200, width: 100, height: 20 },
            { x: 870, y: 130, width: 90, height: 20 },
        ],
        hazards: [
            { x: 300, y: 650, width: 70 },
            { x: 590, y: 650, width: 70 },
        ],
        enemies: [
            { x: 450, y: 600, type: 'CodeBug', health: 4 },
            { x: 230, y: 330, type: 'Error404', health: 4 },
            { x: 690, y: 320, type: 'Error404', health: 4 },
            { x: 750, y: 490, type: 'CodeBug', health: 4 },
        ],
        collectibles: [
            { x: 160, y: 530, type: 'paper' },
            { x: 770, y: 530, type: 'paper' },
            { x: 470, y: 440, type: 'star' },
            { x: 230, y: 340, type: 'coin' },
            { x: 690, y: 340, type: 'coin' },
            { x: 130, y: 240, type: 'star' },
            { x: 360, y: 190, type: 'coin' },
            { x: 570, y: 240, type: 'star' },
            { x: 750, y: 160, type: 'heart' },
            { x: 900, y: 90, type: 'star' },
        ]
    }),
];
