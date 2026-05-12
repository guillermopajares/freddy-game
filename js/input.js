class InputHandler {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.justReleased = {};

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.justReleased[e.code] = true;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    isPressed(code) {
        return !!this.justPressed[code];
    }

    isReleased(code) {
        return !!this.justReleased[code];
    }

    clear() {
        this.justPressed = {};
        this.justReleased = {};
    }
}
