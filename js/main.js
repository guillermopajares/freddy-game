window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    // Con ratón se ve el mueble de recreativa; en pantallas táctiles, solo la pantalla (ver css).
    const touch = window.matchMedia('(pointer: coarse)');

    // Escala el mueble (o el lienzo lógico de 960x720 sin mueble) para que quepa en la ventana
    // y ajusta la resolución interna del canvas para que no se pixele al ampliarlo.
    // Completo: ancho 1100 (con el vuelo del panel) y tabla superior + marquesina + pantalla + mandos = 1130 de alto.
    // Compacto: solo tabla superior y pantalla con su bisel.
    const SIZES = { full: [1100, 1130], compact: [1084, 840], off: [966, 726] };
    const scaleFor = ([w, h]) => Math.min(window.innerWidth / w, window.innerHeight / h, 1.5);
    const fit = () => {
        const s = game.progress.settings;
        let mode = touch.matches ? 'off' : (SIZES[s.cabinet] ? s.cabinet : 'auto');
        // Automático: el mueble completo solo si no encoge la pantalla de juego más de un 25 %
        // (con 1080p sale compacto; con 1440p o más, completo)
        if (mode === 'auto') mode = scaleFor(SIZES.full) >= scaleFor(SIZES.off) * 0.75 ? 'full' : 'compact';
        document.documentElement.dataset.cabinet = mode;
        document.documentElement.classList.toggle('no-crt', !s.crt);
        const scale = scaleFor(SIZES[mode]);
        document.documentElement.style.setProperty('--scale', scale);
        game.resize(scale);
    };
    game.onLayoutChange = fit;
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
