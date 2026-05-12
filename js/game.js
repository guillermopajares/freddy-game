class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 960;
        this.canvas.height = 720;

        this.input = new InputHandler();
        this.spriteParser = new SpriteParser();
        this.backgrounds = {};
        this.state = 'menu';
        this.currentLevel = 0;
        this.player = null;
        this.level = null;
        this.enemies = [];
        this.collectibles = [];
        this.totalCollectibles = 0;
        this.collectedCount = 0;
        this.particles = [];

        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayText = document.getElementById('overlay-text');
        this.controlsInfo = document.getElementById('controls-info');

        this._enterHandler = null;
    }

    async init() {
        await this.spriteParser.load();
        this.loadBackgrounds();
        this.showMenu();
        this.gameLoop();
    }

    loadBackgrounds() {
        const bgNames = ['bg_00', 'bg_01', 'bg_02', 'bg_03', 'bg_04', 'bg_05'];
        bgNames.forEach(name => {
            const img = new Image();
            img.onload = () => {
                this.backgrounds[name] = img;
            };
            img.src = ASSETS[name];
        });
    }

    async loadBackgrounds() {
        const bgNames = ['bg_00', 'bg_01', 'bg_02', 'bg_03', 'bg_04', 'bg_05'];
        const promises = bgNames.map(name => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.backgrounds[name] = img;
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = `assets/${name}.png`;
            });
        });
        await Promise.all(promises);
    }

    showMenu() {
        this.state = 'menu';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.textContent = 'FREDDY GAME';
        this.overlayText.textContent = 'Press ENTER to start';
        this.controlsInfo.style.display = 'block';
    }

    startLevel(levelIndex) {
        if (levelIndex >= levels.length) {
            this.showVictory();
            return;
        }

        this.currentLevel = levelIndex;
        this.level = levels[levelIndex];
        this.player = new Player(this.level.spawnX, this.level.spawnY);

        this.enemies = this.level.enemies.map(e =>
            new Enemy(e.x, e.y, e.type, e)
        );

        this.collectibles = this.level.collectibles.map(c =>
            new Collectible(c.x, c.y, c.type)
        );

        this.totalCollectibles = this.collectibles.length;
        this.collectedCount = 0;
        this.particles = [];

        this.state = 'playing';
        this.overlay.classList.add('hidden');
        this.updateHUD();
    }

    showLevelComplete() {
        this.state = 'levelComplete';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.textContent = 'LEVEL COMPLETE!';
        this.overlayText.textContent = `Score: ${this.player.score} | Press ENTER for next level`;
        this.controlsInfo.style.display = 'none';
    }

    showGameOver() {
        this.state = 'gameOver';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.textContent = 'GAME OVER';
        this.overlayText.textContent = `Final Score: ${this.player.score} | Press ENTER to retry`;
        this.controlsInfo.style.display = 'none';
    }

    showVictory() {
        this.state = 'victory';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.textContent = 'YOU WIN!';
        this.overlayText.textContent = `Final Score: ${this.player.score} | Press ENTER to play again`;
        this.controlsInfo.style.display = 'none';
    }

    handleInput() {
        if (this.input.isPressed('Enter')) {
            if (this.state === 'menu') {
                this.startLevel(0);
            } else if (this.state === 'gameOver') {
                this.showMenu();
            } else if (this.state === 'victory') {
                this.showMenu();
            } else if (this.state === 'levelComplete') {
                this.startLevel(this.currentLevel + 1);
            }
        }

        if (this.input.isPressed('KeyR') && this.state === 'playing') {
            this.startLevel(this.currentLevel);
        }
    }

    update() {
        this.handleInput();

        if (this.state !== 'playing') {
            this.input.clear();
            return;
        }

        this.player.update(this.input, this.level.platforms);
        this.enemies.forEach(e => e.update(this.player, this.level.platforms));
        this.collectibles.forEach(c => c.update());

        this.player.projectiles.forEach(proj => {
            if (!proj.active) return;

            this.enemies.forEach(enemy => {
                if (!enemy.active) return;

                if (Collision.aabb(proj.getBounds(), enemy.getBounds())) {
                    proj.active = false;
                    const killed = enemy.takeDamage(1);
                    if (killed) {
                        this.player.score += 100;
                        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff6b35');
                    }
                }
            });
        });

        this.enemies.forEach(enemy => {
            if (!enemy.active) return;

            if (Collision.aabb(this.player.getBounds(), enemy.getBounds())) {
                this.player.takeDamage(enemy.damage);
                this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#e74c3c');

                if (this.player.lives <= 0) {
                    this.showGameOver();
                }
            }
        });

        this.collectibles.forEach(c => {
            if (c.collected) return;

            if (Collision.aabb(this.player.getBounds(), c.getBounds())) {
                c.collected = true;
                this.collectedCount++;
                this.player.score += c.value;

                if (c.type === 'heart' && this.player.lives < 5) {
                    this.player.lives++;
                }

                this.spawnParticles(c.x + c.width / 2, c.y + c.height / 2, '#ffd700');
            }
        });

        const exitRect = {
            x: this.level.exitX,
            y: this.level.exitY,
            width: this.level.exitWidth,
            height: this.level.exitHeight
        };

        if (Collision.aabb(this.player.getBounds(), exitRect)) {
            this.showLevelComplete();
        }

        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);

        this.updateHUD();
        this.input.clear();
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                color,
                size: Math.random() * 6 + 2,
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.2;
                    this.life--;
                },
                draw(ctx) {
                    ctx.globalAlpha = this.life / 30;
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
        }
    }

    updateHUD() {
        if (!this.player) return;

        const livesText = '\u2764\uFE0F'.repeat(Math.max(0, this.player.lives));
        document.getElementById('lives').textContent = livesText;
        document.getElementById('score').textContent = `Score: ${this.player.score}`;
        document.getElementById('level').textContent = this.level.name;
        document.getElementById('collectibles').textContent = `\uD83D\uDCE6 ${this.collectedCount}/${this.totalCollectibles}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'menu') {
            this.drawMenuBackground();
            this.drawDebugInfo();
            return;
        }

        if (this.state === 'playing' || this.state === 'levelComplete') {
            this.level.draw(this.ctx, this.backgrounds);
            this.collectibles.forEach(c => c.draw(this.ctx));
            this.enemies.forEach(e => e.draw(this.ctx));
            this.player.draw(this.ctx, this.spriteParser);
            this.particles.forEach(p => p.draw(this.ctx));
        }
    }

    drawDebugInfo() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        this.ctx.fillText('State: ' + this.state, 20, 700);
        this.ctx.fillText('Keys: ' + Object.keys(this.input.keys).filter(k => this.input.keys[k]).join(', '), 20, 715);
    }

    drawMenuBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 720);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, 960, 720);

        const time = Date.now() / 1000;
        for (let i = 0; i < 5; i++) {
            this.ctx.fillStyle = `rgba(255, 107, 53, ${0.1 + Math.sin(time + i) * 0.05})`;
            this.ctx.beginPath();
            this.ctx.arc(
                480 + Math.cos(time * 0.5 + i) * 200,
                360 + Math.sin(time * 0.3 + i) * 150,
                100 + i * 30,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}
