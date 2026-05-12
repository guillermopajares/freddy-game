class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 108;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpForce = -14;
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
    }

    update(input, platforms) {
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
            this.invincible = this.invincibleTimer > 0;
        }

        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackDuration > 0) {
            this.attackDuration--;
            if (this.attackDuration === 0 && this.state === 'attack') {
                this.state = 'idle';
            }
        }

        this.crouching = input.isDown('KeyS') && this.onGround;

        if (this.crouching) {
            this.state = 'crouch';
            this.velocityX = 0;
            this.height = 72;
        } else {
            this.height = 108;

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
                if (this.onGround && this.state !== 'attack') this.state = 'idle';
            }

            if (input.isDown('KeyW') && this.onGround) {
                this.velocityY = this.jumpForce;
                this.onGround = false;
                this.state = 'jump';
            }
        }

        if (input.isPressed('Space') && this.attackCooldown === 0 && !this.crouching) {
            this.attack();
        }

        if (!this.onGround && this.state !== 'attack') {
            this.state = 'jump';
        }

        this.velocityY += 0.6;
        this.x += this.velocityX;
        this.y += this.velocityY;

        Collision.checkPlatformCollisions(this, platforms);

        this.updateAnimation();

        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => p.active);

        if (this.y > 800) {
            this.takeDamage(1);
            this.x = 100;
            this.y = 100;
            this.velocityY = 0;
        }
    }

    attack() {
        this.state = 'attack';
        this.attackCooldown = 30;
        this.attackDuration = 15;

        const projX = this.facing === 1 ? this.x + this.width : this.x - 32;
        const projY = this.y + this.height / 2 - 16;
        this.projectiles.push(new Projectile(projX, projY, this.facing));
    }

    updateAnimation() {
        this.animTimer++;
        const animSpeed = this.state === 'walk' ? 8 : 12;

        if (this.animTimer >= animSpeed) {
            this.animFrame++;
            this.animTimer = 0;
        }

        if (this.state === 'attack' && this.animFrame > 3) {
            this.animFrame = 0;
        }
    }

    takeDamage(amount) {
        if (this.invincible) return;

        this.lives -= amount;
        this.invincible = true;
        this.invincibleTimer = 60;
        this.state = 'hurt';
        this.velocityY = -8;

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
    }

    getSprite(state, frame, spriteParser) {
        if (!spriteParser) return null;

        const spriteMap = {
            'idle': 'idle',
            'walk': 'walk',
            'jump': 'jump',
            'attack': 'attack',
            'crouch': 'crouch',
            'hurt': 'hurt'
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
