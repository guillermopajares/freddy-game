class SpriteParser {
    constructor() {
        this.sprites = {};
        this.image = null;
        this.greenThreshold = 180;
        this.playerWidth = 40;
        this.playerHeight = 108;
    }

    async load() {
        return new Promise((resolve, reject) => {
            this.image = new Image();
            this.image.onload = () => {
                this.processImage();
                this.defineSpriteRegions();
                resolve();
            };
            this.image.onerror = reject;
            this.image.src = ASSETS['freddy'];
        });
    }

    processImage() {
        const canvas = document.createElement('canvas');
        canvas.width = this.image.width;
        canvas.height = this.image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (g > this.greenThreshold && r < 80 && b < 80) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        this.processedImage = canvas;
    }

    extractSprite(x, y, w, h, targetW, targetH) {
        if (!targetW) targetW = this.playerWidth;
        if (!targetH) targetH = this.playerHeight;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.processedImage, x, y, w, h, 0, 0, targetW, targetH);
        return canvas;
    }

    defineSpriteRegions() {
        const pw = this.playerWidth;
        const ph = this.playerHeight;

        this.sprites['idle'] = [
            this.extractSprite(125, 47, 101, 281, pw, ph),
            this.extractSprite(342, 47, 93, 281, pw, ph),
        ];

        this.sprites['walk'] = [
            this.extractSprite(554, 47, 94, 281, pw, ph),
            this.extractSprite(855, 47, 111, 281, pw, ph),
            this.extractSprite(1045, 47, 133, 281, pw, ph),
            this.extractSprite(1260, 47, 119, 281, pw, ph),
        ];

        this.sprites['jump'] = [
            this.extractSprite(1462, 47, 124, 281, pw, ph),
            this.extractSprite(1926, 47, 91, 281, pw, ph),
        ];

        this.sprites['attack'] = [
            this.extractSprite(2124, 47, 124, 281, pw, ph),
            this.extractSprite(2351, 47, 135, 281, pw, ph),
            this.extractSprite(2584, 47, 136, 281, pw, ph),
        ];

        this.sprites['run'] = [
            this.extractSprite(93, 339, 187, 361, pw, ph),
            this.extractSprite(322, 339, 179, 361, pw, ph),
            this.extractSprite(575, 339, 124, 361, pw, ph),
            this.extractSprite(758, 339, 160, 361, pw, ph),
        ];

        this.sprites['throw'] = [
            this.extractSprite(980, 339, 168, 361, pw, ph),
            this.extractSprite(1202, 339, 185, 361, pw, ph),
            this.extractSprite(1593, 339, 108, 361, pw, ph),
        ];

        this.sprites['hurt'] = [
            this.extractSprite(2098, 339, 180, 361, pw, ph),
            this.extractSprite(2344, 339, 140, 361, pw, ph),
            this.extractSprite(2607, 339, 130, 361, pw, ph),
        ];

        this.sprites['crouch'] = [
            this.extractSprite(130, 783, 247, 328, pw, ph),
            this.extractSprite(1024, 783, 258, 328, pw, ph),
        ];

        this.sprites['special'] = [
            this.extractSprite(426, 783, 307, 328, pw, ph),
            this.extractSprite(1366, 783, 234, 328, pw, ph),
            this.extractSprite(2014, 783, 160, 328, pw, ph),
        ];

        this.sprites['victory'] = [
            this.extractSprite(1795, 783, 119, 328, pw, ph),
            this.extractSprite(2273, 783, 159, 328, pw, ph),
            this.extractSprite(2599, 783, 158, 328, pw, ph),
        ];

        this.sprites['paper_roll'] = this.extractSprite(610, 706, 24, 46, 24, 24);
        this.sprites['paper_roll2'] = this.extractSprite(636, 706, 25, 46, 24, 24);
        this.sprites['paper_roll3'] = this.extractSprite(664, 706, 22, 46, 24, 24);

        this.sprites['item1'] = this.extractSprite(243, 1420, 23, 52, 24, 24);
        this.sprites['item2'] = this.extractSprite(268, 1420, 25, 52, 24, 24);
        this.sprites['item3'] = this.extractSprite(296, 1420, 24, 52, 24, 24);
    }

    getSprite(name, frame = 0) {
        if (this.sprites[name]) {
            if (Array.isArray(this.sprites[name])) {
                const frames = this.sprites[name];
                return frames[frame % frames.length];
            }
            return this.sprites[name];
        }
        return null;
    }

    getSpriteCount(name) {
        if (this.sprites[name] && Array.isArray(this.sprites[name])) {
            return this.sprites[name].length;
        }
        return this.sprites[name] ? 1 : 0;
    }
}
