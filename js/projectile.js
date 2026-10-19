class Projectile {
    constructor(x, y, direction, type = 'paper') {
        this.x = x;
        this.y = y;
        this.type = type;

        if (type === 'paper') {
            this.width = 28;
            this.height = 28;
            this.speed = 8;
            this.lifetime = 120;
        } else {
            this.width = 40;
            this.height = 40;
            this.speed = 6;
            this.lifetime = 35;
        }

        this.direction = direction;
        this.velocityX = direction * this.speed;
        this.velocityY = 0;
        this.active = true;
        this.rotation = 0;
        this.trail = [];
        this.animFrame = 0;
        this.animTimer = 0;
        this.swingAngle = 0;
    }

    update() {
        this.animTimer++;
        if (this.animTimer > 3) {
            this.animFrame++;
            this.animTimer = 0;
        }

        if (this.type === 'paper') {
            this.trail.push({ x: this.x + this.width / 2, y: this.y + this.height / 2, life: 10 });
            if (this.trail.length > 8) this.trail.shift();
            this.trail.forEach(t => t.life--);
            this.trail = this.trail.filter(t => t.life > 0);
            this.rotation += 0.25;
        } else {
            this.swingAngle += 0.15 * this.direction;
            this.rotation = Math.sin(this.swingAngle) * 0.5;
        }

        this.x += this.velocityX;
        this.y += this.velocityY;
        this.lifetime--;

        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (this.type === 'paper') {
            this.drawPaperTrail(ctx);
        }

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        if (this.type === 'paper') {
            this.drawPaperRoll(ctx);
        } else {
            this.drawPlunger(ctx, this.direction);
        }

        ctx.restore();
    }

    drawPaperTrail(ctx) {
        this.trail.forEach(t => {
            ctx.globalAlpha = t.life / 10 * 0.3;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    drawPaperRoll(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.rotation * 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
            ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 11);
            ctx.stroke();
        }

        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#b8895a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#8B6914';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPlunger(ctx, dir) {
        const scale = 1.2;
        ctx.scale(scale, scale);

        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, 4);
        ctx.stroke();

        ctx.strokeStyle = '#6B3410';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, -7);
        ctx.stroke();

        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.ellipse(0, 10, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(-4, 8, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#922b21';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 10, 14, 8, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#a93226';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 10, 10, 5, 0, 0.5, Math.PI - 0.5);
        ctx.stroke();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
