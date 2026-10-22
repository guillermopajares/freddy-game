// Estados que se reproducen una vez y se quedan en el último frame.
const ONE_SHOT = new Set(['attack', 'throw', 'spit', 'whip', 'transform', 'death']);

class Enemy {
    constructor(x, y, opts) {
        this.x = x;
        this.y = y;
        this.width = opts.width;
        this.height = opts.height;
        this.elite = !!opts.elite; // élite: tintado rojo, doble de vida y más agresivo
        this.health = opts.health * (this.elite ? 2 : 1);
        this.maxHealth = this.health;
        this.scale = opts.scale;
        this.anims = opts.anims;
        this.animSpeeds = opts.animSpeeds || {};
        this.score = opts.score * (this.elite ? 2 : 1);
        this.damage = 1;

        this.velocityX = 0;
        this.velocityY = 0;
        this.knockX = 0;
        this.onGround = false;
        this.ground = null;
        this.gravity = true;
        this.facing = -1;
        this.state = 'walk';
        this.stateTime = 0;
        this.cooldown = 60;
        this.rest = 1; // >1: el cooldown baja más despacio (jefes en Fácil, ver DIFFICULTY.bossRest)
        this.restAcc = 0;
        this.hitTimer = 0;
        this.stun = 0;
        this.dying = false;
        this.markedForDeletion = false;
        this.isBoss = false;
        this.heavy = false; // sus golpes derriban a Freddy
        this.mirror = true; // false = de frente, no se voltea (el texto 404 saldría al revés)
    }

    // Probabilidad de soltar un corazón al morir: élites y jefes siempre.
    get heartDropChance() {
        return this.isBoss || this.elite ? 1 : 0.15;
    }

    setState(state) {
        if (this.state !== state) {
            this.state = state;
            this.stateTime = 0;
        }
    }

    // Devuelve true si el golpe lo mata. fromX: de dónde viene el golpe (retroceso).
    takeDamage(amount, fromX) {
        if (this.dying) return false;
        this.health -= amount;
        this.hitTimer = 12;
        if (!this.isBoss && fromX !== undefined) {
            this.knockX = (this.x + this.width / 2 < fromX ? -1 : 1) * 4;
        }
        if (this.health <= 0) {
            this.health = 0;
            this.dying = true;
            this.gravity = true;
            this.velocityX = 0;
            this.setState('death');
            return true;
        }
        if (!this.isBoss) this.stun = 12;
        this.onHit();
        return false;
    }

    onHit() {}

    update(player, level, game) {
        this.stateTime++;
        if (this.hitTimer > 0) this.hitTimer--;

        if (this.dying) {
            if (this.stateTime > (this.isBoss ? 150 : 60)) this.markedForDeletion = true;
        } else if (this.stun > 0) {
            this.stun--;
            this.velocityX = 0;
            if (!this.gravity) this.velocityY = 0;
        } else {
            // Devuelve parte de lo que think() descuenta: el cooldown avanza a ritmo 1/rest
            if (this.rest > 1 && this.cooldown > 0) {
                this.restAcc += 1 - 1 / this.rest;
                if (this.restAcc >= 1) {
                    this.restAcc--;
                    this.cooldown++;
                }
            }
            this.think(player, level, game);
        }

        const wantedX = this.velocityX;
        if (this.gravity) this.velocityY += 0.5;
        this.x += this.velocityX + this.knockX;
        this.y += this.velocityY;
        this.knockX = Math.abs(this.knockX) < 0.3 ? 0 : this.knockX * 0.8;
        if (this.gravity) {
            Collision.checkPlatformCollisions(this, level.platforms);
            if (this.ground && this.ground.vx) this.x += this.ground.vx;
        }
        if (wantedX !== 0 && this.velocityX === 0) this.facing = -this.facing; // pared

        // Los jefes no salen de su arena (arenaX lo pone el juego al invocarlos)
        const minX = this.arenaX || 0;
        const maxX = (this.arenaX ? this.arenaX + 960 : level.width) - this.width;
        if (this.x < minX || this.x > maxX) {
            this.x = Math.max(minX, Math.min(maxX, this.x));
            this.facing = this.x <= minX ? 1 : -1;
        }
        if (this.y > 800) this.markedForDeletion = true;
    }

    think() {}

    // ¿Hay suelo justo delante de los pies? Evita que se tiren por los bordes.
    groundAhead(platforms) {
        const footX = this.facing === 1 ? this.x + this.width + 4 : this.x - 4;
        const footY = this.y + this.height;
        return platforms.some(p => footX >= p.x && footX <= p.x + p.width && Math.abs(p.y - footY) < 6);
    }

    facePlayer(player) {
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        if (dx !== 0) this.facing = Math.sign(dx);
        return dx;
    }

    // Disparo apuntado al jugador; count > 1 = abanico.
    shoot(player, game, count = 1, spread = 0.3, type = 'pixel') {
        const { width: size, speed } = PROJECTILE_TYPES[type];
        const sx = this.x + this.width / 2;
        const sy = this.y + this.height * 0.45;
        const base = Math.atan2(player.y + player.height / 2 - sy, player.x + player.width / 2 - sx);
        for (let i = 0; i < count; i++) {
            const a = base + (i - (count - 1) / 2) * spread;
            game.enemyProjectiles.push(new Projectile(
                sx - size / 2, sy - size / 2, Math.cos(a), type, Math.sin(a) * speed
            ));
        }
        Sound.play('enemyShot');
    }

    getFrame(sheet) {
        let name = this.anims[this.state] || this.anims.walk;
        if (this.elite) name += '_elite';
        const count = sheet.count(name) || 1;
        const i = Math.floor(this.stateTime / (this.animSpeeds[this.state] || 8));
        return [name, ONE_SHOT.has(this.state) ? Math.min(i, count - 1) : i % count];
    }

    draw(ctx, sheet) {
        const [name, frame] = this.getFrame(sheet);
        const cx = this.x + this.width / 2;
        const bottom = this.y + this.height;

        ctx.save();
        if (this.hitTimer > 0 && this.hitTimer % 4 < 2) ctx.globalAlpha = 0.5;
        if (this.dying && !this.anims.death) {
            // Sin animación de muerte: se aplasta y desvanece.
            const t = Math.min(1, this.stateTime / 40);
            ctx.globalAlpha = 1 - t;
            ctx.translate(cx, bottom);
            ctx.scale(1 + t * 0.4, 1 - t * 0.7);
            ctx.translate(-cx, -bottom);
        }
        sheet.draw(ctx, name, frame, cx, bottom, this.scale, this.mirror ? this.facing : 1);
        ctx.restore();

        if (!this.isBoss && !this.dying && this.health < this.maxHealth) {
            const barWidth = 44;
            const barX = cx - barWidth / 2;
            const barY = this.y - 12;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 4);
        }
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    getAttackBounds() {
        return null;
    }
}

// Patrulla; si ve a Freddy a su altura corre hacia él y se lanza a morder.
// small = cría de la araña: diminuta, 1 golpe.
class CodeBug extends Enemy {
    constructor(x, y, opts = {}) {
        const small = !!opts.small;
        super(x, y, {
            width: small ? 26 : 40, height: small ? 44 : 72, health: small ? 1 : opts.health || 2,
            scale: small ? 0.18 : 0.3, score: small ? 50 : 100, elite: opts.elite,
            anims: { walk: 'bug_walk', run: 'bug_run', attack: 'bug_attack' },
            animSpeeds: { walk: 10, run: 5, attack: 9 },
        });
        this.small = small;
        this.speedMul = this.elite ? 1.4 : small ? 1.3 : 1;
        this.jumpCooldown = 0;
    }

    canJumpTo(player, dx) {
        const rise = this.y + this.height - (player.y + player.height);
        return this.onGround && this.jumpCooldown === 0 && !player.dead &&
            rise > 50 && rise < 170 && Math.abs(dx) < 170;
    }

    think(player, level) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.jumpCooldown > 0) this.jumpCooldown--;
        if (!this.onGround) return; // en el aire mantiene la trayectoria del salto
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const sameLevel = Math.abs(player.y + player.height - (this.y + this.height)) < 50;

        if (this.state === 'attack') {
            this.velocityX = this.stateTime > 18 ? 4.5 * this.speedMul * this.facing : 0; // amago y embestida
            if (this.stateTime >= 36) {
                this.setState('walk');
                this.cooldown = this.elite ? 35 : 60;
            }
        } else if (sameLevel && Math.abs(dx) < 90 && this.cooldown === 0) {
            this.facePlayer(player);
            this.setState('attack');
            this.velocityX = 0;
        } else if (sameLevel && Math.abs(dx) < 280) {
            this.facePlayer(player);
            this.setState('run');
            this.velocityX = 2.2 * this.speedMul * this.facing;
        } else if (this.canJumpTo(player, dx)) {
            // Freddy está en una plataforma justo encima: salta a por él
            this.facePlayer(player);
            this.setState('run');
            this.velocityY = -11;
            this.velocityX = 2.5 * this.facing;
            this.jumpCooldown = 90;
            return;
        } else {
            this.setState('walk');
            this.velocityX = this.speedMul * this.facing;
        }

        if (this.onGround && !this.groundAhead(level.platforms)) {
            if (this.state === 'walk') this.facing = -this.facing;
            this.velocityX = 0;
        }
    }
}

// Flota y lanza píxeles muertos apuntados a Freddy. Si ve papel en el suelo, va a robarlo.
class Error404 extends Enemy {
    constructor(x, y, opts = {}) {
        super(x, y, {
            width: 44, height: 72, health: opts.health || 2, scale: 0.3, score: 150, elite: opts.elite,
            anims: { walk: 'e404_idle', throw: 'e404_throw', steal: 'e404_steal', glitch: 'e404_idle', death: 'e404_death' },
            animSpeeds: { walk: 12, throw: 12, steal: 10, death: 20 },
        });
        this.gravity = false;
        this.mirror = false;
        this.baseY = y;
        this.floatPhase = Math.random() * Math.PI * 2;
        this.range = opts.range || 320;
        this.cooldown = 60 + Math.floor(Math.random() * 60);
        this.carrying = false;
    }

    // El élite se teletransporta al recibir un golpe (a veces).
    onHit() {
        if (this.elite && Math.random() < 0.5) {
            this.startGlitch(this.x + (Math.random() < 0.5 ? -170 : 170), this.baseY);
        }
    }

    // Teletransporte con fallo gráfico: parpadea, salta a (x, y) a mitad de animación.
    startGlitch(x, y) {
        this.glitchTarget = { x, y };
        this.setState('glitch');
        Sound.play('glitch');
    }

    updateGlitch() {
        this.velocityX = 0;
        this.velocityY = 0;
        if (this.stateTime === 10) {
            this.x = this.glitchTarget.x;
            this.y = this.baseY = this.glitchTarget.y;
        }
        if (this.stateTime >= 20) this.setState('walk');
    }

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.state === 'glitch') return this.updateGlitch();
        this.floatPhase += 0.05;
        this.velocityY = this.baseY + Math.sin(this.floatPhase) * 16 - this.y;

        if (this.state !== 'throw' && this.trySteal(game)) return;

        const dx = this.facePlayer(player);
        if (this.state === 'throw') {
            this.velocityX = 0;
            if (this.stateTime === 12) this.shoot(player, game, this.elite ? 3 : 1, 0.2);
            if (this.stateTime >= 24) this.setState('walk');
        } else if (Math.hypot(dx, player.y - this.y) < this.range) {
            this.setState('walk');
            this.velocityX = Math.abs(dx) > 120 ? 0.8 * this.facing : 0;
            if (this.cooldown === 0) {
                this.setState('throw');
                this.cooldown = this.elite ? 100 : 140;
            }
        } else {
            this.setState('walk');
            this.velocityX = 0;
        }
    }

    trySteal(game) {
        if (this.carrying) return false;
        const loot = game.collectibles.find(c =>
            c.type === 'paper' && !c.collected && Math.abs(c.x - this.x) < 260 && Math.abs(c.y - this.y) < 260
        );
        if (!loot) return false;

        this.setState('steal');
        const dx = loot.x + loot.width / 2 - (this.x + this.width / 2);
        this.facing = Math.sign(dx) || this.facing;
        this.velocityX = Math.abs(dx) > 4 ? 1.8 * this.facing : 0;
        this.baseY += (loot.y + loot.height - this.height - this.baseY) * 0.05;
        if (Collision.aabb(this.getBounds(), loot.getBounds())) {
            loot.collected = true;
            this.carrying = true;
            game.stolen = true;
            this.setState('walk');
            game.spawnText(this.x + this.width / 2, this.y, '¡ROBADO!');
            Sound.play('steal');
        }
        return true;
    }

    draw(ctx, sheet) {
        if (this.state === 'glitch' && this.stateTime % 4 < 2) {
            // Fallo gráfico: copias desplazadas y semitransparentes
            const [name, frame] = this.getFrame(sheet);
            ctx.save();
            ctx.globalAlpha = 0.45;
            [-7, 7].forEach(off => sheet.draw(ctx, name, frame, this.x + this.width / 2 + off, this.y + this.height, this.scale, 1));
            ctx.restore();
        }
        super.draw(ctx, sheet);
        if (!this.carrying || this.dying) return;
        // Rollo robado sobre la cabeza
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#999';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y - 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Jefe del nivel 3: barre la arena por arriba disparando abanicos; a media vida invoca bugs.
class Boss404 extends Error404 {
    constructor(x, y, opts = {}) {
        super(x, y, { health: 30 });
        this.width = 100;
        this.height = 170;
        this.scale = 0.7;
        this.score = 2000;
        this.isBoss = true;
        this.name = 'ERROR 404 GIGANTE';
        this.achievement = 'boss404';
        this.arenaX = opts.arenaX || 0;
        this.phase = 1;
        this.sweep = 0;
        this.cooldown = 90;
    }

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.phase === 1 && this.health <= this.maxHealth / 2) {
            this.phase = 2;
            game.announce('¡ERROR 404 SE CABREA!');
            Sound.play('bossPhase');
            game.spawnEnemy(new CodeBug(this.arenaX + 60, 100));
            game.spawnEnemy(new CodeBug(this.arenaX + 860, 100));
        }

        this.sweep += this.phase === 1 ? 0.01 : 0.017;
        const targetX = this.arenaX + 480 - this.width / 2 + Math.sin(this.sweep) * 340;
        this.velocityX = (targetX - this.x) * 0.05;
        this.velocityY = this.baseY + Math.sin(this.sweep * 4) * 30 - this.y;
        this.facePlayer(player);

        if (this.state === 'throw') {
            if (this.stateTime === 12) this.shoot(player, game, this.phase === 1 ? 3 : 5);
            if (this.stateTime >= 24) this.setState('walk');
        } else if (this.cooldown === 0) {
            this.setState('throw');
            this.cooldown = this.phase === 1 ? 110 : 70;
        }
    }
}

// Jefe final: Bug Araña escupe babas en parábola; a media vida se convierte en
// Código Espagueti, más rápido y con latigazos de cables.
class BossSpider extends Enemy {
    constructor(x, y) {
        super(x, y, {
            width: 130, height: 110, health: 36, scale: 0.55, score: 5000,
            anims: { walk: 'spider_walk', spit: 'spider_spit', transform: 'spider_hurt', whip: 'spaghetti', death: 'spider_death' },
            animSpeeds: { walk: 8, spit: 12, transform: 6, whip: 9, death: 40 },
        });
        this.isBoss = true;
        this.heavy = true;
        this.name = 'BUG ARAÑA';
        this.achievement = 'bossFinal';
        this.actions = 0;
        this.phase = 1;
        this.cooldown = 90;
    }

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;

        if (this.phase === 1 && this.health <= this.maxHealth / 2 && this.state !== 'transform') {
            this.setState('transform');
            game.announce('¡SE CONVIERTE EN CÓDIGO ESPAGUETI!');
            game.triggerScreenShake(14);
            Sound.play('bossPhase');
        }

        if (this.state === 'transform') {
            this.velocityX = 0;
            if (this.stateTime >= 70) {
                this.phase = 2;
                this.name = 'CÓDIGO ESPAGUETI';
                this.anims.walk = 'spaghetti';
                this.setState('walk');
            }
            return;
        }
        if (this.state === 'spit') {
            this.velocityX = 0;
            if (this.stateTime % 12 === 6) {
                const mouthX = this.facing === 1 ? this.x + this.width : this.x - PROJECTILE_TYPES.goo.width;
                game.enemyProjectiles.push(new Projectile(
                    mouthX, this.y + this.height * 0.35, this.facing * (0.5 + Math.random() * 0.9), 'goo', -5 - Math.random() * 3
                ));
                Sound.play('goo');
            }
            if (this.stateTime >= 36) {
                this.setState('walk');
                this.cooldown = this.phase === 1 ? 100 : 80;
            }
            return;
        }
        if (this.state === 'whip') {
            this.velocityX = 0;
            if (this.stateTime >= 40) {
                this.setState('walk');
                this.cooldown = 50;
            }
            return;
        }

        const dx = this.facePlayer(player);
        this.velocityX = (this.phase === 1 ? 1.2 : 2.4) * this.facing;
        if (this.onGround && !this.groundAhead(level.platforms)) this.velocityX = 0;
        if (this.cooldown === 0) {
            this.actions++;
            // Fase 1: cada tercera acción suelta crías en vez de escupir
            const brood = this.phase === 1 && this.actions % 3 === 0 && game.enemies.filter(e => e.small && !e.dying).length < 4;
            if (brood) {
                for (const side of [-1, 1]) game.spawnEnemy(new CodeBug(this.x + this.width / 2 + side * 40, this.y + 40, { small: true }));
                game.spawnText(this.x + this.width / 2, this.y, '¡CRÍAS!');
                this.cooldown = 100;
            } else {
                this.setState(this.phase === 2 && Math.abs(dx) < 230 ? 'whip' : 'spit');
            }
        }
    }

    getFrame(sheet) {
        // Durante la transformación parpadea entre araña y espagueti.
        if (this.state === 'transform' && Math.floor(this.stateTime / 6) % 2) {
            return ['spaghetti', 0];
        }
        return super.getFrame(sheet);
    }

    getAttackBounds() {
        if (this.state !== 'whip' || this.stateTime < 12 || this.stateTime > 32) return null;
        const reach = 170;
        return {
            x: this.facing === 1 ? this.x + this.width : this.x - reach,
            y: this.y + this.height - 50,
            width: reach,
            height: 50,
        };
    }

    draw(ctx, sheet) {
        super.draw(ctx, sheet);
        const whip = this.getAttackBounds();
        if (!whip) return;
        // Cables del latigazo
        const startX = this.facing === 1 ? whip.x : whip.x + whip.width;
        ['#e53935', '#1e88e5', '#fdd835', '#43a047'].forEach((color, i) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            for (let s = 0; s <= 12; s++) {
                const px = startX + this.facing * (s / 12) * whip.width;
                const py = whip.y + 12 + i * 8 + Math.sin(s * 0.9 + this.stateTime * 0.6 + i) * 8;
                if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        });
    }
}

// Minijefe del nivel 2: un bug enorme que embiste y salta para aplastar; a media vida llama a sus crías.
class BossBug extends Enemy {
    constructor(x, y) {
        super(x, y, {
            width: 90, height: 150, health: 24, scale: 0.6, score: 1500,
            anims: { walk: 'bug_walk', run: 'bug_run', attack: 'bug_attack', charge: 'bug_run', jump: 'bug_attack' },
            animSpeeds: { walk: 10, run: 4, attack: 8, charge: 4 },
        });
        this.isBoss = true;
        this.heavy = true;
        this.name = 'REY BUG';
        this.achievement = 'bossKing';
        this.phase = 1;
        this.cooldown = 90;
        this.actions = 0;
    }

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.phase === 1 && this.health <= this.maxHealth / 2) {
            this.phase = 2;
            game.announce('¡EL REY LLAMA A SU CORTE!');
            Sound.play('bossPhase');
        }

        if (this.state === 'attack') { // amago antes de embestir
            this.velocityX = 0;
            if (this.stateTime >= 30) this.setState('charge');
            return;
        }
        if (this.state === 'charge') {
            this.velocityX = 7 * this.facing;
            if (this.stateTime >= 45 || (this.onGround && !this.groundAhead(level.platforms))) this.endAction();
            return;
        }
        if (this.state === 'jump') {
            if (this.onGround && this.stateTime > 5) {
                // Aterrizaje: onda de choque si Freddy está en el suelo cerca
                game.triggerScreenShake(14);
                Sound.play('stomp');
                if (player.onGround && Math.abs(player.x - this.x) < 220) {
                    game.hurtPlayer(this.x + this.width / 2, true);
                }
                this.endAction();
            }
            return;
        }

        const dx = this.facePlayer(player);
        this.setState('walk');
        this.velocityX = (this.phase === 1 ? 1.3 : 1.9) * this.facing;
        if (this.onGround && !this.groundAhead(level.platforms)) this.velocityX = 0;
        if (this.cooldown > 0) return;

        this.actions++;
        if (this.phase === 2 && this.actions % 3 === 0 && game.enemies.filter(e => e.small && !e.dying).length < 4) {
            for (const side of [-1, 1]) game.spawnEnemy(new CodeBug(this.x + this.width / 2 + side * 50, this.y + 60, { small: true }));
            this.cooldown = 90;
        } else if (Math.abs(dx) > 250 || this.actions % 2) {
            this.setState('attack');
        } else {
            this.setState('jump');
            this.velocityY = -13;
            this.velocityX = Math.max(-5, Math.min(5, dx / 40));
        }
    }

    endAction() {
        this.setState('walk');
        this.velocityX = 0;
        this.cooldown = this.phase === 1 ? 90 : 60;
    }
}

// Minijefe del nivel 4: un 404 inestable que se teletransporta por la arena y dispara ráfagas
// de emojis malignos (rojos en la segunda fase).
class BossGlitch extends Error404 {
    constructor(x, y, opts = {}) {
        super(x, y, { health: 26, elite: false });
        this.width = 64;
        this.height = 110;
        this.scale = 0.45;
        this.score = 1800;
        this.isBoss = true;
        this.name = 'GLITCH 404';
        this.achievement = 'bossGlitch';
        this.arenaX = opts.arenaX || 0;
        this.phase = 1;
        this.cooldown = 60;
        this.burst = 0;
    }

    onHit() {}

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.phase === 1 && this.health <= this.maxHealth / 2) {
            this.phase = 2;
            game.announce('¡SE DUPLICA!');
            Sound.play('bossPhase');
            for (const side of [-1, 1]) game.spawnEnemy(new Error404(this.x + side * 120, this.baseY, { elite: true }));
        }
        if (this.state === 'glitch') return this.updateGlitch();

        this.floatPhase += 0.05;
        this.velocityY = this.baseY + Math.sin(this.floatPhase) * 12 - this.y;
        this.velocityX = 0;
        this.facePlayer(player);

        // Ráfaga: tres disparos seguidos tras cada teletransporte
        if (this.burst > 0 && this.stateTime % 10 === 0) {
            this.shoot(player, game, this.phase === 1 ? 1 : 2, 0.25, this.phase === 1 ? 'emoji' : 'emojiRed');
            this.burst--;
        }
        if (this.cooldown === 0) {
            const x = Math.max(this.arenaX + 40, Math.min(this.arenaX + 960 - this.width - 40,
                player.x + (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 120)));
            this.startGlitch(x, 220 + Math.random() * 220);
            this.burst = 3;
            this.cooldown = this.phase === 1 ? 110 : 75;
        }
    }
}

// Rival: otro personaje jugable como jefe. Camina hacia Freddy, pega puñetazos, tira papel y salta.
// Si es Dani, a veces embiste con el coche. sheet/carSheet llegan en opts desde el juego.
// Solo en arenas con suelo entero: no mira los bordes.
class BossRival extends Enemy {
    constructor(x, y, opts = {}) {
        const c = opts.character || {};
        super(x, y, {
            width: 56, height: 150, health: 22, scale: (c.scale || 0.4) * 1.36, score: 1500,
            anims: { walk: 'walk', run: 'run', attack: 'melee', throw: 'throw', jump: 'jump', ram: 'run', death: 'death' },
            animSpeeds: { walk: 9, run: 5, attack: 6, throw: 6 },
        });
        this.character = c;
        this.sheet = opts.sheet;
        this.carSheet = opts.carSheet;
        this.isBoss = true;
        this.heavy = true;
        this.name = `${(c.name || 'RIVAL').toUpperCase()} (RIVAL)`;
        this.achievement = 'bossRival';
        this.phase = 1;
        this.cooldown = 70;
        this.actions = 0;
    }

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.phase === 1 && this.health <= this.maxHealth / 2) {
            this.phase = 2;
            game.announce(`¡${this.character.name.toUpperCase()} SE ENFADA!`);
            Sound.play('bossPhase');
        }
        const fast = this.phase === 2;

        if (this.state === 'attack') {
            this.velocityX = 0;
            if (this.stateTime >= 24) this.endAction();
            return;
        }
        if (this.state === 'throw') {
            this.velocityX = 0;
            if (this.stateTime === 10) {
                for (const vy of fast ? [-1.5, 0, 1.5] : [0]) {
                    const px = this.facing === 1 ? this.x + this.width : this.x - PROJECTILE_TYPES.paper.width;
                    game.enemyProjectiles.push(new Projectile(px, this.y + 50, this.facing, 'paper', vy));
                }
                Sound.play('throw');
            }
            if (this.stateTime >= 20) this.endAction();
            return;
        }
        if (this.state === 'ram') {
            this.velocityX = 8 * this.facing;
            if (this.stateTime >= 50) this.endAction();
            return;
        }
        if (this.state === 'jump') {
            if (this.onGround && this.stateTime > 5) this.endAction();
            return;
        }

        const dx = this.facePlayer(player);
        this.setState('walk');
        // Las arenas tienen suelo entero: puede bajarse de las plataformas sin caer al vacío.
        this.velocityX = (fast ? 2.4 : 1.6) * this.facing;
        if (this.cooldown > 0) return;

        this.actions++;
        const rise = this.y + this.height - (player.y + player.height);
        if (Math.abs(dx) < 90) {
            this.setState('attack');
        } else if (this.character.car && this.actions % 3 === 0) {
            this.setState('ram');
            Sound.play('dash');
        } else if (rise > 60 && this.onGround) {
            this.setState('jump');
            this.velocityY = -14;
            this.velocityX = Math.max(-5, Math.min(5, dx / 30));
        } else {
            this.setState('throw');
        }
    }

    endAction() {
        this.setState('walk');
        this.velocityX = 0;
        this.cooldown = this.phase === 1 ? 70 : 45;
    }

    // Puñetazo: activo a mitad del golpe, por delante del rival.
    getAttackBounds() {
        if (this.state === 'ram') return this.getBounds();
        if (this.state !== 'attack' || this.stateTime < 8 || this.stateTime > 18) return null;
        return { x: this.facing === 1 ? this.x + this.width : this.x - 60, y: this.y + 30, width: 60, height: 60 };
    }

    draw(ctx) {
        if (this.state === 'ram' && !this.dying) {
            ctx.save();
            if (this.hitTimer > 0 && this.hitTimer % 4 < 2) ctx.globalAlpha = 0.5;
            this.carSheet.draw(ctx, 'drive', Math.floor(this.stateTime / 5), this.x + this.width / 2,
                this.y + this.height, CAR_SCALE * 1.36, this.facing);
            ctx.restore();
            return;
        }
        super.draw(ctx, this.sheet);
    }
}

const ENEMY_TYPES = { CodeBug, Error404, Boss404, BossSpider, BossBug, BossGlitch, BossRival };

if (typeof module !== 'undefined') module.exports = { Enemy, ENEMY_TYPES };
