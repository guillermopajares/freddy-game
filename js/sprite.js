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


class EnemySpriteParser {
    constructor() {
        this.sprites = {};
        this.image = null;
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
            this.image.src = ASSETS['enemies'];
        });
    }

    processImage() {
        // Chroma key out the green background
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

            // Bright green background (#00FF00 or close)
            if (g > 150 && r < 100 && b < 100) {
                data[i + 3] = 0; // Make transparent
            }
        }

        ctx.putImageData(imageData, 0, 0);
        this.processedImage = canvas;
    }

    extractSprite(x, y, w, h) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.processedImage, x, y, w, h, 0, 0, w, h);
        return canvas;
    }

    defineSpriteRegions() {
        // Based on our analysis:
        // Enemy 1: "CodeBug" (Row 0)
        this.sprites['CodeBug'] = {
            'WALK': [
                this.extractSprite(77, 58, 189, 269),
                this.extractSprite(297, 58, 185, 267),
                this.extractSprite(516, 58, 182, 268),
                this.extractSprite(819, 55, 168, 272)
            ],
            'ATTACK': [
                this.extractSprite(1023, 53, 168, 263),
                this.extractSprite(1235, 53, 167, 272),
                this.extractSprite(1443, 58, 186, 265)
            ],
            'HIT': [
                this.extractSprite(1870, 59, 158, 251)
            ],
            'DEATH': [
                this.extractSprite(2113, 60, 158, 251),
                this.extractSprite(2357, 60, 157, 251),
                this.extractSprite(2595, 60, 158, 251)
            ]
        };

        // Enemy 2: "Error404" (Row 2)
        this.sprites['Error404'] = {
            'FLOAT': [
                this.extractSprite(81, 435, 220, 249),
                this.extractSprite(333, 436, 188, 251),
                this.extractSprite(556, 432, 166, 260),
                this.extractSprite(768, 435, 170, 252)
            ],
            'ATTACK': [
                this.extractSprite(980, 429, 188, 261),
                this.extractSprite(1209, 433, 177, 255),
                this.extractSprite(1583, 439, 159, 251)
            ],
            'DEATH': [
                this.extractSprite(1854, 419, 160, 251),
                this.extractSprite(2136, 428, 159, 250),
                this.extractSprite(2357, 459, 165, 225)
            ]
        };

        // Enemy 3: "SpaghettiCode" (Rows 4, 5, 6)
        this.sprites['SpaghettiCode'] = {
            'WALK': [
                this.extractSprite(89, 807, 300, 247),
                this.extractSprite(433, 807, 257, 247),
                this.extractSprite(997, 807, 247, 245)
            ],
            'ATTACK': [
                this.extractSprite(1329, 807, 248, 250),
                this.extractSprite(1775, 807, 157, 249),
                this.extractSprite(1214, 1158, 703, 252) // Extended whip attack from row 5
            ],
            'HIT': [
                this.extractSprite(2035, 807, 157, 249)
            ],
            'DEATH': [
                this.extractSprite(2298, 810, 156, 248),
                this.extractSprite(2588, 803, 159, 247),
                this.extractSprite(2476, 1252, 333, 165) // Collapsed death pose from row 6
            ]
        };
    }

    getSprite(enemyType, state, frame = 0) {
        if (this.sprites[enemyType] && this.sprites[enemyType][state]) {
            const frames = this.sprites[enemyType][state];
            if (frames && frames.length > 0) {
                return frames[frame % frames.length];
            }
        }
        return null;
    }

    getSpriteCount(enemyType, state) {
        if (this.sprites[enemyType] && this.sprites[enemyType][state]) {
            return this.sprites[enemyType][state].length;
        }
        return 0;
    }
}
