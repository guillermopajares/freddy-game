window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    // Escala el lienzo lógico de 960x720 para que quepa en la ventana (móvil incluido)
    // y ajusta la resolución interna del canvas para que no se pixele al ampliarlo.
    const fit = () => {
        const scale = Math.min(window.innerWidth / 966, window.innerHeight / 726, 1.5);
        document.documentElement.style.setProperty('--scale', scale);
        game.resize(scale);
    };
    fit();
    window.addEventListener('resize', fit);

    game.init();
    // El navegador solo permite arrancar el audio tras una interacción del usuario.
    window.addEventListener('keydown', () => Sound.unlock());
    window.addEventListener('pointerdown', () => Sound.unlock());
});
