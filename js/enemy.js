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
        return false;
    }

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

        const maxX = level.width - this.width;
        if (this.x < 0 || this.x > maxX) {
            this.x = Math.max(0, Math.min(maxX, this.x));
            this.facing = this.x <= 0 ? 1 : -1;
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
    shoot(player, game, count = 1, spread = 0.3) {
        const size = PROJECTILE_TYPES.pixel.width;
        const sx = this.x + this.width / 2;
        const sy = this.y + this.height * 0.45;
        const base = Math.atan2(player.y + player.height / 2 - sy, player.x + player.width / 2 - sx);
        for (let i = 0; i < count; i++) {
            const a = base + (i - (count - 1) / 2) * spread;
            game.enemyProjectiles.push(new Projectile(
                sx - size / 2, sy - size / 2, Math.cos(a), 'pixel', Math.sin(a) * PROJECTILE_TYPES.pixel.speed
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
class CodeBug extends Enemy {
    constructor(x, y, opts = {}) {
        super(x, y, {
            width: 40, height: 72, health: opts.health || 2, scale: 0.3, score: 100, elite: opts.elite,
            anims: { walk: 'bug_walk', run: 'bug_run', attack: 'bug_attack' },
            animSpeeds: { walk: 10, run: 5, attack: 9 },
        });
        this.speedMul = this.elite ? 1.4 : 1;
    }

    think(player, level) {
        if (this.cooldown > 0) this.cooldown--;
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
            anims: { walk: 'e404_idle', throw: 'e404_throw', steal: 'e404_steal', death: 'e404_death' },
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

    think(player, level, game) {
        if (this.cooldown > 0) this.cooldown--;
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
            this.setState('walk');
            game.spawnText(this.x + this.width / 2, this.y, '¡ROBADO!');
            Sound.play('steal');
        }
        return true;
    }

    draw(ctx, sheet) {
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
            this.setState(this.phase === 2 && Math.abs(dx) < 230 ? 'whip' : 'spit');
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

const ENEMY_TYPES = { CodeBug, Error404, Boss404, BossSpider };

if (typeof module !== 'undefined') module.exports = { Enemy, ENEMY_TYPES };
