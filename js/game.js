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
        this.menuParticles = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashAlpha = 0;

        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlaySubtitle = document.getElementById('overlay-subtitle');
        this.overlayText = document.getElementById('overlay-text');
        this.overlayStars = document.getElementById('overlay-stars');
        this.overlayScore = document.getElementById('overlay-score');
        this.overlayDivider = document.getElementById('overlay-divider');
        this.controlsInfo = document.getElementById('controls-info');
    }

    async init() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 960, 720);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading Assets...', 480, 360);

        try {
            await this.loadBackgrounds();
            this.spriteParser = new SpriteParser();
            await this.spriteParser.load();
            this.enemySpriteParser = new EnemySpriteParser();
            await this.enemySpriteParser.load();

            document.getElementById('overlay').style.display = 'flex';
        } catch (e) {
            console.error('Failed to load assets', e);
            this.ctx.fillText('Error loading assets!', 480, 400);
        }
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

    initMenuParticles() {
        for (let i = 0; i < 30; i++) {
            this.menuParticles.push({
                x: Math.random() * 960,
                y: Math.random() * 720,
                size: Math.random() * 4 + 2,
                speedY: Math.random() * 0.5 + 0.2,
                speedX: (Math.random() - 0.5) * 0.3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                alpha: Math.random() * 0.3 + 0.1,
                type: Math.random() > 0.5 ? 'paper' : 'star'
            });
        }
    }

    showMenu() {
        this.state = 'menu';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.className = '';
        this.overlayTitle.textContent = 'FREDDY GAME';
        this.overlaySubtitle.style.display = 'block';
        this.overlaySubtitle.textContent = 'A Platform Adventure';
        this.overlayText.textContent = 'Press ENTER to start';
        this.overlayStars.innerHTML = '';
        this.overlayScore.innerHTML = '';
        this.overlayDivider.style.display = 'block';
        this.controlsInfo.style.display = 'grid';
    }

    showLevelComplete() {
        this.state = 'levelComplete';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.className = 'level-complete-title';
        this.overlayTitle.textContent = 'LEVEL COMPLETE!';
        this.overlaySubtitle.style.display = 'none';
        this.overlayText.textContent = 'Press ENTER for next level';

        const stars = this.collectedCount >= this.totalCollectibles ? 3 :
                      this.collectedCount >= this.totalCollectibles * 0.6 ? 2 : 1;
        this.overlayStars.innerHTML = Array(3).fill(0).map((_, i) =>
            `<span class="${i < stars ? 'star-filled' : 'star-empty'}">★</span>`
        ).join('');

        this.overlayScore.textContent = `Score: ${this.player.score}`;
        this.overlayDivider.style.display = 'block';
        this.controlsInfo.style.display = 'none';
    }

    showGameOver() {
        this.state = 'gameOver';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.className = 'game-over-title';
        this.overlayTitle.textContent = 'GAME OVER';
        this.overlaySubtitle.style.display = 'none';
        this.overlayText.textContent = 'Press ENTER to retry';
        this.overlayStars.innerHTML = '';
        this.overlayScore.textContent = `Final Score: ${this.player.score}`;
        this.overlayDivider.style.display = 'block';
        this.controlsInfo.style.display = 'none';
    }

    showVictory() {
        this.state = 'victory';
        this.overlay.classList.remove('hidden');
        this.overlayTitle.className = 'victory-title';
        this.overlayTitle.textContent = 'YOU WIN!';
        this.overlaySubtitle.style.display = 'none';
        this.overlayText.textContent = 'Press ENTER to play again';
        this.overlayStars.innerHTML = '<span class="star-filled">★★★★★</span>';
        this.overlayScore.textContent = `Final Score: ${this.player.score}`;
        this.overlayDivider.style.display = 'block';
        this.controlsInfo.style.display = 'none';

        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * 960,
                y: -20,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                life: 120,
                color: ['#ffd700', '#ff6b35', '#4caf50', '#2196f3', '#e91e63'][Math.floor(Math.random() * 5)],
                size: Math.random() * 6 + 3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.1,
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.05;
                    this.rotation += this.rotSpeed;
                    this.life--;
                },
                draw(ctx) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    ctx.globalAlpha = Math.min(1, this.life / 30);
                    ctx.fillStyle = this.color;
                    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                    ctx.restore();
                }
            });
        }
    }

    triggerScreenShake(intensity) {
        this.screenShake.intensity = intensity;
    }

    triggerFlash() {
        this.flashAlpha = 0.3;
    }

    startLevel(levelIndex) {
        if (levelIndex >= levels.length) {
            this.showVictory();
            return;
        }

        this.currentLevel = levelIndex;
        this.level = levels[levelIndex];
        this.player = new Player(this.level.spawnX, this.level.spawnY);

                this.enemies = this.level.enemies.map(e => {
            if (e.type === 'CodeBug') return new CodeBug(e.x, e.y, e);
            if (e.type === 'Error404') return new Error404(e.x, e.y, e);
            if (e.type === 'SpaghettiCode') return new SpaghettiCode(e.x, e.y, e);
            return new CodeBug(e.x, e.y, e); // Fallback
        });

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

        if (this.state === 'menu') {
            this.updateMenuParticles();
            this.input.clear();
            return;
        }

        if (this.state !== 'playing') {
            this.particles.forEach(p => p.update());
            this.particles = this.particles.filter(p => p.life > 0);
            this.input.clear();
            return;
        }

        this.player.update(this.input, this.level.platforms);
        this.enemies.forEach(e => e.update(this.player, this.level.platforms, this.enemySpriteParser));
        this.collectibles.forEach(c => c.update());

        const prevEnemyCount = this.enemies.filter(e => e.active).length;

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
                        this.triggerScreenShake(4);
                    }
                }
            });
        });

        const meleeBounds = this.player.getMeleeBounds();
        if (meleeBounds) {
            this.enemies.forEach(enemy => {
                if (!enemy.active) return;

                if (Collision.aabb(meleeBounds, enemy.getBounds())) {
                    const killed = enemy.takeDamage(1);
                    if (killed) {
                        this.player.score += 100;
                        this.spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#c0392b');
                        this.triggerScreenShake(5);
                    }
                }
            });
        }

        this.enemies.forEach(enemy => {
            if (!enemy.active) return;

            if (Collision.aabb(this.player.getBounds(), enemy.getBounds())) {
                this.player.takeDamage(enemy.damage);
                this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#e74c3c');
                this.triggerScreenShake(8);
                this.triggerFlash();

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

        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.intensity *= 0.85;
            if (this.screenShake.intensity < 0.5) {
                this.screenShake.intensity = 0;
                this.screenShake.x = 0;
                this.screenShake.y = 0;
            }
        }

        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.02;
        }

        this.updateHUD();
        this.input.clear();
    }

    updateMenuParticles() {
        this.menuParticles.forEach(p => {
            p.y -= p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotSpeed;

            if (p.y < -20) {
                p.y = 740;
                p.x = Math.random() * 960;
            }
            if (p.x < -20) p.x = 980;
            if (p.x > 980) p.x = -20;
        });
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 2,
                life: 40,
                color,
                size: Math.random() * 5 + 2,
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.25;
                    this.life--;
                },
                draw(ctx) {
                    ctx.globalAlpha = this.life / 40;
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

        const livesText = '❤️'.repeat(Math.max(0, this.player.lives));
        document.getElementById('lives').textContent = livesText;
        document.getElementById('score').textContent = `Score: ${this.player.score}`;
        document.getElementById('level').textContent = `LEVEL ${this.currentLevel + 1}`;
        document.getElementById('collectibles').textContent = `★ ${this.collectedCount}/${this.totalCollectibles}`;
    }

    draw() {
        this.ctx.save();
        this.ctx.translate(this.screenShake.x, this.screenShake.y);
        this.ctx.clearRect(-10, -10, 980, 740);

        if (this.state === 'menu') {
            this.drawMenuBackground();
        } else if (this.state === 'playing' || this.state === 'levelComplete') {
            this.level.draw(this.ctx, this.backgrounds);
            this.collectibles.forEach(c => c.draw(this.ctx));
            this.enemies.forEach(e => e.draw(this.ctx, this.enemySpriteParser));
            this.player.draw(this.ctx, this.spriteParser);
            this.particles.forEach(p => p.draw(this.ctx));

            if (this.flashAlpha > 0) {
                this.ctx.globalAlpha = this.flashAlpha;
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(-10, -10, 980, 740);
                this.ctx.globalAlpha = 1;
            }
        } else if (this.state === 'gameOver' || this.state === 'victory') {
            this.level.draw(this.ctx, this.backgrounds);
            this.particles.forEach(p => p.draw(this.ctx));
        }

        this.ctx.restore();
    }

    drawMenuBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 720);
        gradient.addColorStop(0, '#0f0c29');
        gradient.addColorStop(0.5, '#1a1a3e');
        gradient.addColorStop(1, '#24243e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, 960, 720);

        const time = Date.now() / 1000;

        for (let i = 0; i < 8; i++) {
            const x = 480 + Math.cos(time * 0.3 + i * 0.8) * (200 + i * 30);
            const y = 360 + Math.sin(time * 0.2 + i * 0.6) * (150 + i * 20);
            const radius = 80 + i * 25;

            this.ctx.fillStyle = `rgba(255, 107, 53, ${0.03 + Math.sin(time + i) * 0.02})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.menuParticles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.globalAlpha = p.alpha;

            if (p.type === 'paper') {
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#ddd';
                this.ctx.lineWidth = 0.5;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.font = `${p.size * 3}px sans-serif`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('★', 0, 0);
            }

            this.ctx.restore();
        });

        // Draw Freddy walking at bottom
        if (this.spriteParser) {
            const freddyX = (time * 40) % 1100 - 70;
            const freddyY = 580;
            const walkFrame = Math.floor(time * 3) % 4;
            const sprite = this.spriteParser.getSprite('walk', walkFrame);

            if (sprite) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.6;
                this.ctx.drawImage(sprite, freddyX, freddyY, 50, 135);
                this.ctx.restore();
            }
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}
