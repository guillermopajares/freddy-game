// Estados que se reproducen una vez y se quedan en el último frame.
const ONE_SHOT = new Set(['attack', 'throw', 'spit', 'whip', 'transform', 'death']);

class Enemy {
    constructor(x, y, opts) {
        this.x = x;
        this.y = y;
        this.width = opts.width;
        this.height = opts.height;
        this.health = opts.health;
        this.maxHealth = opts.health;
        this.scale = opts.scale;
        this.anims = opts.anims;
        this.animSpeeds = opts.animSpeeds || {};
        this.score = opts.score;
        this.damage = 1;

        this.velocityX = 0;
        this.velocityY = 0;
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
        this.mirror = true; // false = de frente, no se voltea (el texto 404 saldría al revés)
    }

    setState(state) {
        if (this.state !== state) {
            this.state = state;
            this.stateTime = 0;
        }
    }

    // Devuelve true si el golpe lo mata.
    takeDamage(amount) {
        if (this.dying) return false;
        this.health -= amount;
        this.hitTimer = 12;
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

    update(player, platforms, game) {
        this.stateTime++;
        if (this.hitTimer > 0) this.hitTimer--;

        if (this.dying) {
            if (this.stateTime > (this.isBoss ? 150 : 60)) this.markedForDeletion = true;
        } else if (this.stun > 0) {
            this.stun--;
            this.velocityX = 0;
            if (!this.gravity) this.velocityY = 0;
        } else {
            this.think(player, platforms, game);
        }

        const wantedX = this.velocityX;
        if (this.gravity) this.velocityY += 0.5;
        this.x += this.velocityX;
        this.y += this.velocityY;
        if (this.gravity) {
            Collision.checkPlatformCollisions(this, platforms);
            if (this.ground && this.ground.vx) this.x += this.ground.vx;
        }
        if (wantedX !== 0 && this.velocityX === 0) this.facing = -this.facing; // pared

        if (this.x < 0 || this.x > 960 - this.width) {
            this.x = Math.max(0, Math.min(960 - this.width, this.x));
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
    }

    getFrame(sheet) {
        const name = this.anims[this.state] || this.anims.walk;
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
            width: 40, height: 72, health: opts.health || 2, scale: 0.3, score: 100,
            anims: { walk: 'bug_walk', run: 'bug_run', attack: 'bug_attack' },
            animSpeeds: { walk: 10, run: 5, attack: 9 },
        });
    }

    think(player, platforms) {
        if (this.cooldown > 0) this.cooldown--;
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const sameLevel = Math.abs(player.y + player.height - (this.y + this.height)) < 50;

        if (this.state === 'attack') {
            this.velocityX = this.stateTime > 18 ? 4.5 * this.facing : 0; // amago y embestida
            if (this.stateTime >= 36) {
                this.setState('walk');
                this.cooldown = 60;
            }
        } else if (sameLevel && Math.abs(dx) < 90 && this.cooldown === 0) {
            this.facePlayer(player);
            this.setState('attack');
            this.velocityX = 0;
        } else if (sameLevel && Math.abs(dx) < 280) {
            this.facePlayer(player);
            this.setState('run');
            this.velocityX = 2.2 * this.facing;
        } else {
            this.setState('walk');
            this.velocityX = this.facing;
        }

        if (this.onGround && !this.groundAhead(platforms)) {
            if (this.state === 'walk') this.facing = -this.facing;
            this.velocityX = 0;
        }
    }
}

// Flota y lanza píxeles muertos apuntados a Freddy.
class Error404 extends Enemy {
    constructor(x, y, opts = {}) {
        super(x, y, {
            width: 44, height: 72, health: opts.health || 2, scale: 0.3, score: 150,
            anims: { walk: 'e404_idle', throw: 'e404_throw', death: 'e404_death' },
            animSpeeds: { walk: 12, throw: 12, death: 20 },
        });
        this.gravity = false;
        this.mirror = false;
        this.baseY = y;
        this.floatPhase = Math.random() * Math.PI * 2;
        this.range = opts.range || 320;
        this.cooldown = 60 + Math.floor(Math.random() * 60);
    }

    think(player, platforms, game) {
        if (this.cooldown > 0) this.cooldown--;
        this.floatPhase += 0.05;
        this.velocityY = this.baseY + Math.sin(this.floatPhase) * 16 - this.y;
        const dx = this.facePlayer(player);

        if (this.state === 'throw') {
            this.velocityX = 0;
            if (this.stateTime === 12) this.shoot(player, game);
            if (this.stateTime >= 24) this.setState('walk');
        } else if (Math.hypot(dx, player.y - this.y) < this.range) {
            this.velocityX = Math.abs(dx) > 120 ? 0.8 * this.facing : 0;
            if (this.cooldown === 0) {
                this.setState('throw');
                this.cooldown = 140;
            }
        } else {
            this.velocityX = 0;
        }
    }
}

// Jefe del nivel 3: barre la pantalla por arriba disparando abanicos; a media vida invoca bugs.
class Boss404 extends Error404 {
    constructor(x, y) {
        super(x, y, { health: 30 });
        this.width = 100;
        this.height = 170;
        this.scale = 0.7;
        this.score = 2000;
        this.isBoss = true;
        this.name = 'ERROR 404 GIGANTE';
        this.phase = 1;
        this.sweep = 0;
        this.cooldown = 90;
    }

    think(player, platforms, game) {
        if (this.cooldown > 0) this.cooldown--;
        if (this.phase === 1 && this.health <= this.maxHealth / 2) {
            this.phase = 2;
            game.announce('¡ERROR 404 SE CABREA!');
            game.spawnEnemy(new CodeBug(60, 100));
            game.spawnEnemy(new CodeBug(860, 100));
        }

        this.sweep += this.phase === 1 ? 0.01 : 0.017;
        const targetX = 480 - this.width / 2 + Math.sin(this.sweep) * 340;
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
        this.name = 'BUG ARAÑA';
        this.phase = 1;
        this.cooldown = 90;
    }

    think(player, platforms, game) {
        if (this.cooldown > 0) this.cooldown--;

        if (this.phase === 1 && this.health <= this.maxHealth / 2 && this.state !== 'transform') {
            this.setState('transform');
            game.announce('¡SE CONVIERTE EN CÓDIGO ESPAGUETI!');
            game.triggerScreenShake(14);
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
        if (this.onGround && !this.groundAhead(platforms)) this.velocityX = 0;
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
