class Projectile {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.direction = direction;
        this.speed = 8;
        this.velocityX = direction * this.speed;
        this.velocityY = 0;
        this.active = true;
        this.lifetime = 120;
        this.rotation = 0;
        this.trail = [];
    }

    update() {
        this.trail.push({ x: this.x + this.width / 2, y: this.y + this.height / 2, life: 10 });
        if (this.trail.length > 8) this.trail.shift();
        this.trail.forEach(t => t.life--);
        this.trail = this.trail.filter(t => t.life > 0);

        this.x += this.velocityX;
        this.y += this.velocityY;
        this.rotation += 0.3;
        this.lifetime--;

        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        this.trail.forEach(t => {
            ctx.globalAlpha = t.life / 10 * 0.3;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // Paper roll body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Outer shadow
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cardboard tube center
        ctx.fillStyle = '#c4a882';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#a08060';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Paper spiral lines
        ctx.strokeStyle = '#e8e0d8';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(0, 0, 8 + i * 2, angle, angle + Math.PI * 0.6);
            ctx.stroke();
        }

        // Perforated edge detail
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([1, 2]);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
