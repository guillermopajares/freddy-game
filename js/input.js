class InputHandler {
    constructor() {
        this.keys = {};
        this.pad = {};
        this.justPressed = {};
        this.justReleased = {};

        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.justReleased[e.code] = true;
        });

        // Al perder el foco no llegan los keyup: sin esto Freddy seguiría andando solo.
        window.addEventListener('blur', () => { this.keys = {}; });
    }

    // Mando estándar: se traduce a los mismos códigos que el teclado.
    poll() {
        const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
        const next = {};
        if (pad) {
            const b = i => pad.buttons[i] && pad.buttons[i].pressed;
            const ax = pad.axes[0] || 0;
            const ay = pad.axes[1] || 0;
            next.KeyA = b(14) || ax < -0.4;
            next.KeyD = b(15) || ax > 0.4;
            next.KeyS = b(13) || ay > 0.6;
            next.KeyW = b(0) || b(12);
            next.Space = b(2);
            next.KeyF = b(1) || b(3);
            next.ShiftLeft = b(4) || b(5) || b(6) || b(7);
            next.Enter = b(9);
            next.Escape = b(9);
        }
        for (const code in next) {
            if (next[code] && !this.pad[code]) this.justPressed[code] = true;
        }
        this.pad = next;
    }

    isDown(code) {
        return !!this.keys[code] || !!this.pad[code];
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
