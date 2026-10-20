const STEP = 1000 / 60; // la física va a 60 Hz aunque la pantalla refresque a 120 Hz

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 960;
        this.canvas.height = 720;
        this.ctx.imageSmoothingQuality = 'high';

        this.input = new InputHandler();
        this.backgrounds = {};
        this.state = 'loading';
        this.currentLevel = 0;
        this.player = null;
        this.level = null;
        this.enemies = [];
        this.enemyProjectiles = [];
        this.collectibles = [];
        this.totalCollectibles = 0;
        this.collectedCount = 0;
        this.particles = [];
        this.menuParticles = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashAlpha = 0;
        this.banner = null; // { text, timer }
        this.boss = null;
        this.pendingBoss = null;
        this.levelTime = 0;
        this.highScore = this.loadHighScore();

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
        this.ctx.fillText('Cargando...', 480, 360);

        try {
            this.loadBackgrounds();
            this.freddySheet = new SpriteSheet(ASSETS.freddy, FREDDY_FRAMES);
            this.enemySheet = new SpriteSheet(ASSETS.enemies, ENEMY_FRAMES);
            await Promise.all([this.freddySheet.load(), this.enemySheet.load()]);
        } catch (e) {
            console.error('Failed to load assets', e);
            this.ctx.fillText('Error cargando los sprites', 480, 400);
            return;
        }

        this.initMenuParticles();
        this.showMenu();
        this.lastTime = performance.now();
        this.accumulator = 0;
        requestAnimationFrame(t => this.gameLoop(t));
    }

    loadBackgrounds() {
        ['bg_00', 'bg_01', 'bg_02', 'bg_03', 'bg_04', 'bg_05'].forEach(name => {
            const img = new Image();
            img.onload = () => { this.backgrounds[name] = img; };
            img.src = ASSETS[name];
        });
    }

    loadHighScore() {
        try {
            return Number(localStorage.getItem('freddyHighScore')) || 0;
        } catch (e) {
            return 0;
        }
    }

    saveHighScore(score) {
        if (score <= this.highScore) return;
        this.highScore = score;
        try {
            localStorage.setItem('freddyHighScore', String(score));
        } catch (e) { /* almacenamiento bloqueado: solo se pierde el récord */ }
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

    showOverlay(titleClass, title, text, score) {
        this.overlay.classList.remove('hidden');
        this.overlayTitle.className = titleClass;
        this.overlayTitle.textContent = title;
        this.overlaySubtitle.style.display = 'none';
        this.overlayText.textContent = text;
        this.overlayStars.innerHTML = '';
        this.overlayScore.textContent = score;
        this.overlayDivider.style.display = 'block';
        this.controlsInfo.style.display = 'none';
    }

    showMenu() {
        this.state = 'menu';
        this.showOverlay('', 'FREDDY GAME', 'Pulsa ENTER para empezar', this.highScore ? `Récord: ${this.highScore}` : '');
        this.overlaySubtitle.style.display = 'block';
        this.overlaySubtitle.textContent = 'Desatasca el código';
        this.controlsInfo.style.display = 'grid';
    }

    showLevelComplete() {
        this.state = 'levelComplete';
        this.showOverlay('level-complete-title', '¡NIVEL SUPERADO!', 'Pulsa ENTER para seguir', `Puntos: ${this.player.score}`);
        const stars = this.collectedCount >= this.totalCollectibles ? 3 :
                      this.collectedCount >= this.totalCollectibles * 0.6 ? 2 : 1;
        this.overlayStars.innerHTML = Array(3).fill(0).map((_, i) =>
            `<span class="${i < stars ? 'star-filled' : 'star-empty'}">★</span>`
        ).join('');
    }

    showGameOver() {
        this.state = 'gameOver';
        this.saveHighScore(this.player.score);
        this.showOverlay('game-over-title', 'GAME OVER', 'Pulsa ENTER para reintentar',
            `Puntos: ${this.player.score} · Récord: ${this.highScore}`);
    }

    showVictory() {
        this.state = 'victory';
        this.saveHighScore(this.player.score);
        this.showOverlay('victory-title', '¡HAS GANADO!', 'Pulsa ENTER para volver a jugar',
            `Puntos: ${this.player.score} · Récord: ${this.highScore}`);
        this.overlayStars.innerHTML = '<span class="star-filled">★★★★★</span>';

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
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    }

    triggerFlash() {
        this.flashAlpha = 0.3;
    }

    announce(text) {
        this.banner = { text, timer: 150 };
    }

    spawnEnemy(enemy) {
        this.enemies.push(enemy);
    }

    // stats: vidas/puntos/munición que se arrastran entre niveles.
    startLevel(levelIndex, stats = {}) {
        if (levelIndex >= levels.length) {
            this.showVictory();
            return;
        }

        this.currentLevel = levelIndex;
        this.level = levels[levelIndex];
        this.level.reset();
        this.levelTime = 0;
        this.player = new Player(this.level.spawnX, this.level.spawnY, stats);
        this.levelStartStats = { ...stats };

        this.enemies = this.level.enemies.map(e => new ENEMY_TYPES[e.type](e.x, e.y, e));
        this.enemyProjectiles = [];
        this.boss = null;
        this.pendingBoss = this.level.boss;

        this.collectibles = this.level.collectibles.map(c => new Collectible(c.x, c.y, c.type));
        // El papel es munición, no cuenta para las estrellas
        this.totalCollectibles = this.collectibles.filter(c => c.type !== 'paper').length;
        this.collectedCount = 0;
        this.particles = [];

        this.state = 'playing';
        this.overlay.classList.add('hidden');
        this.announce(this.level.name);
        this.updateHUD();
    }

    playerStats() {
        return { lives: this.player.lives, score: this.player.score, ammo: this.player.ammo };
    }

    handleInput() {
        if (this.input.isPressed('Enter')) {
            if (this.state === 'menu') {
                this.startLevel(0);
            } else if (this.state === 'gameOver' || this.state === 'victory') {
                this.showMenu();
            } else if (this.state === 'levelComplete') {
                this.startLevel(this.currentLevel + 1, this.playerStats());
            }
        }

        if (this.input.isPressed('Escape')) {
            if (this.state === 'playing') this.state = 'paused';
            else if (this.state === 'paused') this.state = 'playing';
        }

        if (this.input.isPressed('KeyR') && (this.state === 'playing' || this.state === 'paused')) {
            this.startLevel(this.currentLevel, this.levelStartStats);
        }
    }

    get exitOpen() {
        return !this.pendingBoss && !this.boss;
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

        this.levelTime++;
        this.level.update(this.levelTime);
        const player = this.player;
        player.update(this.input, this.level.platforms);
        this.enemies.forEach(e => e.update(player, this.level.platforms, this));
        this.enemyProjectiles.forEach(p => p.update());
        this.collectibles.forEach(c => c.update());

        this.handlePlayerAttacks();
        this.handleDamageToPlayer();
        this.handleCollectibles();
        this.updateBossFight();

        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => p.active);

        if (player.dead) {
            if (player.deathTimer > 120) this.showGameOver();
        } else if (this.exitOpen && Collision.aabb(player.getBounds(), {
            x: this.level.exitX, y: this.level.exitY, width: this.level.exitWidth, height: this.level.exitHeight
        })) {
            player.score += 50 * player.lives;
            this.showLevelComplete();
        }

        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);
        if (this.banner && --this.banner.timer <= 0) this.banner = null;

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

        if (this.flashAlpha > 0) this.flashAlpha -= 0.02;

        this.updateHUD();
        this.input.clear();
    }

    hitEnemy(enemy, damage, color) {
        const killed = enemy.takeDamage(damage);
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        this.spawnParticles(cx, cy, color);
        if (!killed) return;

        this.player.score += enemy.score;
        this.spawnText(cx, enemy.y, `+${enemy.score}`);
        this.triggerScreenShake(enemy.isBoss ? 16 : 5);
        // Los bugs a veces sueltan papel
        if (!enemy.isBoss && Math.random() < 0.35) {
            this.collectibles.push(new Collectible(cx - 14, enemy.y + enemy.height - 34, 'paper'));
        }
    }

    handlePlayerAttacks() {
        const player = this.player;
        const alive = this.enemies.filter(e => !e.dying);

        player.projectiles.forEach(proj => {
            alive.forEach(enemy => {
                if (!proj.active || enemy.dying || proj.hits.has(enemy)) return;
                if (!Collision.aabb(proj.getBounds(), enemy.getBounds())) return;
                proj.hits.add(enemy);
                if (!proj.pierce) proj.active = false;
                this.hitEnemy(enemy, proj.damage, '#ff6b35');
            });
        });

        const melee = player.getMeleeBounds();
        if (melee) {
            alive.forEach(enemy => {
                if (enemy.dying || player.meleeHits.has(enemy)) return;
                if (!Collision.aabb(melee, enemy.getBounds())) return;
                player.meleeHits.add(enemy);
                this.hitEnemy(enemy, 2, '#c0392b');
            });
            // El desatascador devuelve al vacío los píxeles y babas
            this.enemyProjectiles.forEach(p => {
                if (p.active && Collision.aabb(melee, p.getBounds())) {
                    p.active = false;
                    player.score += 10;
                    this.spawnParticles(p.x, p.y, '#fff');
                }
            });
        }
    }

    handleDamageToPlayer() {
        const player = this.player;
        if (player.dead) return;
        const bounds = player.getBounds();
        const hurt = (fromX) => {
            if (!player.takeDamage(1, fromX)) return;
            this.spawnParticles(player.x + player.width / 2, player.y + player.height / 2, '#e74c3c');
            this.triggerScreenShake(8);
            this.triggerFlash();
        };

        this.enemies.forEach(enemy => {
            if (enemy.dying) return;
            const attack = enemy.getAttackBounds();
            if (attack && Collision.aabb(bounds, attack)) hurt(enemy.x + enemy.width / 2);
            if (!Collision.aabb(bounds, enemy.getBounds())) return;

            // Pisotón: caer sobre el enemigo le hace daño y rebota.
            const prevBottom = player.y + player.height - player.velocityY;
            if (player.velocityY > 1 && prevBottom <= enemy.y + 12) {
                player.velocityY = -9;
                player.invincibleTimer = Math.max(player.invincibleTimer, 12);
                player.jumpsLeft = player.maxJumps - 1;
                this.hitEnemy(enemy, 1, '#ffd700');
                return;
            }
            hurt(enemy.x + enemy.width / 2);
        });

        this.enemyProjectiles.forEach(p => {
            if (p.active && Collision.aabb(bounds, p.getBounds())) {
                p.active = false;
                hurt(p.x);
            }
        });

        this.level.hazards.forEach(h => {
            if (Collision.aabb(bounds, this.level.hazardBounds(h))) {
                if (player.takeDamage(1, h.x + h.width / 2)) {
                    player.velocityY = -10;
                    this.spawnParticles(player.x + player.width / 2, player.y + player.height, '#6d4c41');
                    this.triggerScreenShake(6);
                }
            }
        });
    }

    handleCollectibles() {
        this.collectibles.forEach(c => {
            if (c.collected || !Collision.aabb(this.player.getBounds(), c.getBounds())) return;
            c.collected = true;
            this.player.score += c.value;
            if (c.type === 'heart' && this.player.lives < 5) this.player.lives++;
            if (c.type === 'paper') {
                this.player.ammo = Math.min(this.player.maxAmmo, this.player.ammo + 5);
                this.spawnText(c.x, c.y, '+5 🧻');
            } else {
                this.collectedCount++;
            }
            this.spawnParticles(c.x + c.width / 2, c.y + c.height / 2, '#ffd700');
        });
    }

    // El jefe aparece cuando ya no quedan enemigos normales; la salida se abre al vencerlo.
    updateBossFight() {
        if (this.pendingBoss && this.enemies.length === 0) {
            const b = this.pendingBoss;
            this.pendingBoss = null;
            this.boss = new ENEMY_TYPES[b.type](b.x, b.y);
            this.enemies.push(this.boss);
            this.announce(`¡JEFE: ${this.boss.name}!`);
            this.triggerScreenShake(10);
        }
        if (!this.boss) return;

        if (this.boss.markedForDeletion) {
            this.boss = null;
            this.announce('¡SALIDA DESBLOQUEADA!');
            return;
        }
        // Reabastecimiento: cae papel cada 6 s si no hay paquetes a la vista.
        if (this.levelTime % 360 === 0 && !this.collectibles.some(c => c.type === 'paper' && !c.collected)) {
            const p = this.level.platforms[Math.floor(Math.random() * this.level.platforms.length)];
            this.collectibles.push(new Collectible(p.baseX + p.width / 2 - 14, p.y - 34, 'paper'));
        }
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

    spawnText(x, y, text) {
        this.particles.push({
            x, y, text, life: 50,
            update() {
                this.y -= 1;
                this.life--;
            },
            draw(ctx) {
                ctx.globalAlpha = Math.min(1, this.life / 20);
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.font = 'bold 18px sans-serif';
                ctx.textAlign = 'center';
                ctx.strokeText(this.text, this.x, this.y);
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });
    }

    updateHUD() {
        if (!this.player) return;
        document.getElementById('lives').textContent = '❤️'.repeat(this.player.lives);
        document.getElementById('score').textContent = `Puntos: ${this.player.score}`;
        document.getElementById('ammo').textContent = `🧻 ${this.player.ammo}`;
        document.getElementById('level').textContent = `NIVEL ${this.currentLevel + 1}`;
        document.getElementById('collectibles').textContent = `★ ${this.collectedCount}/${this.totalCollectibles}`;
    }

    draw() {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.screenShake.x, this.screenShake.y);
        ctx.clearRect(-10, -10, 980, 740);

        if (this.state === 'menu') {
            this.drawMenuBackground();
        } else if (this.level) {
            this.level.draw(ctx, this.backgrounds, this.freddySheet, this.exitOpen);
            if (this.state !== 'gameOver' && this.state !== 'victory') {
                this.collectibles.forEach(c => c.draw(ctx));
                this.enemies.forEach(e => e.draw(ctx, this.enemySheet));
                this.enemyProjectiles.forEach(p => p.draw(ctx));
                this.player.draw(ctx, this.freddySheet);
            }
            this.particles.forEach(p => p.draw(ctx));

            if (this.flashAlpha > 0) {
                ctx.globalAlpha = this.flashAlpha;
                ctx.fillStyle = '#fff';
                ctx.fillRect(-10, -10, 980, 740);
                ctx.globalAlpha = 1;
            }
            if (this.boss) this.drawBossBar();
            if (this.banner) this.drawBanner();
            if (this.state === 'paused') this.drawPause();
        }

        ctx.restore();
    }

    drawBossBar() {
        const ctx = this.ctx;
        const w = 500;
        const x = 480 - w / 2;
        const y = 690;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 4, y - 22, w + 8, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.boss.name, 480, y - 6);
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, 10);
        ctx.fillStyle = this.boss.phase === 2 ? '#e91e63' : '#8bc34a';
        ctx.fillRect(x, y, w * (this.boss.health / this.boss.maxHealth), 10);
    }

    drawBanner() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.banner.timer / 30);
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#ffeb3b';
        ctx.strokeText(this.banner.text, 480, 300);
        ctx.fillText(this.banner.text, 480, 300);
        ctx.restore();
    }

    drawPause() {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(-10, -10, 980, 740);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSA', 480, 340);
        ctx.font = '20px sans-serif';
        ctx.fillText('ESC para seguir · R para reiniciar el nivel', 480, 385);
    }

    drawMenuBackground() {
        const ctx = this.ctx;
        if (this.backgrounds.bg_00) {
            ctx.drawImage(this.backgrounds.bg_00, 0, 0, 960, 720);
            ctx.fillStyle = 'rgba(15,12,41,0.7)';
            ctx.fillRect(0, 0, 960, 720);
        } else {
            ctx.fillStyle = '#0f0c29';
            ctx.fillRect(0, 0, 960, 720);
        }

        const time = Date.now() / 1000;

        this.menuParticles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;

            if (p.type === 'paper') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.font = `${p.size * 3}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);
            }

            ctx.restore();
        });

        // Freddy perseguido por un bug por la parte de abajo
        const freddyX = (time * 80) % 1200 - 100;
        ctx.globalAlpha = 0.8;
        this.freddySheet.draw(ctx, 'run', Math.floor(time * 12), freddyX, 700, 0.45);
        this.enemySheet.draw(ctx, 'bug_run', Math.floor(time * 12), freddyX - 160, 700, 0.35);
        ctx.globalAlpha = 1;
    }

    gameLoop(now) {
        this.accumulator += Math.min(now - this.lastTime, 250);
        this.lastTime = now;
        while (this.accumulator >= STEP) {
            this.update();
            this.accumulator -= STEP;
        }
        this.draw();
        requestAnimationFrame(t => this.gameLoop(t));
    }
}
