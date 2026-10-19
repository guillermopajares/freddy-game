class SpriteParser {
    constructor() {
        this.sprites = {};
        this.image = null;
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
        // The background has already been removed from the image file itself,
        // so we don't need the runtime chroma-key logic anymore.
        this.processedImage = this.image;
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

        // Band 0 (y:47-328): Standing poses
        this.sprites['idle'] = [
            this.extractSprite(125, 50, 101, 278, pw, ph),
            this.extractSprite(342, 53, 93, 275, pw, ph),
        ];

        this.sprites['walk'] = [
            this.extractSprite(554, 53, 94, 275, pw, ph),
            this.extractSprite(855, 47, 111, 281, pw, ph),
            this.extractSprite(1045, 47, 133, 277, pw, ph),
            this.extractSprite(1260, 47, 119, 277, pw, ph),
        ];

        this.sprites['jump'] = [
            this.extractSprite(1462, 47, 124, 278, pw, ph),
            this.extractSprite(1926, 47, 91, 281, pw, ph),
        ];

        this.sprites['attack'] = [
            this.extractSprite(2124, 47, 124, 280, pw, ph),
            this.extractSprite(2351, 47, 135, 281, pw, ph),
            this.extractSprite(2584, 47, 136, 278, pw, ph),
        ];

        // Band 1 (y:339-700): Action poses
        this.sprites['throw'] = [
            this.extractSprite(93, 341, 187, 349, pw, ph),
            this.extractSprite(322, 339, 179, 353, pw, ph),
        ];

        this.sprites['melee'] = [
            this.extractSprite(575, 424, 124, 268, pw, ph),
            this.extractSprite(758, 425, 160, 266, pw, ph),
            this.extractSprite(980, 425, 168, 259, pw, ph),
        ];

        this.sprites['crouch'] = [
            this.extractSprite(1593, 461, 108, 233, 40, 72),
        ];

        this.sprites['hurt'] = [
            this.extractSprite(2098, 421, 180, 277, pw, ph),
            this.extractSprite(2344, 484, 140, 210, pw, ph),
            this.extractSprite(2607, 475, 130, 218, pw, ph),
        ];

        // Band 3 (y:783-1111): Victory and run
        this.sprites['victory'] = [
            this.extractSprite(2014, 799, 160, 305, pw, ph),
            this.extractSprite(2273, 800, 183, 304, pw, ph),
            this.extractSprite(2599, 790, 158, 265, pw, ph),
        ];

        this.sprites['run'] = [
            this.extractSprite(1366, 791, 234, 320, pw, ph),
        ];

        this.sprites['idle_alt'] = [
            this.extractSprite(1795, 791, 119, 265, pw, ph),
        ];

        // Band 2 (y:706-752): Paper rolls and plunger items
        this.sprites['paper_roll'] = [
            this.extractSprite(610, 707, 24, 38, 24, 24),
            this.extractSprite(636, 707, 25, 38, 24, 24),
            this.extractSprite(664, 707, 22, 37, 24, 24),
            this.extractSprite(690, 707, 22, 37, 24, 24),
            this.extractSprite(715, 707, 20, 37, 24, 24),
            this.extractSprite(738, 707, 22, 37, 24, 24),
            this.extractSprite(788, 707, 22, 37, 24, 24),
            this.extractSprite(814, 707, 23, 38, 24, 24),
            this.extractSprite(841, 707, 24, 37, 24, 24),
        ];

        this.sprites['plunger'] = [
            this.extractSprite(2005, 706, 22, 39, 28, 28),
            this.extractSprite(2029, 707, 25, 37, 28, 28),
            this.extractSprite(2057, 707, 64, 37, 28, 28),
            this.extractSprite(2124, 707, 22, 37, 28, 28),
            this.extractSprite(2173, 707, 19, 38, 28, 28),
            this.extractSprite(2196, 707, 23, 38, 28, 28),
            this.extractSprite(2223, 707, 31, 37, 28, 28),
            this.extractSprite(2257, 707, 23, 37, 28, 28),
        ];
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
