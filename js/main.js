window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
    // El navegador solo permite arrancar el audio tras una interacción del usuario.
    window.addEventListener('keydown', () => Sound.unlock());
    window.addEventListener('pointerdown', () => Sound.unlock());
});
