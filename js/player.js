class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 108;
        this.baseHeight = 108;
        this.crouchHeight = 72;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 3.5;
        this.jumpForce = -12;
        this.onGround = false;
        this.facing = 1;
        this.lives = 3;
        this.score = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.crouching = false;

        this.state = 'idle';
        this.animFrame = 0;
        this.animTimer = 0;
        this.attackCooldown = 0;
        this.attackDuration = 0;

        this.projectiles = [];
        this.meleeSwing = null;
    }

    update(input, platforms) {
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
            this.invincible = this.invincibleTimer > 0;
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackDuration > 0) {
            this.attackDuration--;
            if (this.attackDuration === 0) {
                if (this.state === 'attack' || this.state === 'melee') {
                    this.state = 'idle';
                }
                this.meleeSwing = null;
            }
        }

        const wasCrouching = this.crouching;
        this.crouching = input.isDown('KeyS') && this.onGround;

        if (this.crouching) {
            if (!wasCrouching) {
                this.y += this.baseHeight - this.crouchHeight;
            }
            this.height = this.crouchHeight;
            this.state = 'crouch';

            if (input.isDown('KeyA')) {
                this.velocityX = -this.speed * 0.4;
                this.facing = -1;
            } else if (input.isDown('KeyD')) {
                this.velocityX = this.speed * 0.4;
                this.facing = 1;
            } else {
                this.velocityX = 0;
            }
        } else {
            if (wasCrouching) {
                this.y -= this.baseHeight - this.crouchHeight;
            }
            this.height = this.baseHeight;

            if (input.isDown('KeyA')) {
                this.velocityX = -this.speed;
                this.facing = -1;
                if (this.onGround) this.state = 'walk';
            } else if (input.isDown('KeyD')) {
                this.velocityX = this.speed;
                this.facing = 1;
                if (this.onGround) this.state = 'walk';
            } else {
                this.velocityX = 0;
                if (this.onGround && this.state !== 'attack' && this.state !== 'melee') {
                    this.state = 'idle';
                }
            }

            if (input.isDown('KeyW') && this.onGround) {
                this.velocityY = this.jumpForce;
                this.onGround = false;
                this.state = 'jump';
            }
        }

        if (input.isPressed('Space') || input.isPressed('KeyP')) {
            this.rangedAttack();
        }

        if (input.isPressed('KeyF')) {
            this.meleeAttack();
        }

        if (!this.onGround && this.state !== 'attack' && this.state !== 'melee') {
            this.state = 'jump';
        }

        this.velocityY += 0.5;
        this.x += this.velocityX;
        this.y += this.velocityY;

        Collision.checkPlatformCollisions(this, platforms);

        this.updateAnimation();

        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => p.active);

        if (this.meleeSwing) {
            this.meleeSwing.timer--;
            if (this.meleeSwing.timer <= 0) {
                this.meleeSwing = null;
            }
        }

        if (this.y > 800) {
            this.takeDamage(1);
            this.x = 100;
            this.y = 100;
            this.velocityY = 0;
        }
    }

    rangedAttack() {
        if (this.attackCooldown > 0 || this.crouching) return;

        this.state = 'attack';
        this.attackCooldown = 30;
        this.attackDuration = 18;

        const projX = this.facing === 1 ? this.x + this.width : this.x - 28;
        const projY = this.y + this.height / 2 - 14;
        this.projectiles.push(new Projectile(projX, projY, this.facing, 'paper'));
    }

    meleeAttack() {
        if (this.attackCooldown > 0) return;

        this.state = 'melee';
        this.attackCooldown = 30;
        this.attackDuration = 28;

        this.meleeSwing = {
            timer: 28,
            maxTimer: 28,
            facing: this.facing,
            pivotX: this.facing === 1 ? this.x + this.width - 5 : this.x + 5,
            pivotY: this.y + this.height * 0.35,
            length: 55,
            activeFrames: [4, 18]
        };
    }

    getMeleeBounds() {
        if (!this.meleeSwing) return null;

        const progress = 1 - (this.meleeSwing.timer / this.meleeSwing.maxTimer);
        const angle = -Math.PI * 0.75 + progress * Math.PI * 1.5;

        const tipX = this.meleeSwing.pivotX + Math.cos(angle) * this.meleeSwing.length * this.meleeSwing.facing;
        const tipY = this.meleeSwing.pivotY + Math.sin(angle) * this.meleeSwing.length;

        return {
            x: Math.min(this.meleeSwing.pivotX, tipX) - 15,
            y: Math.min(this.meleeSwing.pivotY, tipY) - 15,
            width: Math.abs(tipX - this.meleeSwing.pivotX) + 30,
            height: Math.abs(tipY - this.meleeSwing.pivotY) + 30
        };
    }

    updateAnimation() {
        this.animTimer++;
        let animSpeed;

        switch (this.state) {
            case 'walk':
                animSpeed = 10;
                break;
            case 'attack':
                animSpeed = 8;
                break;
            case 'melee':
                animSpeed = 6;
                break;
            case 'jump':
                animSpeed = 18;
                break;
            default:
                animSpeed = 14;
        }

        if (this.animTimer >= animSpeed) {
            this.animFrame++;
            this.animTimer = 0;
        }

        if (this.state === 'attack' && this.animFrame > 3) {
            this.animFrame = 0;
        }
        if (this.state === 'melee' && this.animFrame > 4) {
            this.animFrame = 0;
        }
    }

    takeDamage(amount) {
        if (this.invincible) return;

        this.lives -= amount;
        this.invincible = true;
        this.invincibleTimer = 60;
        this.state = 'hurt';
        this.velocityY = -6;

        if (this.lives <= 0) this.lives = 0;
    }

    draw(ctx, spriteParser) {
        this.projectiles.forEach(p => p.draw(ctx));

        ctx.save();

        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        const sprite = this.getSprite(this.state, this.animFrame, spriteParser);

        if (sprite) {
            if (this.facing === -1) {
                ctx.translate(this.x + this.width, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, 0, 0, this.width, this.height);
            } else {
                ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
            }
        } else {
            this.drawFallback(ctx);
        }

        ctx.restore();

        if (this.meleeSwing) {
            this.drawMeleeSwing(ctx);
        }
    }

    drawMeleeSwing(ctx) {
        const progress = 1 - (this.meleeSwing.timer / this.meleeSwing.maxTimer);
        const startAngle = -Math.PI * 0.75;
        const endAngle = Math.PI * 0.75;
        const currentAngle = startAngle + progress * (endAngle - startAngle);

        const pivotX = this.meleeSwing.pivotX;
        const pivotY = this.meleeSwing.pivotY;
        const length = this.meleeSwing.length;
        const facing = this.meleeSwing.facing;

        ctx.save();

        const arcTrail = [];
        for (let i = 0; i <= progress * 20; i++) {
            const t = i / 20;
            const angle = startAngle + t * (endAngle - startAngle);
            const px = pivotX + Math.cos(angle) * length * facing;
            const py = pivotY + Math.sin(angle) * length;
            arcTrail.push({ x: px, y: py });
        }

        if (arcTrail.length > 1) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(arcTrail[0].x, arcTrail[0].y);
            for (let i = 1; i < arcTrail.length; i++) {
                ctx.lineTo(arcTrail[i].x, arcTrail[i].y);
            }
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(arcTrail[0].x, arcTrail[0].y);
            for (let i = 1; i < arcTrail.length; i++) {
                ctx.lineTo(arcTrail[i].x, arcTrail[i].y);
            }
            ctx.stroke();
        }

        const tipX = pivotX + Math.cos(currentAngle) * length * facing;
        const tipY = pivotY + Math.sin(currentAngle) * length;

        const handleLen = 22;
        const handleEndX = pivotX + Math.cos(currentAngle) * handleLen * facing;
        const handleEndY = pivotY + Math.sin(currentAngle) * handleLen;

        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(handleEndX, handleEndY);
        ctx.stroke();

        ctx.strokeStyle = '#6B3410';
        ctx.lineWidth = 6;
        ctx.beginPath();
        const gripStart = pivotX + Math.cos(currentAngle) * 8 * facing;
        const gripEnd = pivotY + Math.sin(currentAngle) * 8;
        const gripEnd2X = pivotX + Math.cos(currentAngle) * 16 * facing;
        const gripEnd2Y = pivotY + Math.sin(currentAngle) * 16;
        ctx.moveTo(gripStart, gripEnd);
        ctx.lineTo(gripEnd2X, gripEnd2Y);
        ctx.stroke();

        const cupCenterX = tipX;
        const cupCenterY = tipY;

        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.ellipse(cupCenterX, cupCenterY, 16, 10, currentAngle + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(cupCenterX - 3 * facing, cupCenterY - 2, 7, 4, currentAngle + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#922b21';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cupCenterX, cupCenterY, 16, 10, currentAngle + Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    getSprite(state, frame, spriteParser) {
        if (!spriteParser) return null;

        const spriteMap = {
            'idle': 'idle',
            'walk': 'walk',
            'jump': 'jump',
            'attack': 'attack',
            'melee': 'melee',
            'crouch': 'crouch',
            'hurt': 'hurt',
            'victory': 'victory'
        };

        const spriteName = spriteMap[state];
        if (spriteName) {
            return spriteParser.getSprite(spriteName, frame);
        }
        return null;
    }

    drawFallback(ctx) {
        ctx.fillStyle = '#4a90d9';
        ctx.beginPath();
        ctx.roundRect(0, 0, this.width, this.height, 8);
        ctx.fill();

        ctx.fillStyle = '#f4c28b';
        ctx.beginPath();
        ctx.arc(this.width / 2, 16, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.width / 2 - 5, 14, 4, 0, Math.PI * 2);
        ctx.arc(this.width / 2 + 5, 14, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.width / 2 - 5, 14, 2, 0, Math.PI * 2);
        ctx.arc(this.width / 2 + 5, 14, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.state === 'hurt') {
            ctx.arc(this.width / 2, 24, 5, Math.PI, 0);
        } else {
            ctx.arc(this.width / 2, 22, 5, 0, Math.PI);
        }
        ctx.stroke();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
