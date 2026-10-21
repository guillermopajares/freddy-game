window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    // Con ratón se ve el mueble de recreativa; en pantallas táctiles, solo la pantalla (ver css).
    const touch = window.matchMedia('(pointer: coarse)');

    // Escala el mueble (o el lienzo lógico de 960x720 en táctil) para que quepa en la ventana
    // y ajusta la resolución interna del canvas para que no se pixele al ampliarlo.
    // Del mueble deben caber el ancho (1100 con el vuelo del panel) y la tabla superior + marquesina + pantalla + mandos (1130 de alto).
    const fit = () => {
        const scale = touch.matches ? touchScale() : Math.min(window.innerWidth / 1100, window.innerHeight / 1130, 1.5);
        document.documentElement.style.setProperty('--scale', scale);
        game.resize(scale);
    };

    // En táctil los mandos van fuera de la pantalla de juego: en bandas a los lados (horizontal)
    // o debajo (vertical). Se descuentan las zonas seguras, que el css pone de padding en #touch-controls.
    const controls = document.getElementById('touch-controls');
    const touchScale = () => {
        const root = document.documentElement;
        const cs = getComputedStyle(controls);
        const w = window.innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const h = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const portrait = h > w;
        // Cada banda lateral necesita dos botones de 58 + hueco + márgenes (150); en vertical, debajo,
        // dos filas de botones con margen (190)
        const scale = portrait ? Math.min(w / 966, (h - 190) / 726, 1.5) : Math.min((w - 300) / 966, h / 726, 1.5);
        // Botón tan grande como quepa (44-64 px): en horizontal, en su banda; en vertical, en media pantalla
        // menos la columna central de pausa
        const band = portrait ? w / 2 - 30 : (w - 960 * scale) / 2;
        root.dataset.touch = portrait ? 'portrait' : 'landscape';
        root.style.setProperty('--btn', `${Math.max(44, Math.min(64, (band - 34) / 2))}px`);
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
