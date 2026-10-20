class Level {
    constructor(data) {
        this.name = data.name;
        this.background = data.background;
        this.platforms = data.platforms;
        this.enemies = data.enemies;
        this.collectibles = data.collectibles;
        this.spawnX = data.spawnX || 100;
        this.spawnY = data.spawnY || 300;
        this.exitX = data.exitX;
        this.exitY = data.exitY;
        this.exitWidth = data.exitWidth || 60;
        this.exitHeight = data.exitHeight || 80;
    }

    draw(ctx, backgrounds) {
        if (this.background && backgrounds[this.background]) {
            ctx.drawImage(backgrounds[this.background], 0, 0, 960, 720);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, 720);
            gradient.addColorStop(0, '#87ceeb');
            gradient.addColorStop(1, '#98fb98');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 960, 720);
        }

        this.platforms.forEach(p => {
            ctx.fillStyle = p.color || '#8b4513';
            ctx.beginPath();
            ctx.roundRect(p.x, p.y, p.width, p.height, 4);
            ctx.fill();

            ctx.fillStyle = '#a0522d';
            ctx.fillRect(p.x, p.y, p.width, 4);

            if (p.grass) {
                ctx.fillStyle = '#228b22';
                ctx.fillRect(p.x, p.y - 6, p.width, 8);
            }
        });

        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.roundRect(this.exitX, this.exitY, this.exitWidth, this.exitHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', this.exitX + this.exitWidth / 2, this.exitY + this.exitHeight / 2 + 5);
    }
}

const levels = [
    new Level({
        name: 'Level 1: The Beginning',
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
        enemies: [
            { x: 300, y: 600, type: 'SpaghettiCode', health: 2 },
            { x: 500, y: 430, type: 'CodeBug', health: 2, patrolStart: 450, patrolEnd: 580, patrolSpeed: 1 },
        ],
        collectibles: [
            { x: 250, y: 510, type: 'coin' },
            { x: 500, y: 440, type: 'coin' },
            { x: 750, y: 360, type: 'star' },
            { x: 150, y: 360, type: 'coin' },
            { x: 880, y: 240, type: 'coin' },
        ]
    }),

    new Level({
        name: 'Level 2: The Climb',
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
            { x: 380, y: 530, type: 'CodeBug', health: 2, patrolStart: 350, patrolEnd: 450, patrolSpeed: 1.2 },
            { x: 450, y: 350, type: 'SpaghettiCode', health: 3 },
            { x: 650, y: 300, type: 'Error404', health: 2, chaseSpeed: 0.8, chaseRange: 200 },
        ],
        collectibles: [
            { x: 180, y: 480, type: 'coin' },
            { x: 400, y: 540, type: 'coin' },
            { x: 580, y: 460, type: 'star' },
            { x: 250, y: 280, type: 'coin' },
            { x: 650, y: 310, type: 'coin' },
            { x: 800, y: 210, type: 'star' },
        ]
    }),

    new Level({
        name: 'Level 3: Danger Zone',
        background: 'bg_03',
        spawnX: 80,
        spawnY: 550,
        exitX: 900,
        exitY: 100,
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
            { x: 330, y: 550, type: 'CodeBug', health: 2, patrolStart: 300, patrolEnd: 380, patrolSpeed: 1.2 },
            { x: 530, y: 500, type: 'Error404', health: 2, chaseSpeed: 1, chaseRange: 180 },
            { x: 730, y: 450, type: 'SpaghettiCode', health: 3 },
            { x: 480, y: 370, type: 'CodeBug', health: 3, patrolStart: 450, patrolEnd: 580, patrolSpeed: 1.5 },
            { x: 650, y: 200, type: 'Error404', health: 2, chaseSpeed: 1.2, chaseRange: 220 },
        ],
        collectibles: [
            { x: 340, y: 560, type: 'coin' },
            { x: 550, y: 510, type: 'coin' },
            { x: 740, y: 460, type: 'star' },
            { x: 250, y: 410, type: 'coin' },
            { x: 150, y: 280, type: 'coin' },
            { x: 400, y: 240, type: 'star' },
            { x: 650, y: 210, type: 'coin' },
            { x: 890, y: 140, type: 'heart' },
        ]
    }),

    new Level({
        name: 'Level 4: The Gauntlet',
        background: 'bg_04',
        spawnX: 80,
        spawnY: 600,
        exitX: 880,
        exitY: 80,
        platforms: [
            { x: 0, y: 680, width: 180, height: 40, color: '#2c1810', grass: true },
            { x: 220, y: 620, width: 80, height: 20 },
            { x: 380, y: 560, width: 90, height: 20 },
            { x: 550, y: 620, width: 80, height: 20 },
            { x: 700, y: 550, width: 100, height: 20 },
            { x: 500, y: 450, width: 120, height: 20 },
            { x: 300, y: 480, width: 100, height: 20 },
            { x: 150, y: 400, width: 110, height: 20 },
            { x: 350, y: 320, width: 100, height: 20 },
            { x: 550, y: 280, width: 90, height: 20 },
            { x: 750, y: 200, width: 100, height: 20 },
            { x: 850, y: 160, width: 110, height: 20 },
        ],
        enemies: [
            { x: 250, y: 570, type: 'Error404', health: 3, chaseSpeed: 1, chaseRange: 150 },
            { x: 410, y: 510, type: 'CodeBug', health: 3, patrolStart: 380, patrolEnd: 450, patrolSpeed: 1.8 },
            { x: 730, y: 500, type: 'SpaghettiCode', health: 4 },
            { x: 540, y: 400, type: 'Error404', health: 3, chaseSpeed: 1.2, chaseRange: 200 },
            { x: 330, y: 430, type: 'CodeBug', health: 3, patrolStart: 300, patrolEnd: 380, patrolSpeed: 1.5 },
            { x: 180, y: 350, type: 'Error404', health: 3, chaseSpeed: 1.2, chaseRange: 180 },
            { x: 580, y: 230, type: 'CodeBug', health: 4, patrolStart: 550, patrolEnd: 620, patrolSpeed: 1.8 },
        ],
        collectibles: [
            { x: 250, y: 580, type: 'coin' },
            { x: 420, y: 520, type: 'coin' },
            { x: 740, y: 510, type: 'star' },
            { x: 550, y: 410, type: 'coin' },
            { x: 340, y: 440, type: 'coin' },
            { x: 200, y: 360, type: 'star' },
            { x: 400, y: 280, type: 'coin' },
            { x: 600, y: 240, type: 'coin' },
            { x: 800, y: 160, type: 'heart' },
        ]
    }),

    new Level({
        name: 'Level 5: Final Battle',
        background: 'bg_05',
        spawnX: 80,
        spawnY: 600,
        exitX: 900,
        exitY: 50,
        platforms: [
            { x: 0, y: 680, width: 150, height: 40, color: '#1a0f0a', grass: true },
            { x: 200, y: 620, width: 70, height: 20 },
            { x: 350, y: 560, width: 80, height: 20 },
            { x: 500, y: 620, width: 70, height: 20 },
            { x: 650, y: 550, width: 90, height: 20 },
            { x: 800, y: 480, width: 80, height: 20 },
            { x: 600, y: 400, width: 100, height: 20 },
            { x: 400, y: 450, width: 90, height: 20 },
            { x: 200, y: 380, width: 100, height: 20 },
            { x: 100, y: 280, width: 90, height: 20 },
            { x: 300, y: 220, width: 80, height: 20 },
            { x: 500, y: 280, width: 90, height: 20 },
            { x: 700, y: 200, width: 100, height: 20 },
            { x: 870, y: 130, width: 90, height: 20 },
        ],
        enemies: [
            { x: 230, y: 570, type: 'Error404', health: 4, chaseSpeed: 1.2, chaseRange: 180 },
            { x: 380, y: 510, type: 'CodeBug', health: 4, patrolStart: 350, patrolEnd: 410, patrolSpeed: 1.8 },
            { x: 530, y: 570, type: 'Error404', health: 4, chaseSpeed: 1.4, chaseRange: 200 },
            { x: 680, y: 500, type: 'SpaghettiCode', health: 5 },
            { x: 830, y: 430, type: 'Error404', health: 4, chaseSpeed: 1.2, chaseRange: 160 },
            { x: 640, y: 350, type: 'CodeBug', health: 5, patrolStart: 600, patrolEnd: 680, patrolSpeed: 2 },
            { x: 430, y: 400, type: 'Error404', health: 4, chaseSpeed: 1.5, chaseRange: 220 },
            { x: 240, y: 330, type: 'CodeBug', health: 4, patrolStart: 200, patrolEnd: 280, patrolSpeed: 1.8 },
            { x: 540, y: 230, type: 'Error404', health: 5, chaseSpeed: 1.5, chaseRange: 250 },
            { x: 740, y: 150, type: 'SpaghettiCode', health: 5 },
        ],
        collectibles: [
            { x: 230, y: 580, type: 'coin' },
            { x: 380, y: 520, type: 'coin' },
            { x: 530, y: 580, type: 'star' },
            { x: 690, y: 510, type: 'coin' },
            { x: 840, y: 440, type: 'coin' },
            { x: 640, y: 360, type: 'star' },
            { x: 440, y: 410, type: 'coin' },
            { x: 240, y: 340, type: 'coin' },
            { x: 140, y: 240, type: 'star' },
            { x: 340, y: 180, type: 'coin' },
            { x: 540, y: 240, type: 'star' },
            { x: 750, y: 160, type: 'heart' },
            { x: 910, y: 90, type: 'star' },
        ]
    }),
];
