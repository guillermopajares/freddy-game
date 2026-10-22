// Objetos dibujados con la hoja de objetos: [frame, escala]. Se apoyan en el borde inferior de la caja.
const ITEM_SPRITES = { laptop: ['laptop', 0.5], potion: ['potion', 0.48], poison: ['poison', 0.48] };

class Collectible {
    constructor(x, y, type = 'coin') {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 28;
        this.type = type;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.value = { coin: 10, star: 50, laptop: 200 }[type] || 0;
    }

    update() {
        this.bobOffset += 0.05;
    }

    // sheet: hoja de objetos (ITEM_FRAMES) para portátil y pociones.
    draw(ctx, sheet) {
        if (this.collected) return;

        const bobY = Math.sin(this.bobOffset) * 4;
        if (ITEM_SPRITES[this.type] && sheet) {
            const [name, scale] = ITEM_SPRITES[this.type];
            if (this.type === 'potion') {
                ctx.save();
                ctx.shadowColor = '#b388ff';
                ctx.shadowBlur = 10 + Math.sin(this.bobOffset * 3) * 6;
            }
            sheet.draw(ctx, name, 0, this.x + this.width / 2, this.y + this.height + bobY, scale);
            if (this.type === 'potion') ctx.restore();
            return;
        }

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
        } else if (this.type === 'paper') {
            this.drawPaperPack(ctx);
        } else {
            this.drawPower(ctx);
        }

        ctx.restore();
    }

    // Paquete de rollos: recarga munición.
    drawPaperPack(ctx) {
        [[-7, 4], [7, 4], [0, -8]].forEach(([x, y]) => {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#d4a574';
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Objetos de poder: burbuja con icono.
    drawPower(ctx) {
        const pulse = 1 + Math.sin(this.bobOffset * 3) * 0.08;
        const colors = { triple: '#7fdbff', gold: '#ffd700', shield: '#64b5f6' };
        ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.strokeStyle = colors[this.type];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText({ triple: '🧻', gold: '🪠', shield: '🛡️' }[this.type], 0, 1);
        if (this.type === 'triple') {
            ctx.fillStyle = '#7fdbff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('x3', 10, 11);
        }
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
