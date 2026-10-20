window.addEventListener('DOMContentLoaded', () => {
    // Escala el lienzo lógico de 960x720 para que quepa en la ventana (móvil incluido).
    const fit = () => {
        const scale = Math.min(window.innerWidth / 966, window.innerHeight / 726, 1.5);
        document.documentElement.style.setProperty('--scale', scale);
    };
    fit();
    window.addEventListener('resize', fit);

    const game = new Game();
    game.init();
    // El navegador solo permite arrancar el audio tras una interacción del usuario.
    window.addEventListener('keydown', () => Sound.unlock());
    window.addEventListener('pointerdown', () => Sound.unlock());
});
