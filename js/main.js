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
        const scale = touch.matches ? touchScale() : scaleFor(SIZES[mode]);
        document.documentElement.style.setProperty('--scale', scale);
        game.resize(scale);
    };
    game.onLayoutChange = fit;

    // En táctil la pantalla de juego se ve lo más grande posible: en horizontal, todo el alto (los mandos,
    // semitransparentes, van en las bandas de los lados y si no caben pisan el borde del juego); en vertical,
    // todo el ancho con los mandos debajo. Se descuentan las zonas seguras, que el css pone de padding.
    const controls = document.getElementById('touch-controls');
    const touchScale = () => {
        const root = document.documentElement;
        const cs = getComputedStyle(controls);
        const w = window.innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const h = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const portrait = h > w;
        // Botón según el lado corto: los pulgares no encogen con la pantalla (48-76 px)
        const btn = Math.max(48, Math.min(76, (portrait ? w : h) * (portrait ? 0.15 : 0.16)));
        // Vertical: debajo caben la palanca (2,4 botones) y márgenes
        const scale = portrait ? Math.min(w / 960, (h - btn * 2.4 - 60) / 720, 1.5) : Math.min(w / 960, h / 720, 1.5);
        root.dataset.touch = portrait ? 'portrait' : 'landscape';
        root.style.setProperty('--btn', `${btn}px`);
        root.style.setProperty('--game-h', `${720 * scale}px`);
        return scale;
    };

    // Pantalla completa y horizontal. En iPhone no existe (ni lock): el botón se oculta y queda el aviso de girar.
    const fullscreenBtn = document.getElementById('touch-fullscreen');
    const el = document.documentElement;
    const requestFs = el.requestFullscreen || el.webkitRequestFullscreen;
    fullscreenBtn.hidden = !requestFs;
    fullscreenBtn.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                return;
            }
            await requestFs.call(el);
            await screen.orientation.lock('landscape');
        } catch (e) { /* sin permiso o sin bloqueo de orientación: se sigue tal cual */ }
    });
    // En táctil, el primer toque en un botón del menú ("Jugar") pasa a pantalla completa: sin la barra del
    // navegador el juego se ve entero. Es un gesto del usuario, que es lo que exige el navegador.
    if (touch.matches && requestFs) {
        document.getElementById('overlay-buttons').addEventListener('click', () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) return;
            Promise.resolve(requestFs.call(el)).catch(() => { /* sin permiso: se sigue tal cual */ });
        }, { once: true });
    }
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
