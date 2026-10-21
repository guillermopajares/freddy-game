window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    // Con ratón se ve el mueble de recreativa; en pantallas táctiles, solo la pantalla (ver css).
    const touch = window.matchMedia('(pointer: coarse)');

    // Escala el mueble (o el lienzo lógico de 960x720 en táctil) para que quepa en la ventana
    // y ajusta la resolución interna del canvas para que no se pixele al ampliarlo.
    // Del mueble deben caber el ancho (1100 con el vuelo del panel) y la tabla superior + marquesina + pantalla + mandos (1130 de alto).
    const fit = () => {
        const [w, h] = touch.matches ? [966, 726] : [1100, 1130];
        const scale = Math.min(window.innerWidth / w, window.innerHeight / h, 1.5);
        document.documentElement.style.setProperty('--scale', scale);
        game.resize(scale);
    };
    fit();
    window.addEventListener('resize', fit);
    touch.addEventListener('change', fit);

    const cabinet = new Cabinet(document.getElementById('cabinet'));
    const animate = () => {
        cabinet.update(game.input);
        requestAnimationFrame(animate);
    };
    animate();

    game.init();

    // Pantalla de arranque: solo al abrir la página (no al terminar una partida).
    // A los 2 s se funde (transición del css) y después se quita.
    const boot = document.getElementById('boot-screen');
    setTimeout(() => {
        boot.addEventListener('transitionend', () => boot.remove(), { once: true });
        boot.classList.add('done');
    }, 2000);
    // El navegador solo permite arrancar el audio tras una interacción del usuario.
    window.addEventListener('keydown', () => Sound.unlock());
    window.addEventListener('pointerdown', () => Sound.unlock());
});
