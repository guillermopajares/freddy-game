const PROJECTILE_TYPES = {
    paper: { width: 28, height: 28, speed: 8, lifetime: 120, damage: 1, gravity: 0, pierce: false },
    paperBig: { width: 44, height: 44, speed: 10, lifetime: 120, damage: 3, gravity: 0, pierce: true },
    pixel: { width: 18, height: 18, speed: 4.5, lifetime: 240, damage: 1, gravity: 0, pierce: false },
    goo: { width: 22, height: 22, speed: 5, lifetime: 240, damage: 1, gravity: 0.22, pierce: false },
    // Emojis malignos del Glitch: lentos y ondulantes; los rojos (segunda fase), más rápidos
    emoji: { width: 30, height: 30, speed: 3.2, lifetime: 300, damage: 1, gravity: 0, pierce: false },
    emojiRed: { width: 30, height: 30, speed: 4.4, lifetime: 260, damage: 1, gravity: 0, pierce: false },
};

class Projectile {
    // direction: -1/1 en horizontal, o la componente X normalizada de un disparo apuntado.
    constructor(x, y, direction, type = 'paper', velocityY = 0) {
        const t = PROJECTILE_TYPES[type];
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = t.width;
        this.height = t.height;
        this.speed = t.speed;
        this.lifetime = t.lifetime;
        this.damage = t.damage;
        this.gravity = t.gravity;
        this.pierce = t.pierce;

        this.direction = direction;
        this.velocityX = direction * this.speed;
        this.velocityY = velocityY;
        this.active = true;
        this.rotation = 0;
        this.trail = [];
        this.hits = new Set(); // enemigos ya atravesados (rollo cargado)
        this.sprite = type === 'emoji' || type === 'emojiRed'; // de la hoja de objetos, sin girar
    }

    update() {
        if (this.type === 'paper' || this.type === 'paperBig') {
            this.trail.push({ x: this.x + this.width / 2, y: this.y + this.height / 2, life: 10 });
            if (this.trail.length > 8) this.trail.shift();
            this.trail.forEach(t => t.life--);
            this.trail = this.trail.filter(t => t.life > 0);
        }
        this.rotation += 0.25 * Math.sign(this.direction || 1);

        this.velocityY += this.gravity;
        this.x += this.velocityX;
        this.y += this.velocityY;
        if (this.sprite) this.y += Math.sin(this.lifetime * 0.15) * 1.2;
        this.lifetime--;

        if (this.lifetime <= 0 || this.y > 760) {
            this.active = false;
        }
    }

    // sheet: hoja de objetos, para los emojis.
    draw(ctx, sheet) {
        if (this.sprite) {
            if (!sheet) return;
            const frame = Math.floor(this.lifetime / 8);
            sheet.draw(ctx, this.type, frame, this.x + this.width / 2, this.y + this.height + 3, 0.55);
            return;
        }
        if (this.type === 'paper' || this.type === 'paperBig') this.drawPaperTrail(ctx);

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        if (this.type === 'paper') {
            this.drawPaperRoll(ctx);
        } else if (this.type === 'paperBig') {
            ctx.shadowColor = '#7fdbff';
            ctx.shadowBlur = 16;
            ctx.scale(1.6, 1.6);
            this.drawPaperRoll(ctx);
        } else if (this.type === 'pixel') {
            this.drawPixel(ctx);
        } else {
            this.drawGoo(ctx);
        }

        ctx.restore();
    }

    drawPaperTrail(ctx) {
        this.trail.forEach(t => {
            ctx.globalAlpha = t.life / 10 * 0.3;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(t.x, t.y, this.type === 'paperBig' ? 6 : 3, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    drawPaperRoll(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
            ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 11);
            ctx.stroke();
        }

        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8B6914';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Píxel muerto del Error 404 (como el de su hoja de sprites).
    drawPixel(ctx) {
        ctx.fillStyle = '#111';
        ctx.fillRect(-9, -9, 18, 18);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(-6, -6, 12, 12);
        ctx.fillStyle = '#e91e63';
        ctx.fillRect(-9, -12, 6, 3);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(4, 9, 6, 3);
    }

    drawGoo(ctx) {
        ctx.fillStyle = '#7bd03a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b6f272';
        ctx.beginPath();
        ctx.arc(-4, -3, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

if (typeof module !== 'undefined') {
    module.exports = Projectile;
    module.exports.PROJECTILE_TYPES = PROJECTILE_TYPES;
}
