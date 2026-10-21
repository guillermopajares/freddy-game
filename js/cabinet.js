// Mueble de recreativa: mueve el joystick y los botones del panel según la entrada.
// Solo decoración: no toca la lógica del juego.
class Cabinet {
    constructor(root) {
        this.stick = root.querySelector('#cab-joystick');
        this.buttons = [...root.querySelectorAll('.cab-btn[data-codes]')].map(el => ({
            el, codes: el.dataset.codes.split(' '), pressed: false,
        }));
        this.jx = 0;
        this.jy = 0;
    }

    update(input) {
        const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
        const right = input.isDown('KeyD') || input.isDown('ArrowRight');
        const down = input.isDown('KeyS') || input.isDown('ArrowDown');
        const jx = (right ? 1 : 0) - (left ? 1 : 0);
        const jy = down ? 1 : 0;
        if (jx !== this.jx || jy !== this.jy) {
            this.jx = jx;
            this.jy = jy;
            this.stick.style.setProperty('--jx', jx);
            this.stick.style.setProperty('--jy', jy);
        }
        this.buttons.forEach(b => {
            const pressed = b.codes.some(code => input.isDown(code));
            if (pressed !== b.pressed) {
                b.pressed = pressed;
                b.el.classList.toggle('pressed', pressed);
            }
        });
    }
}

if (typeof module !== 'undefined') module.exports = Cabinet;
