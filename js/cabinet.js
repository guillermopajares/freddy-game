// Mueble de recreativa: mueve el joystick y los botones del panel según la entrada.
// Solo decoración: no toca la lógica del juego.
class Cabinet {
    constructor(root) {
        this.stick = root.querySelector('#cab-joystick');
        // data-actions: acciones de BINDINGS (así también se mueven con el mando y los botones táctiles)
        this.buttons = [...root.querySelectorAll('.cab-btn[data-actions]')].map(el => ({
            el, actions: el.dataset.actions.split(' '), pressed: false,
        }));
        this.jx = 0;
        this.jy = 0;
    }

    update(input) {
        const left = input.isDown('left');
        const right = input.isDown('right');
        const down = input.isDown('down');
        const jx = (right ? 1 : 0) - (left ? 1 : 0);
        const jy = down ? 1 : 0;
        if (jx !== this.jx || jy !== this.jy) {
            this.jx = jx;
            this.jy = jy;
            this.stick.style.setProperty('--jx', jx);
            this.stick.style.setProperty('--jy', jy);
        }
        this.buttons.forEach(b => {
            const pressed = b.actions.some(action => input.isDown(action));
            if (pressed !== b.pressed) {
                b.pressed = pressed;
                b.el.classList.toggle('pressed', pressed);
            }
        });
    }
}

if (typeof module !== 'undefined') module.exports = Cabinet;
