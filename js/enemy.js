class Enemy {
    constructor(x, y, type, config = {}) {
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.type = type;
        this.health = config.health || 2;
        this.maxHealth = this.health;
        this.damage = config.damage || 1;
        this.active = true;
        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.facing = -1;
        this.hitTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;

        this.patrolStart = config.patrolStart || x - 100;
        this.patrolEnd = config.patrolEnd || x + 100;
        this.patrolSpeed = config.patrolSpeed || 2;

        this.chaseSpeed = config.chaseSpeed || 1.5;
        this.chaseRange = config.chaseRange || 250;
    }

    update(player, platforms) {
        if (!this.active) return;

        this.animTimer++;
        if (this.animTimer > 10) {
            this.animFrame++;
            this.animTimer = 0;
        }

        if (this.hitTimer > 0) this.hitTimer--;

        this.velocityY += 0.6;

        switch (this.type) {
            case 'static':
                this.velocityX = 0;
                break;

            case 'patrol':
                this.velocityX = this.patrolSpeed * this.facing;
                if (this.x <= this.patrolStart) {
                    this.facing = 1;
                } else if (this.x >= this.patrolEnd) {
                    this.facing = -1;
                }
                break;

            case 'chaser':
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.chaseRange) {
                    this.velocityX = this.chaseSpeed * Math.sign(dx);
                    this.facing = Math.sign(dx);
                } else {
                    this.velocityX = 0;
                }
                break;
        }

        this.x += this.velocityX;
        this.y += this.velocityY;

        Collision.checkPlatformCollisions(this, platforms);

        if (this.y > 800) {
            this.active = false;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitTimer = 15;
        if (this.health <= 0) {
            this.active = false;
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();

        if (this.hitTimer > 0 && this.hitTimer % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        const bodyColor = this.type === 'static' ? '#e74c3c' :
                         this.type === 'patrol' ? '#e67e22' : '#9b59b6';

        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        const eyeOffsetX = this.facing * 6;
        ctx.beginPath();
        ctx.arc(cx - 8 + eyeOffsetX, cy - 8, 6, 0, Math.PI * 2);
        ctx.arc(cx + 8 + eyeOffsetX, cy - 8, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx - 8 + eyeOffsetX + this.facing * 2, cy - 8, 3, 0, Math.PI * 2);
        ctx.arc(cx + 8 + eyeOffsetX + this.facing * 2, cy - 8, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (this.hitTimer > 0) {
            ctx.arc(cx, cy + 10, 8, Math.PI, 0);
        } else {
            ctx.arc(cx, cy + 8, 10, 0, Math.PI);
        }
        ctx.stroke();

        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 4;
            const barY = this.y - 10;

            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, barY, barWidth, barHeight);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(this.x, barY, barWidth * (this.health / this.maxHealth), barHeight);
        }

        ctx.restore();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
