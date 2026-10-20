const STEP = 1000 / 60; // la física va a 60 Hz aunque la pantalla refresque a 120 Hz
const STAR_TYPES = new Set(['coin', 'star', 'heart']); // lo que cuenta para las estrellas del nivel
const POWER_TYPES = new Set(['triple', 'gold', 'shield']);
const ELITE_TINT = 'rgba(220, 0, 60, 0.35)';
const BACKGROUNDS = ['bg_00', 'bg_01', 'bg_02', 'bg_03', 'bg_04', 'bg_05'];

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 960;
        this.canvas.height = 720;
        this.ctx.imageSmoothingQuality = 'high';

        this.input = new InputHandler();
        this.backgrounds = {};
        this.scenery = new Scenery(this.backgrounds);
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
        this.hitstop = 0;
        this.camX = 0;
        this.banner = null; // { text, timer }
        this.boss = null;
        this.pendingBoss = null;
        this.combo = 0;
        this.comboTimer = 0;
        this.levelTime = 0;
        this.progress = this.loadProgress();

        this.overlay = document.getElementById('overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlaySubtitle = document.getElementById('overlay-subtitle');
        this.overlayText = document.getElementById('overlay-text');
        this.overlayStars = document.getElementById('overlay-stars');
        this.overlayScore = document.getElementById('overlay-score');
        this.overlayDivider = document.getElementById('overlay-divider');
        this.controlsInfo = document.getElementById('controls-info');

        // Cambiar de pestaña o ventana pausa el juego
        window.addEventListener('blur', () => {
            if (this.state === 'playing') this.state = 'paused';
        });
    }

    async init() {
        this.drawLoading(0);
        try {
            const sources = await this.assetSources();
            const total = Object.keys(sources).length;
            let loaded = 0;
            const done = () => this.drawLoading(++loaded / total);
            this.freddySheet = new SpriteSheet(sources.freddy, FREDDY_FRAMES);
            this.enemySheet = new SpriteSheet(sources.enemies, ENEMY_FRAMES);
            await Promise.all([
                ...BACKGROUNDS.map(name => loadImage(sources[name]).then(img => { this.backgrounds[name] = img; done(); })),
                this.freddySheet.load().then(done),
                this.enemySheet.load().then(done),
            ]);
        } catch (e) {
            console.error('Failed to load assets', e);
            this.ctx.fillText('Error cargando los sprites', 480, 400);
            return;
        }
        Object.keys(ENEMY_FRAMES)
            .filter(name => name.startsWith('bug_') || name.startsWith('e404_'))
            .forEach(name => this.enemySheet.addTint(name, `${name}_elite`, ELITE_TINT));

        this.initMenuParticles();
        this.showMenu();
        this.lastTime = performance.now();
        this.accumulator = 0;
        requestAnimationFrame(t => this.gameLoop(t));
    }

    // Por http se cargan los ficheros sueltos (en paralelo y cacheables). Con file:// el
    // navegador no deja leer sus píxeles, así que se usa la versión embebida js/assets.js.
    async assetSources() {
        if (location.protocol !== 'file:') return ASSET_FILES;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/assets.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return ASSETS;
    }

    drawLoading(fraction) {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f0c29';
        ctx.fillRect(0, 0, 960, 720);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Cargando...', 480, 340);
        ctx.fillStyle = '#333';
        ctx.fillRect(330, 370, 300, 12);
        ctx.fillStyle = '#7CFC00';
        ctx.fillRect(330, 370, 300 * fraction, 12);
    }

    // Progreso: niveles desbloqueados, mejores estrellas/tiempo por nivel y récord de puntos.
    loadProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem('freddyProgress'));
            if (saved && saved.unlocked) return saved;
        } catch (e) { /* almacenamiento no disponible */ }
        return { unlocked: 1, best: {}, highScore: 0 };
    }

    saveProgress() {
        try {
            localStorage.setItem('freddyProgress', JSON.stringify(this.progress));
        } catch (e) { /* almacenamiento bloqueado: solo se pierde el progreso */ }
    }

    recordScore(score) {
        if (score > this.progress.highScore) {
            this.progress.highScore = score;
            this.saveProgress();
        }
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
        Sound.music(null);
        const { unlocked, highScore } = this.progress;
        const pick = unlocked > 1 ? ` · 1-${unlocked}: elegir nivel` : '';
        this.showOverlay('', 'FREDDY GAME', `Pulsa ENTER para empezar${pick}`,
            highScore ? `Récord: ${highScore} · Niveles: ${unlocked}/${levels.length}` : '');
        this.overlaySubtitle.style.display = 'block';
        this.overlaySubtitle.textContent = 'Desatasca el código';
        this.controlsInfo.style.display = 'grid';
    }

    showLevelComplete() {
        this.state = 'levelComplete';
        Sound.music(null);
        Sound.play('flush');

        const stars = this.collectedCount >= this.totalCollectibles ? 3 :
                      this.collectedCount >= this.totalCollectibles * 0.6 ? 2 : 1;
        const time = this.levelTime / 60;
        const best = this.progress.best[this.currentLevel] || { stars: 0, time: Infinity };
        this.progress.best[this.currentLevel] = { stars: Math.max(best.stars, stars), time: Math.min(best.time, time) };
        this.progress.unlocked = Math.min(levels.length, Math.max(this.progress.unlocked, this.currentLevel + 2));
        this.recordScore(this.player.score);
        this.saveProgress();

        this.showOverlay('level-complete-title', '¡NIVEL SUPERADO!', 'Pulsa ENTER para cruzar la puerta',
            `Puntos: ${this.player.score} · Tiempo: ${formatTime(time)} (mejor ${formatTime(Math.min(best.time, time))})`);
        this.overlayStars.innerHTML = Array(3).fill(0).map((_, i) =>
            `<span class="${i < stars ? 'star-filled' : 'star-empty'}">★</span>`
        ).join('');
    }

    showGameOver() {
        this.state = 'gameOver';
        Sound.music(null);
        Sound.play('gameOver');
        this.recordScore(this.player.score);
        this.showOverlay('game-over-title', 'GAME OVER', 'Pulsa ENTER para volver al menú',
            `Puntos: ${this.player.score} · Récord: ${this.progress.highScore}`);
    }

    showVictory() {
        this.state = 'victory';
        Sound.music(null);
        Sound.play('victory');
        this.recordScore(this.player.score);
        this.showOverlay('victory-title', '¡HAS GANADO!', 'Pulsa ENTER para volver a jugar',
            `Puntos: ${this.player.score} · Récord: ${this.progress.highScore}`);
        this.overlayStars.innerHTML = '<span class="star-filled">★★★★★</span>';

        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.camX + Math.random() * 960,
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
        this.scenery.setLevel(this.level);
        this.levelTime = 0;
        this.player = new Player(this.level.spawnX, this.level.spawnY, stats);
        this.levelStartStats = { ...stats };
        this.camX = 0;

        this.enemies = this.level.enemies.map(e => new ENEMY_TYPES[e.type](e.x, e.y, e));
        this.enemyProjectiles = [];
        this.boss = null;
        this.pendingBoss = this.level.boss;
        this.combo = 0;
        this.comboTimer = 0;

        this.collectibles = this.level.collectibles.map(c => new Collectible(c.x, c.y, c.type));
        this.totalCollectibles = this.collectibles.filter(c => STAR_TYPES.has(c.type)).length;
        this.collectedCount = 0;
        this.particles = [];

        this.state = 'playing';
        this.overlay.classList.add('hidden');
        this.announce(this.level.name);
        Sound.music('level');
        this.updateHUD();
    }

    playerStats() {
        return { lives: this.player.lives, score: this.player.score, ammo: this.player.ammo };
    }

    handleInput() {
        const input = this.input;
        if (input.isPressed('Enter')) {
            if (this.state === 'menu') {
                this.startLevel(0);
            } else if (this.state === 'gameOver' || this.state === 'victory') {
                this.showMenu();
            } else if (this.state === 'levelComplete') {
                this.startLevel(this.currentLevel + 1, this.playerStats());
            }
        }

        if (this.state === 'menu') {
            for (let i = 1; i <= this.progress.unlocked; i++) {
                if (input.isPressed(`Digit${i}`)) this.startLevel(i - 1);
            }
        }

        if (input.isPressed('Escape')) {
            if (this.state === 'playing') this.state = 'paused';
            else if (this.state === 'paused') this.state = 'playing';
        }

        if (input.isPressed('KeyM')) {
            this.announce(Sound.toggleMute() ? 'SONIDO: NO' : 'SONIDO: SÍ');
        }

        if (input.isPressed('KeyR') && (this.state === 'playing' || this.state === 'paused')) {
            this.startLevel(this.currentLevel, this.levelStartStats);
        }
    }

    get exitOpen() {
        return !this.pendingBoss && !this.boss;
    }

    update() {
        this.input.poll();
        // Micro-pausa al acertar: congela la acción unos frames; las pulsaciones esperan.
        if (this.state === 'playing' && this.hitstop > 0) {
            this.hitstop--;
            return;
        }
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
        const level = this.level;
        const player = this.player;
        level.update(this.levelTime);
        this.scenery.update(player, this.camX);
        player.update(this.input, level);
        if (player.landed) {
            this.spawnDust(player.x + player.width / 2, player.y + player.height);
            Sound.play('land');
        }
        this.enemies.forEach(e => e.update(player, level, this));
        this.enemyProjectiles.forEach(p => p.update());
        this.collectibles.forEach(c => c.update());

        this.handlePlayerAttacks();
        this.handleDamageToPlayer();
        this.handleCollectibles();
        this.handleCheckpoints();
        this.updateBossFight();

        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => p.active);
        if (this.comboTimer > 0 && --this.comboTimer === 0) this.combo = 0;

        if (player.dead) {
            if (player.deathTimer > 120) this.showGameOver();
        } else if (this.exitOpen && Collision.aabb(player.getBounds(), {
            x: level.exitX, y: level.exitY, width: level.exitWidth, height: level.exitHeight
        })) {
            player.score += 50 * player.lives;
            this.showLevelComplete();
        }

        this.updateCamera();
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

    // La cámara sigue a Freddy mirando un poco hacia delante; en la arena del jefe queda fija.
    updateCamera() {
        const level = this.level;
        const target = this.player.x + this.player.width / 2 - 480 + this.player.facing * 80;
        const max = level.width - 960;
        const clamped = Math.max(level.leftWall, Math.min(max, target));
        this.camX += (clamped - this.camX) * 0.1;
        this.camX = Math.max(0, Math.min(max, this.camX));
    }

    hitEnemy(enemy, damage, color, fromX) {
        const killed = enemy.takeDamage(damage, fromX);
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        this.spawnParticles(cx, cy, color);
        this.hitstop = Math.max(this.hitstop, killed ? 6 : 3);
        if (!killed) {
            Sound.play('hit');
            return;
        }

        Sound.play('kill');
        this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
        this.comboTimer = 180;
        const points = enemy.score * Math.min(this.combo, 5);
        this.player.score += points;
        this.spawnText(cx, enemy.y, this.combo > 1 ? `+${points} x${this.combo}` : `+${points}`);
        this.triggerScreenShake(enemy.isBoss ? 16 : 5);
        // Los bugs a veces sueltan papel; el 404 devuelve lo que robó
        if (!enemy.isBoss && (enemy.carrying || Math.random() < 0.35)) {
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
                this.hitEnemy(enemy, proj.damage, '#ff6b35', proj.x - proj.velocityX * 10);
            });
        });

        const melee = player.getMeleeBounds();
        if (melee) {
            alive.forEach(enemy => {
                if (enemy.dying || player.meleeHits.has(enemy)) return;
                if (!Collision.aabb(melee, enemy.getBounds())) return;
                player.meleeHits.add(enemy);
                this.hitEnemy(enemy, player.meleeDamage, '#c0392b', player.x + player.width / 2);
            });
            // El desatascador devuelve al vacío los píxeles y babas
            this.enemyProjectiles.forEach(p => {
                if (p.active && Collision.aabb(melee, p.getBounds())) {
                    p.active = false;
                    player.score += 10;
                    this.spawnParticles(p.x, p.y, '#fff');
                    Sound.play('hit');
                }
            });
        }
    }

    handleDamageToPlayer() {
        const player = this.player;
        if (player.dead) return;
        const bounds = player.getBounds();
        const hurt = (fromX, heavy) => {
            if (!player.takeDamage(1, fromX, heavy)) return;
            this.combo = 0;
            this.comboTimer = 0;
            this.spawnParticles(player.x + player.width / 2, player.y + player.height / 2, heavy ? '#6d4c41' : '#e74c3c');
            this.triggerScreenShake(heavy ? 12 : 8);
            this.triggerFlash();
        };

        this.enemies.forEach(enemy => {
            if (enemy.dying) return;
            const attack = enemy.getAttackBounds();
            if (attack && Collision.aabb(bounds, attack)) hurt(enemy.x + enemy.width / 2, true);
            if (!Collision.aabb(bounds, enemy.getBounds())) return;

            // Pisotón: caer sobre el enemigo le hace daño y rebota.
            const prevBottom = player.y + player.height - player.velocityY;
            if (player.velocityY > 1 && prevBottom <= enemy.y + 12) {
                player.velocityY = -9;
                player.invincibleTimer = Math.max(player.invincibleTimer, 12);
                player.jumpsLeft = player.maxJumps - 1;
                Sound.play('stomp');
                this.hitEnemy(enemy, 1, '#ffd700');
                return;
            }
            hurt(enemy.x + enemy.width / 2, enemy.heavy);
        });

        this.enemyProjectiles.forEach(p => {
            if (p.active && Collision.aabb(bounds, p.getBounds())) {
                p.active = false;
                hurt(p.x, p.type === 'goo');
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
        const player = this.player;
        this.collectibles.forEach(c => {
            if (c.collected || !Collision.aabb(player.getBounds(), c.getBounds())) return;
            c.collected = true;
            player.score += c.value;
            if (STAR_TYPES.has(c.type)) this.collectedCount++;

            if (c.type === 'heart' && player.lives < 5) player.lives++;
            if (c.type === 'paper') {
                player.ammo = Math.min(player.maxAmmo, player.ammo + 5);
                this.spawnText(c.x, c.y, '+5 🧻');
                Sound.play('paper');
            } else if (POWER_TYPES.has(c.type)) {
                if (c.type === 'shield') player.shield = true;
                else player.powers[c.type] = POWER_TIME;
                this.spawnText(c.x, c.y, { triple: '¡PAPEL TRIPLE!', gold: '¡DESATASCADOR DORADO!', shield: '¡ESCUDO!' }[c.type]);
                Sound.play('power');
            } else {
                Sound.play('coin');
            }
            this.spawnParticles(c.x + c.width / 2, c.y + c.height / 2, '#ffd700');
        });
    }

    handleCheckpoints() {
        const player = this.player;
        this.level.checkpoints.forEach(c => {
            if (c.reached || player.dead || Math.abs(player.x + player.width / 2 - c.x) > 30) return;
            c.reached = true;
            player.spawnX = c.x - player.width / 2;
            player.spawnY = c.y - player.baseHeight - 10;
            this.spawnText(c.x, c.y - 80, 'CHECKPOINT');
            Sound.play('checkpoint');
        });
    }

    // Al entrar en la arena se cierra la pared izquierda y aparece el jefe; la salida se abre al vencerlo.
    updateBossFight() {
        const level = this.level;
        if (this.pendingBoss && this.player.x > this.pendingBoss.arenaX + 60) {
            const b = this.pendingBoss;
            this.pendingBoss = null;
            level.leftWall = b.arenaX;
            this.boss = new ENEMY_TYPES[b.type](b.x, b.y, b);
            this.enemies.push(this.boss);
            this.announce(`¡JEFE: ${this.boss.name}!`);
            this.triggerScreenShake(10);
            Sound.play('boss');
            Sound.music('boss');
        }
        if (!this.boss) return;

        if (this.boss.markedForDeletion) {
            this.boss = null;
            this.announce('¡PUERTA ABIERTA!');
            Sound.music('level');
            return;
        }
        // Reabastecimiento: cae papel cada 6 s si no hay paquetes a la vista.
        if (this.levelTime % 360 === 0 && !this.collectibles.some(c => c.type === 'paper' && !c.collected)) {
            const arena = level.platforms.filter(p => p.baseX >= level.leftWall && !p.moveX);
            const p = arena[Math.floor(Math.random() * arena.length)];
            this.collectibles.push(new Collectible(p.x + p.width / 2 - 14, p.y - 34, 'paper'));
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

    spawnParticles(x, y, color, count = 10, spread = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * spread,
                vy: (Math.random() - 0.5) * spread - 2,
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

    spawnDust(x, y) {
        this.spawnParticles(x, y - 4, 'rgba(200, 180, 150, 0.8)', 8, 6);
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
        const player = this.player;
        if (!player) return;
        const powers = [
            player.shield ? '🛡️' : '',
            player.powers.triple > 0 ? `🧻x3 ${Math.ceil(player.powers.triple / 60)}s` : '',
            player.powers.gold > 0 ? `🪠 ${Math.ceil(player.powers.gold / 60)}s` : '',
        ].filter(Boolean).join(' ');
        document.getElementById('lives').textContent = '❤️'.repeat(player.lives);
        document.getElementById('score').textContent = `Puntos: ${player.score}`;
        document.getElementById('ammo').textContent = `🧻 ${player.ammo}`;
        document.getElementById('power').textContent = powers;
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
            const camX = Math.round(this.camX);
            this.scenery.drawBackground(ctx);

            ctx.save();
            ctx.translate(-camX, 0);
            this.level.draw(ctx, this.scenery, this.freddySheet, this.exitOpen, camX);
            if (this.state !== 'gameOver' && this.state !== 'victory') {
                const grounded = [...this.collectibles.filter(c => !c.collected), ...this.enemies];
                if (!this.player.dead) grounded.push(this.player);
                this.scenery.drawShadows(ctx, grounded, this.level.platforms);
                this.collectibles.forEach(c => c.draw(ctx));
                this.enemies.forEach(e => e.draw(ctx, this.enemySheet));
                this.enemyProjectiles.forEach(p => p.draw(ctx));
                this.player.draw(ctx, this.freddySheet);
            }
            this.particles.forEach(p => p.draw(ctx));
            ctx.restore();
            this.scenery.drawForeground(ctx);

            if (this.flashAlpha > 0) {
                ctx.globalAlpha = this.flashAlpha;
                ctx.fillStyle = '#fff';
                ctx.fillRect(-10, -10, 980, 740);
                ctx.globalAlpha = 1;
            }
            if (this.boss) this.drawBossBar();
            if (this.combo > 1) this.drawCombo();
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

    drawCombo() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.comboTimer / 30);
        ctx.font = `bold ${22 + Math.min(this.combo, 5) * 3}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#ff9800';
        ctx.strokeText(`COMBO x${this.combo}`, 940, 110);
        ctx.fillText(`COMBO x${this.combo}`, 940, 110);
        ctx.restore();
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
        ctx.fillText('ESC para seguir · R para reiniciar el nivel · M para el sonido', 480, 385);
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

function formatTime(seconds) {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
