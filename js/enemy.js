
const ENEMY_SPRITE_CONFIG = {
    'CodeBug': { width: 48, height: 48, scale: 0.25, offsetX: -20, offsetY: -30 },
    'Error404': { width: 48, height: 48, scale: 0.35, offsetX: -25, offsetY: -35 },
    'SpaghettiCode': { width: 60, height: 48, scale: 0.3, offsetX: -30, offsetY: -40 },
};

class Enemy {
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        this.width = config.width || 48;
        this.height = config.height || 48;
        this.health = config.health || 2;
        this.maxHealth = this.health;
        this.damage = config.damage || 1;

        this.active = true;
        this.markedForDeletion = false;

        this.velocityX = 0;
        this.velocityY = 0;
        this.onGround = false;
        this.facing = -1; // -1 left, 1 right

        this.hitTimer = 0;

        this.state = 'WALK';
        this.animFrame = 0;
        this.animTimer = 0;
        this.animSpeed = 10;

        this.type = 'Base';
    }

    changeState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.animFrame = 0;
            this.animTimer = 0;
        }
    }

    takeDamage(amount) {
        if (this.state === 'DEATH') return false;

        this.health -= amount;
        this.hitTimer = 15;

        if (this.health <= 0) {
            this.health = 0;
            this.changeState('DEATH');
            // Turn off hitbox
            this.width = 0;
            this.height = 0;
            return true;
        } else {
            // Only go to hit if they have a hit animation and aren't dead
            if (this.hasHitAnim()) {
                this.changeState('HIT');
            }
        }
        return false;
    }

    hasHitAnim() {
        return ['CodeBug', 'SpaghettiCode'].includes(this.type); // As per our mappings
    }

    updateAnimation(spriteParser) {
        if (!spriteParser) return;

        this.animTimer++;
        if (this.animTimer > this.animSpeed) {
            this.animFrame++;
            this.animTimer = 0;

            const maxFrames = spriteParser.getSpriteCount(this.type, this.state);

            // Handle one-shot animations
            if (this.state === 'DEATH') {
                if (this.animFrame >= maxFrames) {
                    this.animFrame = maxFrames - 1; // stay on last frame
                    this.markedForDeletion = true;  // Mark for cleanup
                }
            } else if (this.state === 'HIT' || this.state === 'ATTACK') {
                if (this.animFrame >= maxFrames) {
                    this.changeState(this.getDefaultState());
                }
            } else {
                // Loop
                if (maxFrames > 0 && this.animFrame >= maxFrames) {
                    this.animFrame = 0;
                }
            }
        }
    }

    getDefaultState() {
        return 'WALK';
    }

    update(player, platforms, spriteParser) {
        if (this.markedForDeletion) return;

        if (this.hitTimer > 0) this.hitTimer--;

        this.updateBehavior(player, platforms);
        this.updateAnimation(spriteParser);

        // Physics update
        this.x += this.velocityX;
        this.y += this.velocityY;

        if (this.appliesGravity()) {
            this.velocityY += 0.6; // Gravity
            Collision.checkPlatformCollisions(this, platforms);
        }

        if (this.y > 800) {
            this.markedForDeletion = true;
        }
    }

    updateBehavior(player, platforms) {
        // Override in subclass
    }

    appliesGravity() {
        return true; // Default
    }

    draw(ctx, spriteParser) {
        if (this.markedForDeletion) return;
        if (!spriteParser) return;

        ctx.save();

        if (this.hitTimer > 0 && this.hitTimer % 4 < 2) {
            ctx.globalAlpha = 0.5;
        }

        const sprite = spriteParser.getSprite(this.type, this.state, this.animFrame);

        if (sprite) {
            const conf = ENEMY_SPRITE_CONFIG[this.type];
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;

            ctx.translate(cx, cy);
            if (this.facing === 1) {
                ctx.scale(-1, 1);
            }

            // Scaled draw based on config offset to center the large sprite on the small hitbox
            const sw = sprite.width * conf.scale;
            const sh = sprite.height * conf.scale;

            ctx.drawImage(sprite, -sw/2, -sh/2 + conf.offsetY, sw, sh);
        } else {
            // Fallback render
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();

        // Draw health bar if damaged but not dead
        if (this.health < this.maxHealth && this.state !== 'DEATH' && this.health > 0) {
            const barWidth = 48; // fixed visual bar width
            const barHeight = 4;
            const barY = this.y - 10;
            const barX = this.x + this.width/2 - barWidth/2;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
        }
    }

    getBounds() {
        if (this.state === 'DEATH') return { x: 0, y: 0, width: 0, height: 0 };
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

class CodeBug extends Enemy {
    constructor(x, y, config = {}) {
        super(x, y, { ...ENEMY_SPRITE_CONFIG['CodeBug'], ...config });
        this.type = 'CodeBug';
        this.patrolStart = config.patrolStart || x - 100;
        this.patrolEnd = config.patrolEnd || x + 100;
        this.patrolSpeed = config.patrolSpeed || 1.5;
        this.attackRange = 150;
        this.attackCooldown = 0;
    }

    updateBehavior(player, platforms) {
        if (this.state === 'DEATH' || this.state === 'HIT') {
            this.velocityX = 0;
            return;
        }

        if (this.attackCooldown > 0) this.attackCooldown--;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.attackRange && Math.abs(dy) < 50 && this.attackCooldown === 0) {
            this.changeState('ATTACK');
            this.velocityX = 0;
            this.facing = Math.sign(dx) || this.facing;
            this.attackCooldown = 120; // 2 seconds
        } else if (this.state !== 'ATTACK') {
            this.changeState('WALK');
            this.velocityX = this.patrolSpeed * this.facing;
            if (this.x <= this.patrolStart) {
                this.facing = 1;
            } else if (this.x >= this.patrolEnd) {
                this.facing = -1;
            }
        }
    }
}

class Error404 extends Enemy {
    constructor(x, y, config = {}) {
        super(x, y, { ...ENEMY_SPRITE_CONFIG['Error404'], ...config });
        this.type = 'Error404';
        this.chaseSpeed = config.chaseSpeed || 1.2;
        this.chaseRange = config.chaseRange || 250;
        this.startY = y;
        this.floatTimer = 0;
        this.state = 'FLOAT';
        this.attackCooldown = 0;
    }

    getDefaultState() {
        return 'FLOAT';
    }

    appliesGravity() {
        return false;
    }

    updateBehavior(player, platforms) {
        if (this.state === 'DEATH') {
            this.velocityX = 0;
            this.velocityY += 0.2; // Fall when dead
            return;
        }

        this.floatTimer += 0.05;
        this.y = this.startY + Math.sin(this.floatTimer) * 20;

        if (this.attackCooldown > 0) this.attackCooldown--;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.chaseRange) {
            this.facing = Math.sign(dx) || this.facing;

            if (this.attackCooldown === 0) {
                this.changeState('ATTACK');
                this.attackCooldown = 150;
            }

            if (this.state !== 'ATTACK') {
                this.velocityX = this.chaseSpeed * Math.sign(dx);
            } else {
                this.velocityX = 0;
            }
        } else {
            this.velocityX = 0;
        }
    }
}

class SpaghettiCode extends Enemy {
    constructor(x, y, config = {}) {
        super(x, y, { ...ENEMY_SPRITE_CONFIG['SpaghettiCode'], ...config });
        this.type = 'SpaghettiCode';
        this.health = config.health || 4;
        this.maxHealth = this.health;
        this.attackRange = 100;
        this.attackCooldown = 0;
        this.originalWidth = this.width;
    }

    updateBehavior(player, platforms) {
        if (this.state === 'DEATH' || this.state === 'HIT') {
            this.velocityX = 0;
            this.width = this.originalWidth; // reset hitbox
            return;
        }

        if (this.attackCooldown > 0) this.attackCooldown--;

        const dx = player.x - this.x;
        const dist = Math.abs(dx);

        this.facing = dx > 0 ? 1 : -1;

        if (dist < this.attackRange && Math.abs(player.y - this.y) < 60 && this.attackCooldown === 0) {
            this.changeState('ATTACK');
            this.velocityX = 0;
            this.attackCooldown = 180;
            // Extend hitbox during attack to match whip
            this.width = this.originalWidth + 40;
            if (this.facing === -1) {
                this.x -= 40; // Shift left if facing left
            }
        } else if (this.state === 'ATTACK') {
            // keep expanded hitbox
        } else {
            this.changeState('WALK');
            this.width = this.originalWidth; // restore hitbox
            // Slow drag towards player if close
            if (dist < 300) {
                this.velocityX = 0.5 * this.facing;
            } else {
                this.velocityX = 0;
            }
        }
    }
}
