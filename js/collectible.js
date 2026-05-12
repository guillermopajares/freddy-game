class Collectible {
    constructor(x, y, type = 'coin') {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 28;
        this.type = type;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.value = type === 'coin' ? 10 : type === 'star' ? 50 : 0;
    }

    update() {
        this.bobOffset += 0.05;
    }

    draw(ctx) {
        if (this.collected) return;

        const bobY = Math.sin(this.bobOffset) * 4;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + bobY);

        if (this.type === 'coin') {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#daa520';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#daa520';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 1);
        } else if (this.type === 'star') {
            ctx.fillStyle = '#ffeb3b';
            this.drawStar(ctx, 0, 0, 5, 12, 6);
        } else if (this.type === 'heart') {
            ctx.fillStyle = '#e74c3c';
            this.drawHeart(ctx, 0, 0, 12);
        }

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    drawHeart(ctx, cx, cy, size) {
        ctx.beginPath();
        ctx.moveTo(cx, cy + size / 4);
        ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + size / 4);
        ctx.bezierCurveTo(cx - size / 2, cy + size / 2, cx, cy + size * 0.7, cx, cy + size);
        ctx.bezierCurveTo(cx, cy + size * 0.7, cx + size / 2, cy + size / 2, cx + size / 2, cy + size / 4);
        ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + size / 4);
        ctx.closePath();
        ctx.fill();
    }

    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}
