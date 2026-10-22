const PLAYER_SCALE = 0.4;
const CHARGE_TIME = 45; // frames manteniendo el disparo para el rollo gigante
const POWER_TIME = 900; // 15 s de desatascador dorado / papel triple
const ANIM_SPEED = { idle: 30, walk: 7, run: 4 };
const CAR_SCALE = 0.22;
const RAM_TIME = 40; // la embestida en coche dura más que el dash y hace daño
const COYOTE_TIME = 6; // frames tras salir de un borde en los que aún se puede saltar
const JUMP_BUFFER = 8; // frames que se recuerda un salto pulsado justo antes de aterrizar
const JUMP_CUT = -4; // soltar el salto mientras sube lo corta: salto corto
const ULT_MAX = 100; // barra de la ulti: se llena matando enemigos y recogiendo monedas y estrellas
const ULT_TIME = 600; // 10 s transformado

class Player {
    // stats.character: entrada de CHARACTERS (sin ella, Freddy).
    constructor(x, y, stats = {}) {
        this.character = stats.character || {};
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
        this.speed = this.character.speed ?? 3.5;
        this.jumpForce = this.character.jumpForce ?? -12;
        this.onGround = false;
        this.ground = null;
        this.facing = 1;

        this.lives = stats.lives ?? 3;
        this.score = stats.score ?? 0;
        this.ammo = stats.ammo ?? 10;
        this.maxAmmo = 20;
        this.powers = { triple: 0, gold: 0, turbo: 0 };
        this.shield = false;

        this.invincibleTimer = 0;
        this.crouching = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.dashSpeed = 9;
        this.wallJumpLockout = 0;
        this.touchingWall = 0;
        this.maxJumps = this.character.jumps ?? 2;
        this.jumpsLeft = this.maxJumps;
        this.ultimate = 0; // carga de la barra (0-ULT_MAX); solo si el personaje tiene ulti
        this.ultTimer = 0;
        this.transformed = false; // se ha transformado este frame (el juego pone el efecto)
        this.coyote = 0;
        this.jumpBuffer = 0;
        this.jumpHeld = false; // salto iniciado por el jugador que aún se puede cortar

        this.attackCooldown = 0;
        this.action = null; // { name: 'throw' | 'melee' | 'hurt' | 'downed' | 'land', timer, duration }
        this.charge = 0;
        this.meleeHits = new Set();
        this.projectiles = [];
        this.landed = false; // aterrizaje fuerte este frame (el juego pone polvo y sonido)
        this.respawned = false; // ha caído al vacío y reaparecido este frame
        this.hitsTaken = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.tick = 0;
    }

    get invincible() {
        return this.invincibleTimer > 0 || this.dashTimer > 0 || this.dead;
    }

    // Derribado o dolorido: sin control.
    get stunned() {
        return this.action && (this.action.name === 'hurt' || this.action.name === 'downed');
    }

    // Personaje con la ulti aplicada encima mientras dura.
    get form() {
        return this.ultTimer > 0 ? { ...this.character, ...this.character.ultimate } : this.character;
    }

    get meleeDamage() {
        return (this.powers.gold > 0 ? 3 : 2) + (this.form.punch || 0);
    }

    // Dani: su dash es una embestida en coche que daña a lo que atropella.
    get ramming() {
        return this.form.car && this.dashTimer > 0;
    }

    addUltimate(amount) {
        if (this.character.ultimate && this.ultTimer === 0) this.ultimate = Math.min(ULT_MAX, this.ultimate + amount);
    }

    // Velocidad, salto y saltos en el aire del personaje (o de su ulti).
    applyForm() {
        const f = this.form;
        this.speed = f.speed ?? 3.5;
        this.jumpForce = f.jumpForce ?? -12;
        this.maxJumps = f.jumps ?? 2;
    }

    update(input, level) {
        this.tick++;
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.powers.triple > 0) this.powers.triple--;
        if (this.powers.gold > 0) this.powers.gold--;
        if (this.powers.turbo > 0) this.powers.turbo--;
        if (this.ultTimer > 0 && --this.ultTimer === 0) this.applyForm();
        this.transformed = false;
        if (this.action && --this.action.timer <= 0) this.action = null;

        if (this.dead) {
            this.deathTimer++;
            this.velocityX *= 0.9;
        } else {
            this.handleInput(input, level.platforms);
        }

        const wasOnGround = this.onGround;
        this.velocityY += 0.5;
        const fallSpeed = this.velocityY;
        this.x += this.velocityX;
        this.y += this.velocityY;
        Collision.checkPlatformCollisions(this, level.platforms);
        if (this.ground && this.ground.vx) this.x += this.ground.vx;
        this.x = Math.max(level.leftWall, Math.min(level.width - this.width, this.x));

        this.landed = this.onGround && !wasOnGround && fallSpeed > 9;
        this.respawned = false;
        if (this.landed && !this.action && !this.dead) this.action = { name: 'land', timer: 8, duration: 8 };

        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => p.active);

        if (this.y > 760 && !this.dead) {
            this.invincibleTimer = 0;
            this.dashTimer = 0;
            this.shield = false;
            this.takeDamage(1, this.x);
            if (!this.dead) {
                this.x = this.spawnX;
                this.y = this.spawnY;
                this.velocityX = 0;
                this.velocityY = 0;
                this.respawned = true;
            }
        }
    }

    handleInput(input, platforms) {
        const left = input.isDown('left');
        const right = input.isDown('right');
        const down = input.isDown('down');
        const stunned = this.stunned;

        let crouch = down && this.onGround && !stunned;
        const dh = this.baseHeight - this.crouchHeight;
        if (!crouch && this.crouching) {
            // No levantarse si hay suelo sólido encima de la cabeza
            const standing = { x: this.x, y: this.y - dh, width: this.width, height: this.baseHeight };
            if (platforms.some(p => p.ground && Collision.aabb(standing, p))) crouch = true;
        }
        if (crouch !== this.crouching) {
            this.y += crouch ? dh : -dh;
            this.height = crouch ? this.crouchHeight : this.baseHeight;
            this.crouching = crouch;
        }

        if (input.isPressed('ultimate') && this.ultimate >= ULT_MAX && !stunned) {
            this.ultimate = 0;
            this.ultTimer = ULT_TIME;
            this.transformed = true;
            this.applyForm();
            Sound.play('ultimate');
        }

        const car = this.form.car;
        if (input.isPressed('dash') && this.dashCooldown === 0 && !crouch && !stunned) {
            this.dashTimer = car ? RAM_TIME : this.form.dash ? 22 : 14;
            this.dashCooldown = car ? 90 : this.form.dash ? 36 : 50;
            this.meleeHits.clear();
            Sound.play('dash');
        }

        if (this.dashTimer > 0) {
            this.dashTimer--;
            this.velocityX = this.dashSpeed * this.facing;
            if (!car) this.velocityY = 0; // el coche no vuela: cae por los huecos
        } else if (stunned) {
            this.velocityX *= 0.92;
        } else if (this.wallJumpLockout > 0) {
            this.wallJumpLockout--;
        } else {
            const dir = (right ? 1 : 0) - (left ? 1 : 0);
            let speed = this.charge > 0 ? this.speed * 0.6 : this.speed;
            if (this.powers.turbo > 0) speed *= 1.3;
            if (crouch) speed *= 0.5; // andar agachado
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

        if (stunned) return;

        // Caída rápida
        if (!this.onGround && input.isPressed('down')) {
            this.velocityY = 15;
        }

        // Salto que perdona: vale unos frames después de salir del borde (coyote) y se recuerda si
        // se pulsa justo antes de aterrizar (buffer). Soltarlo mientras sube da un salto corto.
        this.coyote = this.onGround ? COYOTE_TIME : Math.max(0, this.coyote - 1);
        const jumpPressed = input.isPressed('jump');
        const jumpForce = this.powers.turbo > 0 ? this.jumpForce * 1.12 : this.jumpForce;
        this.jumpBuffer = jumpPressed ? JUMP_BUFFER : Math.max(0, this.jumpBuffer - 1);
        if (this.jumpBuffer > 0 && this.coyote > 0) {
            this.velocityY = jumpForce;
            this.onGround = false;
            this.coyote = 0;
            this.jumpBuffer = 0;
            this.jumpsLeft = this.maxJumps - 1;
            this.jumpHeld = true;
            Sound.play('jump');
        } else if (jumpPressed && this.touchingWall !== 0) {
            this.velocityY = jumpForce * 0.9;
            this.velocityX = -this.touchingWall * this.speed * 1.5;
            this.wallJumpLockout = 15;
            this.facing = -this.touchingWall;
            this.jumpsLeft = this.maxJumps - 1;
            this.jumpBuffer = 0;
            this.jumpHeld = true;
            Sound.play('jump');
        } else if (jumpPressed && this.jumpsLeft > 0) {
            this.velocityY = jumpForce * 0.8;
            this.jumpsLeft--;
            this.jumpBuffer = 0;
            this.jumpHeld = true;
            Sound.play('doubleJump');
        }
        if (this.velocityY >= 0) this.jumpHeld = false;
        if (this.jumpHeld && !input.isDown('jump') && this.velocityY < JUMP_CUT) {
            this.velocityY = JUMP_CUT;
            this.jumpHeld = false;
        }

        // Papel: pulsar = rollo normal; mantener CHARGE_TIME frames = rollo gigante que atraviesa.
        const fireHeld = input.isDown('fire');
        const firePressed = input.isPressed('fire');
        if ((fireHeld || firePressed) && this.ammo > 0 && this.attackCooldown === 0) {
            this.charge++;
        }
        if (!fireHeld && this.charge > 0) {
            this.throwPaper(this.charge >= CHARGE_TIME);
            this.charge = 0;
        }

        if (input.isPressed('melee') && this.attackCooldown === 0) {
            this.charge = 0;
            this.attackCooldown = 26;
            this.action = { name: 'melee', timer: 22, duration: 22 };
            this.meleeHits.clear();
            Sound.play('melee');
        }
    }

    throwPaper(big) {
        if (this.ammo < 3) big = false;
        this.ammo -= big ? 3 : 1;
        this.attackCooldown = big ? 30 : 16;
        this.action = { name: 'throw', timer: 14, duration: 14 };
        Sound.play(big ? 'throwBig' : 'throw');

        const size = big ? PROJECTILE_TYPES.paperBig.width : PROJECTILE_TYPES.paper.width;
        const projX = this.facing === 1 ? this.x + this.width : this.x - size;
        const projY = this.y + this.height * 0.55 - size / 2;
        const spread = !big && this.powers.triple > 0 ? [-2.5, 0, 2.5] : [0];
        spread.forEach(vy => {
            this.projectiles.push(new Projectile(projX, projY, this.facing, big ? 'paperBig' : 'paper', vy));
        });
    }

    // Golpe del desatascador: activo en la parte central del swing, por delante de Freddy.
    getMeleeBounds() {
        if (!this.action || this.action.name !== 'melee') return null;
        const progress = 1 - this.action.timer / this.action.duration;
        if (progress < 0.25 || progress > 0.85) return null;
        const reach = (this.powers.gold > 0 ? 110 : 75) + (this.form.reach || 0);
        return {
            x: this.facing === 1 ? this.x + this.width - 5 : this.x - reach + 5,
            y: this.y + 20,
            width: reach,
            height: this.height - 20,
        };
    }

    // heavy = golpe de jefe: Freddy acaba derribado en el barro. Devuelve true si el golpe ha entrado.
    takeDamage(amount, fromX, heavy = false) {
        if (this.invincible) return false;

        const dir = this.x + this.width / 2 < fromX ? -1 : 1;
        this.charge = 0;
        this.dashTimer = 0;

        if (this.shield) {
            this.shield = false;
            this.invincibleTimer = 60;
            this.velocityX = dir * 4;
            Sound.play('shield');
            return false;
        }

        this.lives = Math.max(0, this.lives - amount);
        this.hitsTaken++;
        this.invincibleTimer = heavy ? 110 : 90;
        this.action = heavy ? { name: 'downed', timer: 50, duration: 50 } : { name: 'hurt', timer: 24, duration: 24 };
        this.velocityX = dir * (heavy ? 3 : 5);
        this.velocityY = heavy ? -4 : -6;
        Sound.play('hurt');

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

    // carSheet: hoja del coche de Dani (solo se usa mientras embiste).
    draw(ctx, sheet, carSheet) {
        this.projectiles.forEach(p => p.draw(ctx));
        const scale = this.form.scale || PLAYER_SCALE;

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

        const cx = this.x + this.width / 2;
        const bottom = this.y + this.height;
        ctx.save();
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
            ctx.globalAlpha = 0.45;
        }
        if (this.ramming) {
            const crash = this.meleeHits.size > 0;
            carSheet.draw(ctx, crash ? 'crash' : 'drive', Math.floor(this.tick / 5), cx, bottom, CAR_SCALE, this.facing);
            ctx.restore();
            return;
        }
        if (this.dashTimer > 0) {
            ctx.globalAlpha = 0.25;
            sheet.draw(ctx, name, frame, cx - this.facing * 24, bottom, scale, this.facing);
            ctx.globalAlpha = 1;
        }
        if (this.powers.gold > 0 && name === 'melee') {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 18;
        } else if (this.ultTimer > 0) {
            // Aura de la ulti; parpadea los dos últimos segundos para avisar de que se acaba
            ctx.shadowColor = this.ultTimer > 120 || Math.floor(this.ultTimer / 6) % 2 ? '#e53935' : '#1e88e5';
            ctx.shadowBlur = 16;
        }
        sheet.draw(ctx, name, frame, cx, bottom, scale, this.facing);
        ctx.restore();

        if (this.shield) {
            ctx.save();
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.7)';
            ctx.fillStyle = 'rgba(100, 200, 255, 0.12)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(cx, this.y + this.height / 2, 38, this.height / 2 + 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

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

if (typeof module !== 'undefined') {
    module.exports = Player;
    module.exports.ULT_MAX = ULT_MAX;
}
