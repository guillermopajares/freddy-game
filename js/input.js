// Acciones del juego y sus teclas. Dos manos: WASD + J/K/L, o flechas + Z/X/C.
// Shift sigue valiendo para el dash. Los dígitos y demás códigos sueltos también se pueden consultar.
const BINDINGS = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    melee: ['KeyJ', 'KeyZ'],
    fire: ['KeyK', 'KeyX'],
    dash: ['KeyL', 'KeyC', 'ShiftLeft', 'ShiftRight'],
    ultimate: ['KeyI', 'KeyV'],
    pause: ['Escape', 'KeyP'],
    confirm: ['Enter'],
    restart: ['KeyR'],
    mute: ['KeyM'],
};

class InputHandler {
    constructor() {
        this.keys = {};
        this.pad = {};
        this.touch = {};
        this.justPressed = {};

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
        });

        // Al perder el foco no llegan los keyup: sin esto Freddy seguiría andando solo.
        window.addEventListener('blur', () => { this.keys = {}; });

        // Botones táctiles: cada uno es una acción (data-action). Multitáctil: un dedo por botón.
        document.querySelectorAll('#touch-controls [data-action]').forEach(btn => {
            const action = btn.dataset.action;
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (!this.touch[action]) this.justPressed[action] = true;
                this.touch[action] = true;
                // La captura hace que soltar el dedo fuera del botón también cuente como soltar
                try { btn.setPointerCapture(e.pointerId); } catch (err) { /* puntero ya liberado */ }
            });
            const release = () => { this.touch[action] = false; };
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointercancel', release);
            btn.addEventListener('lostpointercapture', release);
        });
    }

    // Mando estándar: A salta, X papel, B desatascador, Y ulti, gatillos dash, Start pausa/confirma.
    poll() {
        const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
        const next = {};
        if (pad) {
            const b = i => pad.buttons[i] && pad.buttons[i].pressed;
            const ax = pad.axes[0] || 0;
            const ay = pad.axes[1] || 0;
            next.left = b(14) || ax < -0.4;
            next.right = b(15) || ax > 0.4;
            next.down = b(13) || ay > 0.6;
            next.jump = b(0) || b(12);
            next.fire = b(2);
            next.melee = b(1);
            next.ultimate = b(3);
            next.dash = b(4) || b(5) || b(6) || b(7);
            next.start = b(9);
        }
        for (const action in next) {
            if (next[action] && !this.pad[action]) this.justPressed[action] = true;
        }
        this.pad = next;
    }

    // name: acción de BINDINGS o código de tecla suelto ('Digit1').
    isDown(name) {
        return (BINDINGS[name] || [name]).some(code => this.keys[code]) || !!this.pad[name] || !!this.touch[name];
    }

    isPressed(name) {
        return !!this.justPressed[name] || (BINDINGS[name] || []).some(code => this.justPressed[code]);
    }

    clear() {
        this.justPressed = {};
    }
}
