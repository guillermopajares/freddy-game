class InputHandler {
    constructor() {
        this.keys = {};
        this.pad = {};
        this.touch = {};
        this.justPressed = {};
        this.justReleased = {};

        window.addEventListener('keydown', (e) => {
            // Escribir el nombre o tocar los ajustes no debe mover a Freddy
            if (e.target.closest && e.target.closest('input, select, button, summary')) return;
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

        // Botones táctiles: cada uno equivale a una tecla (data-code). Multitáctil: un dedo por botón.
        document.querySelectorAll('#touch-controls [data-code]').forEach(btn => {
            const code = btn.dataset.code;
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (!this.touch[code]) this.justPressed[code] = true;
                this.touch[code] = true;
                // La captura hace que soltar el dedo fuera del botón también cuente como soltar
                try { btn.setPointerCapture(e.pointerId); } catch (err) { /* puntero ya liberado */ }
            });
            const release = () => { this.touch[code] = false; };
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointercancel', release);
            btn.addEventListener('lostpointercapture', release);
        });
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
        return !!this.keys[code] || !!this.pad[code] || !!this.touch[code];
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
