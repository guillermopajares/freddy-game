const PLAYER_SCALE = 0.4;
const CHARGE_TIME = 45; // frames manteniendo el disparo para el rollo gigante
const ANIM_SPEED = { idle: 30, walk: 7, run: 4 };

class Player {
    constructor(x, y, stats = {}) {
        this.spawnX = x;
        this.spawnY = y;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 108;
        this.baseHeight = 108;
        this.crouchHeight = 80;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 3.5;
        this.jumpForce = -12;
        this.onGround = false;
        this.ground = null;
        this.facing = 1;

        this.lives = stats.lives ?? 3;
        this.score = stats.score ?? 0;
        this.ammo = stats.ammo ?? 10;
        this.maxAmmo = 20;

        this.invincibleTimer = 0;
        this.crouching = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashSpeed = 9;
        this.wallJumpLockout = 0;
        this.touchingWall = 0;
        this.maxJumps = 2;
        this.jumpsLeft = 2;

        this.attackCooldown = 0;
        this.action = null; // { name: 'throw' | 'melee' | 'hurt', timer, duration }
        this.charge = 0;
        this.meleeHits = new Set();
        this.projectiles = [];
        this.dead = false;
        this.deathTimer = 0;
        this.tick = 0;
    }

    get invincible() {
        return this.invincibleTimer > 0 || this.dashTimer > 0 || this.dead;
    }

    update(input, platforms) {
        this.tick++;
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.action && --this.action.timer <= 0) this.action = null;

        if (this.dead) {
            this.deathTimer++;
            this.velocityX *= 0.9;
        } else {
            this.handleInput(input);
        }

        this.velocityY += 0.5;
        this.x += this.velocityX;
        this.y += this.velocityY;
        Collision.checkPlatformCollisions(this, platforms);
        if (this.ground && this.ground.vx) this.x += this.ground.vx;
        this.x = Math.max(0, Math.min(960 - this.width, this.x));

        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => p.active);

        if (this.y > 760 && !this.dead) {
            this.invincibleTimer = 0;
            this.dashTimer = 0;
            this.takeDamage(1, this.x);
            if (!this.dead) {
                this.x = this.spawnX;
                this.y = this.spawnY;
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }
    }

    handleInput(input) {
        const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
        const right = input.isDown('KeyD') || input.isDown('ArrowRight');
        const down = input.isDown('KeyS') || input.isDown('ArrowDown');
        const hurt = this.action && this.action.name === 'hurt';

        const crouch = down && this.onGround && !hurt;
        if (crouch !== this.crouching) {
            const dh = this.baseHeight - this.crouchHeight;
            this.y += crouch ? dh : -dh;
            this.height = crouch ? this.crouchHeight : this.baseHeight;
            this.crouching = crouch;
        }

        if ((input.isPressed('ShiftLeft') || input.isPressed('ShiftRight')) && this.dashCooldown === 0 && !crouch && !hurt) {
            this.dashTimer = 14;
            this.dashCooldown = 50;
        }

        if (this.dashTimer > 0) {
            this.dashTimer--;
            this.velocityX = this.dashSpeed * this.facing;
            this.velocityY = 0;
        } else if (hurt) {
            this.velocityX *= 0.92;
        } else if (this.wallJumpLockout > 0) {
            this.wallJumpLockout--;
        } else if (crouch) {
            this.velocityX = 0;
        } else {
            const dir = (right ? 1 : 0) - (left ? 1 : 0);
            const speed = this.charge > 0 ? this.speed * 0.6 : this.speed;
            if (dir) {
                this.velocityX = dir * speed;
                this.facing = dir;
            } else if (this.onGround) {
                this.velocityX = 0;
            } else {
                this.velocityX *= 0.9;
                if (Math.abs(this.velocityX) < 0.5) this.velocityX = 0;
            }
        }

        if (hurt) return;

        // Caída rápida
        if (!this.onGround && (input.isPressed('KeyS') || input.isPressed('ArrowDown'))) {
            this.velocityY = 15;
        }

        if (input.isPressed('KeyW') || input.isPressed('ArrowUp')) {
            if (this.onGround) {
                this.velocityY = this.jumpForce;
                this.onGround = false;
                this.jumpsLeft = this.maxJumps - 1;
            } else if (this.touchingWall !== 0) {
                this.velocityY = this.jumpForce * 0.9;
                this.velocityX = -this.touchingWall * this.speed * 1.5;
                this.wallJumpLockout = 15;
                this.facing = -this.touchingWall;
                this.jumpsLeft = this.maxJumps - 1;
            } else if (this.jumpsLeft > 0) {
                this.velocityY = this.jumpForce * 0.8;
                this.jumpsLeft--;
            }
        }

        // Papel: pulsar = rollo normal; mantener CHARGE_TIME frames = rollo gigante que atraviesa.
        const fireHeld = input.isDown('Space') || input.isDown('KeyP');
        const firePressed = input.isPressed('Space') || input.isPressed('KeyP');
        if ((fireHeld || firePressed) && this.ammo > 0 && this.attackCooldown === 0) {
            this.charge++;
        }
        if (!fireHeld && this.charge > 0) {
            this.throwPaper(this.charge >= CHARGE_TIME);
            this.charge = 0;
        }

        if (input.isPressed('KeyF') && this.attackCooldown === 0) {
            this.charge = 0;
            this.attackCooldown = 26;
            this.action = { name: 'melee', timer: 22, duration: 22 };
            this.meleeHits.clear();
        }
    }

    throwPaper(big) {
        const cost = big ? 3 : 1;
        if (this.ammo < cost) big = false;
        this.ammo -= big ? 3 : 1;
        this.attackCooldown = big ? 30 : 16;
        this.action = { name: 'throw', timer: 14, duration: 14 };

        const size = big ? PROJECTILE_TYPES.paperBig.width : PROJECTILE_TYPES.paper.width;
        const projX = this.facing === 1 ? this.x + this.width : this.x - size;
        const projY = this.y + this.height * 0.55 - size / 2;
        this.projectiles.push(new Projectile(projX, projY, this.facing, big ? 'paperBig' : 'paper'));
    }

    // Golpe del desatascador: activo en la parte central del swing, por delante de Freddy.
    getMeleeBounds() {
        if (!this.action || this.action.name !== 'melee') return null;
        const progress = 1 - this.action.timer / this.action.duration;
        if (progress < 0.25 || progress > 0.85) return null;
        const reach = 75;
        return {
            x: this.facing === 1 ? this.x + this.width - 5 : this.x - reach + 5,
            y: this.y + 20,
            width: reach,
            height: this.height - 20,
        };
    }

    // Devuelve true si el golpe ha entrado.
    takeDamage(amount, fromX) {
        if (this.invincible) return false;

        this.lives = Math.max(0, this.lives - amount);
        this.invincibleTimer = 90;
        this.charge = 0;
        this.dashTimer = 0;
        this.action = { name: 'hurt', timer: 24, duration: 24 };
        this.velocityX = (this.x + this.width / 2 < fromX ? -1 : 1) * 5;
        this.velocityY = -6;

        if (this.lives === 0) {
            this.dead = true;
            this.action = null;
        }
        return true;
    }

    getAnimation() {
        if (this.dead) return this.deathTimer < 30 ? 'knock' : 'death';
        if (this.charge > 0) return 'throw';
        if (this.action) return this.action.name;
        if (this.dashTimer > 0) return 'run';
        if (this.crouching) return 'crouch';
        if (!this.onGround) return this.velocityY < 0 ? 'jump' : 'fall';
        if (this.velocityX !== 0) return 'walk';
        return 'idle';
    }

    draw(ctx, sheet) {
        this.projectiles.forEach(p => p.draw(ctx));

        const name = this.getAnimation();
        const count = sheet.count(name) || 1;
        let frame;
        if (this.charge > 0) {
            frame = 0;
        } else if (this.action) {
            const progress = 1 - this.action.timer / this.action.duration;
            frame = Math.min(count - 1, Math.floor(progress * count));
        } else {
            frame = Math.floor(this.tick / (ANIM_SPEED[name] || 10)) % count;
        }

        ctx.save();
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
            ctx.globalAlpha = 0.45;
        }
        if (this.dashTimer > 0) {
            ctx.globalAlpha = 0.25;
            sheet.draw(ctx, name, frame, this.x + this.width / 2 - this.facing * 24, this.y + this.height, PLAYER_SCALE, this.facing);
            ctx.globalAlpha = 1;
        }
        sheet.draw(ctx, name, frame, this.x + this.width / 2, this.y + this.height, PLAYER_SCALE, this.facing);
        ctx.restore();

        if (this.charge > 0) this.drawChargeMeter(ctx);
    }

    drawChargeMeter(ctx) {
        const t = Math.min(1, this.charge / CHARGE_TIME);
        const cx = this.x + this.width / 2;
        const cy = this.y - 14;
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = t >= 1 && Math.floor(this.tick / 4) % 2 ? '#fff' : '#7fdbff';
        ctx.beginPath();
        ctx.arc(cx, cy, 9, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
