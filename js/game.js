const STEP = 1000 / 60; // la física va a 60 Hz aunque la pantalla refresque a 120 Hz
const STAR_TYPES = new Set(['coin', 'star', 'heart']); // lo que cuenta para las estrellas del nivel
const POWER_TYPES = new Set(['triple', 'gold', 'shield']);
const ELITE_TINT = 'rgba(220, 0, 60, 0.35)';
const BACKGROUNDS = ['bg_00', 'bg_01', 'bg_02', 'bg_03', 'bg_04', 'bg_05'];
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
const BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// localStorage puede lanzar (modo privado, cookies bloqueadas): entonces no se guarda nada.
function safeStorage() {
    try {
        return window.localStorage;
    } catch (e) {
        return null;
    }
}

function formatTime(seconds) {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Barras de la selección (0-1). Se calculan de los mismos campos que usa Player, para que el panel
// no mienta: velocidad, altura de salto (crece con el cuadrado del impulso), daño y alcance del golpe.
function characterStats(c) {
    const speed = c.speed ?? 3.5;
    const jump = (c.jumpForce ?? -12) ** 2;
    const bar = (v, min, max) => Math.max(0.08, Math.min(1, (v - min) / (max - min)));
    return [
        ['Velocidad', bar(speed, 2.2, 4.6)],
        ['Salto', bar(jump + ((c.jumps ?? 2) - 2) * 40, 100, 196)],
        ['Fuerza', bar(2 + (c.punch || 0), 0, 4)],
        ['Alcance', bar(75 + (c.reach || 0), 40, 115)],
    ];
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize(1);

        this.input = new InputHandler();
        this.backgrounds = {};
        this.scenery = new Scenery(this.backgrounds);
        this.progress = new Progress(safeStorage(), IS_TOUCH ? { difficulty: 'easy' } : {});
        this.state = 'loading';
        this.currentLevel = 0;
        this.player = null;
        this.level = null;
        this.enemies = [];
        this.enemyProjectiles = [];
        this.collectibles = [];
        this.totalCollectibles = 0;
        this.collectedCount = 0;
        this.particles = [];
        this.menuParticles = [];
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flashAlpha = 0;
        this.fade = 0; // negro a pantalla completa: fundidos al entrar y al cruzar la puerta
        this.hitstop = 0;
        this.camX = 0;
        this.banner = null; // { text, timer }
        this.boss = null;
        this.pendingBoss = null;
        this.flood = null;
        this.stolen = false;
        this.combo = 0;
        this.comboTimer = 0;
        this.levelTime = 0;
        this.exitTimer = 0;
        this.pendingLevel = null; // { index, stats } mientras se muestra la historia
        this.selected = null;     // elemento del overlay elegido con el teclado
        this.spaceLock = false;   // Espacio sigue pulsado desde el menú: no debe lanzar papel

        const $ = id => document.getElementById(id);
        this.overlay = $('overlay');
        this.overlayTitle = $('overlay-title');
        this.overlaySubtitle = $('overlay-subtitle');
        this.overlayText = $('overlay-text');
        this.overlayStars = $('overlay-stars');
        this.overlayScore = $('overlay-score');
        this.overlayButtons = $('overlay-buttons');
        this.overlayContent = $('overlay-content');
        this.overlayQuote = $('overlay-quote');
        this.characterPreview = $('character-preview');
        const play = $('preview-play');
        play.addEventListener('pointerdown', e => e.preventDefault()); // sin foco, como los del overlay
        play.addEventListener('click', () => this.selectCharacter(this.character));
        this.panels = $('panels');
        this.nameEntry = $('name-entry');
        this.nameInput = $('name-input');
        this.nameSubmit = this.nameEntry.querySelector('button');
        this.nameStatus = $('name-status');
        this.toast = $('toast');
        this.toastQueue = [];
        this.onlineRanking = null; // última lista de la API; null = sin cargar o sin conexión
        this.rankingLoading = false;
        this.sending = false;
        this.savedLocally = false; // la copia local se guarda una vez aunque se reintente el envío

        this.bindSettings();
        this.nameEntry.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendScore();
        });
        // Esc suelta el campo del nombre para seguir navegando sin enviar
        this.nameInput.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') this.nameInput.blur();
        });
        // Sin foco al hacer clic: si no, InputHandler ignoraría las flechas
        this.panels.querySelectorAll('summary').forEach(s => s.addEventListener('pointerdown', e => e.preventDefault()));

        // Cambiar de pestaña o ventana pausa el juego
        window.addEventListener('blur', () => {
            if (this.state === 'playing') this.pause();
        });
    }

    async init() {
        this.drawLoading(0);
        try {
            const sources = await this.assetSources();
            this.sources = sources;
            this.sheets = {};
            this.portraits = {};
            this.sheetLoads = {};
            // Al arrancar solo Freddy (decorado y menú), el elegido y un rival: las diez hojas son ~25 MB
            // y en móvil retrasaban mucho el menú. El resto se baja después, de una en una (loadOtherSheets).
            const others = Object.keys(CHARACTERS).filter(id => id !== 'freddy' && id !== this.character);
            const first = new Set(['freddy', this.character, others[Math.floor(Math.random() * others.length)]]);
            const total = BACKGROUNDS.length + first.size + 3;
            let loaded = 0;
            const done = () => this.drawLoading(++loaded / total);
            // El coche no tiene verdes propios: el que asoma por el parabrisas y las ruedas es fondo
            this.carSheet = new SpriteSheet(sources.dani_car, DANI_CAR_FRAMES, { seeThrough: true });
            this.enemySheet = new SpriteSheet(sources.enemies, ENEMY_FRAMES);
            this.itemSheet = new SpriteSheet(sources.elements, ITEM_FRAMES);
            this.ultSheets = {};
            await Promise.all([
                ...BACKGROUNDS.map(name => loadImage(sources[name]).then(img => { this.backgrounds[name] = img; done(); })),
                ...[...first].map(id => this.loadSheet(id).then(done)),
                this.carSheet.load().then(done),
                this.enemySheet.load().then(done),
                this.itemSheet.load().then(done),
            ]);
            this.freddySheet = this.sheets.freddy;
        } catch (e) {
            console.error('Failed to load assets', e);
            this.ctx.fillText('Error cargando los sprites', 480, 420);
            return;
        }
        Object.keys(ENEMY_FRAMES)
            .filter(name => name.startsWith('bug_') || name.startsWith('e404_'))
            .forEach(name => this.enemySheet.addTint(name, `${name}_elite`, ELITE_TINT));

        this.initMenuParticles();
        this.showMenu();
        this.loadOtherSheets();
        this.lastTime = performance.now();
        this.accumulator = 0;
        requestAnimationFrame(t => this.gameLoop(t));
    }

    // Carga (una sola vez) la hoja de un personaje y su retrato para la pantalla de selección.
    loadSheet(id) {
        if (!this.sheetLoads[id]) {
            // Las hojas nuevas van apretadas (keepLargest quita trozos de frames vecinos) y no tienen verdes
            // propios: el que queda entre brazo y cuerpo es fondo (seeThrough)
            const extra = id !== 'freddy';
            const sheet = new SpriteSheet(this.sources[id], CHARACTERS[id].frames, { keepLargest: extra, seeThrough: extra });
            this.sheetLoads[id] = sheet.load().then(() => {
                this.sheets[id] = sheet;
                this.portraits[id] = sheet.frames.idle[0].canvas.toDataURL();
                if (this.state === 'select') this.newGame(this.pendingLevel.index); // aparece su retrato
            });
        }
        return this.sheetLoads[id];
    }

    // Hoja de la transformación (ulti). Aparte de this.sheets: no es un personaje elegible ni rival.
    loadUltimate(u) {
        if (!this.sheetLoads[u.sheet]) {
            const sheet = new SpriteSheet(this.sources[u.sheet], u.frames, { keepLargest: true, seeThrough: true });
            this.sheetLoads[u.sheet] = sheet.load().then(() => { this.ultSheets[u.sheet] = sheet; });
        }
        return this.sheetLoads[u.sheet];
    }

    // De una en una para no competir con la partida; si alguna falla, sigue con las demás.
    async loadOtherSheets() {
        for (const id of Object.keys(CHARACTERS)) {
            await this.loadSheet(id).catch(e => console.error('Failed to load', id, e));
        }
    }

    // Por http se cargan los ficheros sueltos (en paralelo y cacheables). Con file:// el
    // navegador no deja leer sus píxeles, así que se usa la versión embebida js/assets.js.
    async assetSources() {
        if (location.protocol !== 'file:') return ASSET_FILES;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/assets.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        return ASSETS;
    }

    drawLoading(fraction) {
        const ctx = this.ctx;
        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.fillStyle = '#0f0c29';
        ctx.fillRect(0, 0, 960, 720);
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Cargando...', 480, 340);
        ctx.fillStyle = '#333';
        ctx.fillRect(330, 370, 300, 12);
        ctx.fillStyle = '#7CFC00';
        ctx.fillRect(330, 370, 300 * fraction, 12);
    }

    // --- Ajustes, logros y ranking -------------------------------------------------

    bindSettings() {
        const s = this.progress.settings;
        const volume = document.getElementById('opt-volume');
        const shake = document.getElementById('opt-shake');
        const flash = document.getElementById('opt-flash');
        const difficulty = document.getElementById('opt-difficulty');
        const cabinet = document.getElementById('opt-cabinet');
        const crt = document.getElementById('opt-crt');
        volume.value = s.volume;
        shake.checked = s.shake;
        flash.checked = s.flash;
        difficulty.value = s.difficulty;
        cabinet.value = s.cabinet;
        crt.checked = s.crt;
        Sound.setVolume(s.volume / 100);

        const onChange = (e) => {
            s.volume = Number(volume.value);
            s.shake = shake.checked;
            s.flash = flash.checked;
            s.difficulty = difficulty.value;
            s.cabinet = cabinet.value;
            s.crt = crt.checked;
            Sound.setVolume(s.volume / 100);
            this.progress.save();
            if (this.onLayoutChange) this.onLayoutChange(); // main.js recoloca el mueble
            if (e.type === 'change') e.target.blur(); // que Espacio/flechas vuelvan al juego
        };
        [volume, shake, flash, difficulty, cabinet, crt].forEach(el => {
            el.addEventListener('input', onChange);
            el.addEventListener('change', onChange);
        });
        this.difficultySelect = difficulty;
    }

    unlockAchievement(id) {
        if (!this.progress.unlock(id)) return;
        this.showToast(`🏆 ${ACHIEVEMENTS[id]}`);
        Sound.play('achievement');
    }

    // Avisos en HTML por encima de todo (también de los menús), uno detrás de otro.
    showToast(text) {
        this.toastQueue.push(text);
        if (this.toastQueue.length > 1) return;
        const next = () => {
            this.toast.textContent = this.toastQueue[0];
            this.toast.classList.add('show');
            setTimeout(() => {
                this.toast.classList.remove('show');
                setTimeout(() => {
                    this.toastQueue.shift();
                    if (this.toastQueue.length) next();
                }, 400);
            }, 3000);
        };
        next();
    }

    renderAchievements() {
        const got = this.progress.data.achievements;
        const ids = Object.keys(ACHIEVEMENTS);
        document.querySelector('#achievements summary').textContent =
            `Logros (${ids.filter(id => got[id]).length}/${ids.length})`;
        const list = document.getElementById('achievement-list');
        list.replaceChildren(...ids.map(id => {
            const li = document.createElement('li');
            li.textContent = `${got[id] ? '🏆' : '🔒'} ${ACHIEVEMENTS[id]}`;
            if (!got[id]) li.className = 'locked';
            return li;
        }));
    }

    // Ranking online; si la API no contesta, el de este navegador.
    renderRanking() {
        const offline = !this.onlineRanking && !this.rankingLoading;
        let lines;
        if (this.onlineRanking) {
            lines = this.onlineRanking.map(e => `${e.username} — ${e.points}`);
        } else if (this.rankingLoading) {
            lines = ['Cargando…'];
        } else {
            lines = this.progress.data.ranking.map(e =>
                `${e.name} — ${e.score} (${(DIFFICULTY[e.difficulty] || DIFFICULTY.normal).label})`);
        }
        document.querySelector('#ranking summary').textContent = offline ? 'Ranking (local, sin conexión)' : 'Ranking';
        document.getElementById('ranking-list').replaceChildren(...(lines.length ? lines : ['Aún no hay puntuaciones']).map(text => {
            const li = document.createElement('li');
            li.textContent = text;
            return li;
        }));
    }

    async refreshRanking() {
        if (this.rankingLoading) return;
        this.rankingLoading = true;
        this.renderRanking();
        try {
            this.onlineRanking = await RankingApi.fetchRanking(RANKING_SIZE);
        } catch (e) {
            this.onlineRanking = null;
        }
        this.rankingLoading = false;
        this.renderRanking();
    }

    // --- Pantallas (overlay HTML) ----------------------------------------------------

    // quote: frase del personaje elegido (con su retrato); preview: id del personaje a mostrar en grande.
    showOverlay({ titleClass = '', title, subtitle = null, text = '', quote = '', preview = null, score = '', buttons = [], panels = false }) {
        this.overlay.classList.remove('hidden');
        this.overlayContent.classList.toggle('select', !!preview);
        this.characterPreview.hidden = !preview;
        if (preview) this.renderPreview(preview);
        this.overlayQuote.hidden = !quote;
        if (quote) {
            this.overlayQuote.querySelector('img').src = this.portraits[this.character] || BLANK_IMG;
            this.overlayQuote.querySelector('b').textContent = CHARACTERS[this.character].name;
            this.overlayQuote.querySelector('q').textContent = quote;
        }
        this.overlayTitle.className = titleClass;
        this.overlayTitle.textContent = title;
        this.overlaySubtitle.hidden = !subtitle;
        this.overlaySubtitle.textContent = subtitle || '';
        this.overlayText.textContent = text;
        this.overlayStars.innerHTML = '';
        this.overlayScore.textContent = score;
        this.nameEntry.hidden = true;
        this.setNameStatus('');
        this.panels.hidden = !panels;
        this.difficultySelect.disabled = this.state !== 'menu'; // la dificultad se elige al empezar
        if (panels) {
            this.renderAchievements();
            this.renderRanking();
            if (!this.onlineRanking) this.refreshRanking(); // tras un fallo se reintenta en el siguiente menú
        }
        this.overlayButtons.replaceChildren(...buttons.map(({ label, action, secondary, img }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            if (secondary) btn.className = 'secondary';
            if (img) {
                const image = new Image();
                image.src = img;
                image.alt = '';
                btn.prepend(image);
                btn.classList.add('character');
            }
            btn.addEventListener('pointerdown', e => e.preventDefault()); // sin foco: Enter no lo repite
            btn.addEventListener('click', action);
            return btn;
        }));
        this.select(this.overlayButtons.firstElementChild);
    }

    // --- Navegación del overlay con teclado ------------------------------------------

    // Lo elegible, en orden de pantalla; se recalcula porque abrir un panel añade sus controles.
    menuItems() {
        const items = this.nameEntry.hidden ? [] : [this.nameInput];
        items.push(...this.overlayButtons.children);
        if (!this.panels.hidden) {
            this.panels.querySelectorAll('details').forEach(d => {
                items.push(d.querySelector('summary'));
                if (d.open) items.push(...d.querySelectorAll('input, select'));
            });
        }
        return items.filter(el => !el.disabled);
    }

    select(el) {
        if (this.selected) this.selected.classList.remove('selected');
        this.selected = el || null;
        if (!el || IS_TOUCH) return;
        el.classList.add('selected');
        // Sin barra de scroll, la selección no debe perderse; un panel abierto se muestra entero
        const box = el.tagName === 'SUMMARY' && el.parentElement.open ? el.parentElement : el;
        box.scrollIntoView({ block: 'nearest' });
    }

    moveSelection(step) {
        const items = this.menuItems();
        const i = items.indexOf(this.selected);
        this.select(items[Math.max(0, Math.min(items.length - 1, i + step))]);
    }

    // ←/→: ajusta volumen y dificultad; en el resto pasa al vecino (botones en fila).
    adjustSelection(dir) {
        const el = this.selected;
        if (el && el.type === 'range') {
            el.value = Number(el.value) + dir * Number(el.step);
            el.dispatchEvent(new Event('input'));
        } else if (el && el.tagName === 'SELECT') {
            el.selectedIndex = Math.max(0, Math.min(el.options.length - 1, el.selectedIndex + dir));
            el.dispatchEvent(new Event('change'));
        } else if (!el || el.type !== 'checkbox') {
            this.moveSelection(dir);
        }
    }

    activateSelection() {
        const el = this.selected;
        if (!el || !this.menuItems().includes(el)) return;
        if (el === this.nameInput) el.focus();
        else if (el.tagName === 'BUTTON' || el.tagName === 'SUMMARY' || el.type === 'checkbox') el.click();
        if (el.tagName === 'SUMMARY') this.select(el);
    }

    // Esc cierra el panel abierto; devuelve false si no había ninguno.
    closePanel() {
        const open = this.panels.hidden ? null : this.panels.querySelector('details[open]');
        if (!open) return false;
        const target = (this.selected && this.selected.closest('details[open]')) || open;
        target.open = false;
        this.select(target.querySelector('summary'));
        return true;
    }

    // Flechas/WASD o mando; en la selección de personaje ←/→ los cambia handleInput.
    handleMenuNav(accept) {
        const input = this.input;
        const pressed = (...names) => names.some(n => input.isPressed(n));
        if (pressed('ArrowUp', 'KeyW')) this.moveSelection(-1);
        if (pressed('down')) this.moveSelection(1);
        if (this.state !== 'select') {
            if (pressed('left')) this.adjustSelection(-1);
            if (pressed('right')) this.adjustSelection(1);
        }
        if (accept || pressed('Space', 'Enter')) {
            this.spaceLock = input.isPressed('Space');
            this.activateSelection();
        }
    }

    hideOverlay() {
        this.overlay.classList.add('hidden');
    }

    // Al acabar la partida se pide el nombre para subir la puntuación al ranking online.
    offerRanking() {
        this.savedLocally = false;
        if (this.player.score <= 0) return;
        this.nameEntry.hidden = false;
        this.nameInput.value = this.progress.data.playerName;
        if (!IS_TOUCH) {
            this.nameInput.focus();
            this.nameInput.select();
        }
    }

    setNameStatus(text) {
        this.nameStatus.textContent = text;
        this.nameStatus.hidden = !text;
    }

    async sendScore() {
        const name = this.nameInput.value.trim().slice(0, NAME_MAX);
        if (!name || this.sending) return;
        const score = this.player.score;
        const state = this.state;
        if (!this.savedLocally) {
            this.progress.addToRanking(name, score, this.progress.settings.difficulty);
            this.savedLocally = true;
        }
        this.progress.data.playerName = name;
        this.progress.save();

        this.sending = true;
        this.nameInput.disabled = this.nameSubmit.disabled = true;
        this.setNameStatus('Enviando…');
        let result = null;
        try {
            result = await RankingApi.submitScore(name, score);
        } catch (e) { /* se avisa abajo y se puede reintentar */ }
        this.sending = false;
        this.nameInput.disabled = this.nameSubmit.disabled = false;
        if (this.state !== state) return; // se ha salido de la pantalla mientras tanto

        if (!result) {
            this.setNameStatus('No se pudo enviar. Revisa la conexión y pulsa Enviar para reintentar.');
            if (!IS_TOUCH) this.nameInput.focus(); // Enter reintenta en vez de pulsar el botón elegido
            return;
        }
        this.nameEntry.hidden = true;
        this.setNameStatus(`¡Puesto #${result.position} en el ranking!`);
        // Se enseña el ranking actualizado debajo de los botones
        this.panels.hidden = false;
        this.renderAchievements();
        const ranking = document.getElementById('ranking');
        ranking.open = true;
        await this.refreshRanking();
        ranking.scrollIntoView({ block: 'nearest' });
    }

    showMenu() {
        this.state = 'menu';
        Sound.music(null);
        const { unlocked, highScore } = this.progress.data;
        const playable = Math.min(unlocked, levels.length);
        const levelButtons = [];
        for (let i = 2; i <= playable; i++) {
            levelButtons.push({ label: `Nivel ${i}`, secondary: true, action: () => this.newGame(i - 1) });
        }
        this.showOverlay({
            title: 'FREDDY GAME',
            subtitle: 'Desatasca el código',
            text: IS_TOUCH ? 'Toca Jugar para empezar' : `↑↓ elegir · ESPACIO aceptar${playable > 1 ? ` · 1-${playable}: nivel` : ''}`,
            score: highScore ? `Récord: ${highScore}` : '',
            buttons: [{ label: 'Jugar', action: () => this.newGame(0) }, ...levelButtons, {
                label: `Dificultad: ${this.progress.difficulty.label}`, secondary: true, action: () => this.cycleDifficulty(),
            }],
            panels: true,
        });
    }

    // Botón del menú: pasa a la siguiente dificultad y lo refleja en el desplegable de Ajustes.
    cycleDifficulty() {
        const ids = Object.keys(DIFFICULTY);
        const s = this.progress.settings;
        s.difficulty = ids[(ids.indexOf(s.difficulty) + 1) % ids.length];
        this.difficultySelect.value = s.difficulty;
        this.progress.save();
        this.showMenu();
        this.select(this.overlayButtons.lastElementChild);
    }

    // Elegir personaje; los demás aparecen como jefes rivales. Tocar una tarjeta lo muestra en grande
    // con sus estadísticas; tocarla otra vez (o ENTER, o "¡A jugar!") lo elige.
    newGame(levelIndex) {
        this.state = 'select';
        this.pendingLevel = { index: levelIndex };
        this.showOverlay({
            title: 'ELIGE PERSONAJE',
            subtitle: 'LOS DEMÁS SERÁN TUS RIVALES',
            text: IS_TOUCH ? '' : '◀ ▶ elegir · ENTER jugar',
            preview: this.character,
            buttons: Object.entries(CHARACTERS).map(([id, c]) => ({
                label: c.name,
                img: this.portraits[id] || BLANK_IMG, // hoja aún sin llegar: hueco del mismo alto
                secondary: id !== this.character,
                action: () => (id === this.character ? this.selectCharacter(id) : this.previewCharacter(id)),
            })),
        });
        this.select(this.overlayButtons.children[Object.keys(CHARACTERS).indexOf(this.character)]);
    }

    previewCharacter(id) {
        this.progress.settings.character = id;
        this.loadSheet(id); // al llegar su hoja se vuelve a pintar la selección con el retrato
        this.newGame(this.pendingLevel.index);
    }

    // Panel del personaje: retrato grande, lema y barras comparadas con el resto.
    renderPreview(id) {
        const c = CHARACTERS[id];
        const box = this.characterPreview;
        box.querySelector('.preview-img').src = this.portraits[id] || BLANK_IMG;
        box.querySelector('.preview-name').textContent = c.name;
        box.querySelector('.preview-motto').textContent = CHARACTER_STORY[id] ? CHARACTER_STORY[id].motto : c.desc;
        box.querySelector('.preview-stats').replaceChildren(...characterStats(c).map(([label, value]) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${label}</span><b><i style="width: ${Math.round(value * 100)}%"></i></b>`;
            return li;
        }));
        box.querySelector('.preview-tags').textContent = c.desc;
    }

    get character() {
        return CHARACTERS[this.progress.settings.character] ? this.progress.settings.character : 'freddy';
    }

    selectCharacter(id) {
        this.progress.settings.character = id;
        this.progress.save();
        // Si su hoja aún no ha llegado, se espera en la selección
        this.loadSheet(id).then(() => {
            if (this.state === 'select') this.showStory(this.pendingLevel.index, { lives: this.progress.difficulty.lives });
        });
    }

    randomRival() {
        // Solo entre las hojas ya cargadas (al arrancar se carga al menos un rival)
        const ids = Object.keys(this.sheets).filter(id => id !== this.character);
        return ids[Math.floor(Math.random() * ids.length)];
    }

    showStory(index, stats) {
        this.state = 'story';
        this.pendingLevel = { index, stats };
        const lore = CHARACTER_STORY[this.character];
        this.showOverlay({
            titleClass: 'level-complete-title',
            title: levels[index].name.toUpperCase(),
            text: STORY[index],
            quote: lore && lore.levels[index],
            buttons: [{ label: '¡Vamos!', action: () => this.startPendingLevel() }],
        });
    }

    startPendingLevel() {
        const { index, stats } = this.pendingLevel;
        this.startLevel(index, stats);
    }

    pause() {
        this.state = 'paused';
        this.showOverlay({
            title: 'PAUSA',
            text: IS_TOUCH ? '' : 'ESC/P para seguir · R para reiniciar el nivel',
            buttons: [
                { label: 'Seguir', action: () => this.resume() },
                { label: 'Reiniciar nivel', secondary: true, action: () => this.restartLevel() },
                { label: 'Salir al menú', secondary: true, action: () => this.showMenu() },
            ],
            panels: true,
        });
    }

    resume() {
        this.state = 'playing';
        this.hideOverlay();
    }

    restartLevel() {
        this.startLevel(this.currentLevel, this.levelStartStats);
    }

    nextLevel() {
        const next = this.currentLevel + 1;
        if (next >= levels.length) this.showVictory();
        else this.showStory(next, this.playerStats());
    }

    showLevelComplete() {
        this.state = 'levelComplete';
        Sound.music(null);

        const stars = this.collectedCount >= this.totalCollectibles ? 3 :
                      this.collectedCount >= this.totalCollectibles * 0.6 ? 2 : 1;
        const time = this.levelTime / 60;
        const best = this.progress.recordLevel(this.currentLevel, stars, time);
        this.progress.data.unlocked = Math.min(levels.length, this.progress.data.unlocked);
        this.progress.recordScore(this.player.score);

        if (this.player.hitsTaken === 0) this.unlockAchievement('noDamage');
        if (stars === 3) this.unlockAchievement('allStars');
        if (!this.stolen && this.level.enemies.some(e => e.type === 'Error404')) this.unlockAchievement('noSteal');
        if (this.currentLevel === 0 && time < 60) this.unlockAchievement('speedrun');

        this.showOverlay({
            titleClass: 'level-complete-title',
            title: '¡NIVEL SUPERADO!',
            text: IS_TOUCH ? '' : 'ESPACIO o ENTER para seguir',
            score: `Puntos: ${this.player.score} · Tiempo: ${formatTime(time)} (mejor ${formatTime(best.time)})`,
            buttons: [{ label: 'Siguiente', action: () => this.nextLevel() }],
        });
        this.overlayStars.innerHTML = Array(3).fill(0).map((_, i) =>
            `<span class="${i < stars ? 'star-filled' : 'star-empty'}">★</span>`
        ).join('');
    }

    showGameOver() {
        this.state = 'gameOver';
        Sound.music(null);
        Sound.play('gameOver');
        this.progress.recordScore(this.player.score);
        this.showOverlay({
            titleClass: 'game-over-title',
            title: 'GAME OVER',
            text: IS_TOUCH ? '' : '↑↓ elegir · ESPACIO aceptar',
            score: `Puntos: ${this.player.score} · Récord: ${this.progress.data.highScore}`,
            buttons: [
                { label: 'Reintentar nivel', action: () => this.startLevel(this.currentLevel, { ...this.levelStartStats, lives: this.progress.difficulty.lives }) },
                { label: 'Menú', secondary: true, action: () => this.showMenu() },
            ],
        });
        this.offerRanking();
    }

    showVictory() {
        this.state = 'victory';
        Sound.music(null);
        Sound.play('victory');
        this.progress.recordScore(this.player.score);
        if (this.progress.settings.difficulty === 'hard') this.unlockAchievement('hardWin');
        this.showOverlay({
            titleClass: 'victory-title',
            title: '¡HAS GANADO!',
            text: (CHARACTER_STORY[this.character] || {}).ending || ENDING,
            score: `Puntos: ${this.player.score} · Récord: ${this.progress.data.highScore}`,
            buttons: [{ label: 'Menú', action: () => this.showMenu() }],
        });
        this.overlayStars.innerHTML = '<span class="star-filled">★★★★★</span>';
        this.offerRanking();

        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.camX + Math.random() * 960,
                y: -20,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                life: 120,
                color: ['#ffd700', '#ff6b35', '#4caf50', '#2196f3', '#e91e63'][Math.floor(Math.random() * 5)],
                size: Math.random() * 6 + 3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.1,
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.05;
                    this.rotation += this.rotSpeed;
                    this.life--;
                },
                draw(ctx) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    ctx.globalAlpha = Math.min(1, this.life / 30);
                    ctx.fillStyle = this.color;
                    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                    ctx.restore();
                }
            });
        }
    }

    // --- Partida -----------------------------------------------------------------

    triggerScreenShake(intensity) {
        if (!this.progress.settings.shake) return;
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    }

    triggerFlash() {
        if (this.progress.settings.flash) this.flashAlpha = 0.3;
    }

    announce(text) {
        this.banner = { text, timer: 150 };
    }

    spawnEnemy(enemy) {
        this.enemies.push(enemy);
    }

    // Crea un enemigo de los datos del nivel aplicando la dificultad elegida.
    createEnemy(type, x, y, opts = {}) {
        const d = this.progress.difficulty;
        const enemy = new ENEMY_TYPES[type](x, y, { ...opts, elite: opts.elite || (d.elite && !type.startsWith('Boss')) });
        enemy.health = enemy.maxHealth = Math.max(1, Math.round(enemy.maxHealth * (enemy.isBoss ? d.bossHealth : d.enemyHealth)));
        if (enemy.isBoss) enemy.rest = d.bossRest || 1;
        return enemy;
    }

    initMenuParticles() {
        for (let i = 0; i < 30; i++) {
            this.menuParticles.push({
                x: Math.random() * 960,
                y: Math.random() * 720,
                size: Math.random() * 4 + 2,
                speedY: Math.random() * 0.5 + 0.2,
                speedX: (Math.random() - 0.5) * 0.3,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                alpha: Math.random() * 0.3 + 0.1,
                type: Math.random() > 0.5 ? 'paper' : 'star'
            });
        }
    }

    // stats: vidas/puntos/munición que se arrastran entre niveles.
    startLevel(levelIndex, stats = {}) {
        this.currentLevel = levelIndex;
        this.level = levels[levelIndex];
        this.level.reset();
        this.scenery.setLevel(this.level);
        this.levelTime = 0;
        this.player = new Player(this.level.spawnX, this.level.spawnY,
            { ...stats, character: CHARACTERS[this.character], mercy: this.progress.difficulty.mercy });
        const ult = CHARACTERS[this.character].ultimate;
        if (ult) this.loadUltimate(ult).catch(e => console.error('Failed to load', ult.sheet, e));
        document.getElementById('ult').hidden = !ult;
        document.getElementById('touch-ultimate').hidden = !ult;
        this.levelStartStats = { ...stats };
        this.camX = 0;
        this.fade = 1;

        this.enemies = this.level.enemies.map(e => this.createEnemy(e.type, e.x, e.y, e));
        this.enemyProjectiles = [];
        this.boss = null;
        const boss = this.level.boss;
        if (boss && (boss.type === 'BossRival' || Math.random() < (boss.rivalChance || 0))) {
            const id = this.randomRival();
            // Sale al suelo de la arena: los jefes que caen se atascan en plataformas pequeñas
            this.pendingBoss = { ...boss, type: 'BossRival', y: GROUND_Y - 150, character: CHARACTERS[id],
                sheet: this.sheets[id], carSheet: this.carSheet };
        } else {
            this.pendingBoss = boss;
        }
        this.stolen = false;
        this.combo = 0;
        this.comboTimer = 0;
        const flood = this.level.flood;
        this.flood = flood && {
            x: -400,
            speed: flood.speed,
            delay: flood.delay,
            stopX: (this.level.boss ? this.level.boss.arenaX : this.level.width) - 250,
            started: false,
        };

        this.collectibles = this.level.collectibles.map(c => new Collectible(c.x, c.y, c.type));
        this.totalCollectibles = this.collectibles.filter(c => STAR_TYPES.has(c.type)).length;
        this.collectedCount = 0;
        this.particles = [];

        this.state = 'playing';
        this.hideOverlay();
        this.announce(this.level.name);
        Sound.music('level');
        this.updateHUD();
    }

    playerStats() {
        return { lives: this.player.lives, score: this.player.score, ammo: this.player.ammo };
    }

    handleInput() {
        const input = this.input;
        const typing = document.activeElement === this.nameInput;
        const inMenu = !['loading', 'playing', 'exiting'].includes(this.state);
        const inGame = this.state === 'playing' || this.state === 'paused';
        // Start del mando: pausa en juego, acepta en los menús (si hiciera las dos, se anularían)
        const start = input.isPressed('start');
        if (inMenu && !typing) this.handleMenuNav(start && !inGame);

        if (this.state === 'menu') {
            for (let i = 1; i <= Math.min(this.progress.data.unlocked, levels.length); i++) {
                if (input.isPressed(`Digit${i}`)) this.newGame(i - 1);
            }
        }

        if (input.isPressed('pause') || (start && inGame)) {
            if (inMenu && !typing && this.closePanel()) return;
            if (this.state === 'playing') this.pause();
            else if (this.state === 'paused') this.resume();
        }

        // Elegir personaje con izquierda/derecha (teclado o mando)
        if (this.state === 'select') {
            const dir = (input.isPressed('right') ? 1 : 0) - (input.isPressed('left') ? 1 : 0);
            if (dir) {
                const ids = Object.keys(CHARACTERS);
                this.progress.settings.character = ids[(ids.indexOf(this.character) + dir + ids.length) % ids.length];
                this.newGame(this.pendingLevel.index);
            }
        }

        if (input.isPressed('mute')) {
            this.announce(Sound.toggleMute() ? 'SONIDO: NO' : 'SONIDO: SÍ');
        }

        if (input.isPressed('restart') && inGame) {
            this.restartLevel();
        }
    }

    get exitOpen() {
        return !this.pendingBoss && !this.boss;
    }

    update() {
        this.input.poll();
        // Micro-pausa al acertar: congela la acción unos frames; las pulsaciones esperan.
        if (this.state === 'playing' && this.hitstop > 0) {
            this.hitstop--;
            return;
        }
        this.handleInput();

        if (this.state === 'menu') {
            this.updateMenuParticles();
            this.input.clear();
            return;
        }

        if (this.state === 'exiting') this.updateExit();

        if (this.state !== 'playing') {
            this.particles.forEach(p => p.update());
            this.particles = this.particles.filter(p => p.life > 0);
            this.input.clear();
            return;
        }

        this.levelTime++;
        if (this.fade > 0) this.fade = Math.max(0, this.fade - 0.04);
        const level = this.level;
        const player = this.player;
        level.update(this.levelTime);
        this.scenery.update(player, this.camX);
        // El Espacio con el que se aceptó el menú no cuenta como salto hasta soltarlo
        if (this.spaceLock) this.input.justPressed.Space = false;
        player.update(this.input, level);
        if (this.spaceLock && !this.input.isDown('Space')) this.spaceLock = false;
        if (player.landed) {
            this.spawnDust(player.x + player.width / 2, player.y + player.height);
            Sound.play('land');
        }
        if (player.transformed) {
            const cx = player.x + player.width / 2;
            const cy = player.y + player.height / 2;
            this.spawnParticles(cx, cy, '#e53935', 24, 16);
            this.spawnParticles(cx, cy, '#1e88e5', 24, 16);
            this.announce(`¡${player.character.ultimate.name}!`);
            this.triggerScreenShake(10);
            this.triggerFlash();
        }
        this.enemies.forEach(e => e.update(player, level, this));
        this.enemyProjectiles.forEach(p => p.update());
        this.collectibles.forEach(c => c.update());

        this.handlePlayerAttacks();
        this.handleDamageToPlayer();
        this.handleCollectibles();
        this.handleCheckpoints();
        this.updateFlood();
        this.updateBossFight();

        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(p => p.active);
        if (this.comboTimer > 0 && --this.comboTimer === 0) this.combo = 0;

        if (player.dead) {
            if (player.deathTimer > 120) this.showGameOver();
        } else if (this.exitOpen && Collision.aabb(player.getBounds(), {
            x: level.exitX, y: level.exitY, width: level.exitWidth, height: level.exitHeight
        })) {
            this.startExit();
        }

        this.updateCamera();
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.life > 0);
        if (this.banner && --this.banner.timer <= 0) this.banner = null;

        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.intensity *= 0.85;
            if (this.screenShake.intensity < 0.5) {
                this.screenShake.intensity = 0;
                this.screenShake.x = 0;
                this.screenShake.y = 0;
            }
        }

        if (this.flashAlpha > 0) this.flashAlpha -= 0.02;

        this.updateHUD();
        this.input.clear();
    }

    // Freddy entra por la puerta: tira de la cisterna y la pantalla funde a negro.
    startExit() {
        this.state = 'exiting';
        this.exitTimer = 0;
        this.player.score += 50 * this.player.lives;
        this.progress.save(); // pisotones acumulados
        Sound.music(null);
        Sound.play('flush');
    }

    updateExit() {
        this.exitTimer++;
        this.fade = Math.min(1, Math.max(0, (this.exitTimer - 20) / 40));
        if (this.exitTimer >= 70) this.showLevelComplete();
    }

    // La cámara sigue a Freddy mirando un poco hacia delante; en la arena del jefe queda fija.
    updateCamera() {
        const level = this.level;
        const target = this.player.x + this.player.width / 2 - 480 + this.player.facing * 80;
        const max = level.width - 960;
        const clamped = Math.max(level.leftWall, Math.min(max, target));
        this.camX += (clamped - this.camX) * 0.1;
        this.camX = Math.max(0, Math.min(max, this.camX));
    }

    // Riada (nivel 4): avanza desde la izquierda, arrastra a los enemigos y hace daño a Freddy.
    updateFlood() {
        const flood = this.flood;
        if (!flood || this.levelTime < flood.delay) return;
        if (!flood.started) {
            flood.started = true;
            this.announce('¡LA RIADA! ¡CORRE!');
            this.triggerScreenShake(10);
            Sound.play('flood');
        }
        flood.x = Math.min(flood.stopX, flood.x + flood.speed);

        const player = this.player;
        if (player.respawned) flood.x = Math.min(flood.x, player.x - 300);
        if (!player.dead && player.x < flood.x - 10) this.hurtPlayer(player.x - 100);
        this.enemies.forEach(e => {
            if (!e.isBoss && !e.dying && e.x + e.width < flood.x) e.takeDamage(99);
        });
    }

    hitEnemy(enemy, damage, color, fromX) {
        const killed = enemy.takeDamage(damage, fromX);
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        this.spawnParticles(cx, cy, color);
        this.hitstop = Math.max(this.hitstop, killed ? 6 : 3);
        if (!killed) {
            Sound.play('hit');
            return;
        }

        Sound.play('kill');
        this.player.addUltimate(enemy.isBoss ? 40 : 20);
        this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
        this.comboTimer = 180;
        if (this.combo >= 5) this.unlockAchievement('combo5');
        if (enemy.achievement) this.unlockAchievement(enemy.achievement);
        const points = enemy.score * Math.min(this.combo, 5);
        this.player.score += points;
        this.spawnText(cx, enemy.y, this.combo > 1 ? `+${points} x${this.combo}` : `+${points}`);
        this.triggerScreenShake(enemy.isBoss ? 16 : 5);
        // Los bugs a veces sueltan papel; el 404 devuelve lo que robó
        const dropY = enemy.y + enemy.height - 34;
        const paper = !enemy.isBoss && (enemy.carrying || Math.random() < 0.35);
        if (paper) this.collectibles.push(new Collectible(cx - 14, dropY, 'paper'));
        if (Math.random() < enemy.heartDropChance * (this.progress.difficulty.hearts || 1)) {
            const heart = new Collectible(cx - 14 + (paper ? 30 : 0), dropY, 'heart');
            heart.dropped = true; // no cuenta para las estrellas del nivel
            this.collectibles.push(heart);
        }
    }

    handlePlayerAttacks() {
        const player = this.player;
        const alive = this.enemies.filter(e => !e.dying);

        player.projectiles.forEach(proj => {
            alive.forEach(enemy => {
                if (!proj.active || enemy.dying || proj.hits.has(enemy)) return;
                if (!Collision.aabb(proj.getBounds(), enemy.getBounds())) return;
                proj.hits.add(enemy);
                if (!proj.pierce) proj.active = false;
                this.hitEnemy(enemy, proj.damage, '#ff6b35', proj.x - proj.velocityX * 10);
            });
        });

        // Embestida en coche (Dani): cada enemigo recibe un golpe por embestida
        if (player.ramming) {
            alive.forEach(enemy => {
                if (enemy.dying || player.meleeHits.has(enemy)) return;
                if (!Collision.aabb(player.getBounds(), enemy.getBounds())) return;
                player.meleeHits.add(enemy);
                this.hitEnemy(enemy, 3, '#3a6ea5', player.x + player.width / 2);
            });
        }

        const melee = player.getMeleeBounds();
        if (melee) {
            alive.forEach(enemy => {
                if (enemy.dying || player.meleeHits.has(enemy)) return;
                if (!Collision.aabb(melee, enemy.getBounds())) return;
                player.meleeHits.add(enemy);
                this.hitEnemy(enemy, player.meleeDamage, '#c0392b', player.x + player.width / 2);
            });
            // El desatascador devuelve al vacío los píxeles y babas
            this.enemyProjectiles.forEach(p => {
                if (p.active && Collision.aabb(melee, p.getBounds())) {
                    p.active = false;
                    player.score += 10;
                    this.spawnParticles(p.x, p.y, '#fff');
                    Sound.play('hit');
                }
            });
        }
    }

    // heavy = golpe de jefe: Freddy acaba derribado.
    hurtPlayer(fromX, heavy = false) {
        const player = this.player;
        if (!player.takeDamage(1, fromX, heavy)) return;
        this.combo = 0;
        this.comboTimer = 0;
        this.spawnParticles(player.x + player.width / 2, player.y + player.height / 2, heavy ? '#6d4c41' : '#e74c3c');
        this.triggerScreenShake(heavy ? 12 : 8);
        this.triggerFlash();
    }

    handleDamageToPlayer() {
        const player = this.player;
        if (player.dead) return;
        const bounds = player.getBounds();

        this.enemies.forEach(enemy => {
            if (enemy.dying) return;
            const attack = enemy.getAttackBounds();
            if (attack && Collision.aabb(bounds, attack)) this.hurtPlayer(enemy.x + enemy.width / 2, true);
            if (!Collision.aabb(bounds, enemy.getBounds())) return;

            // Pisotón: caer sobre el enemigo le hace daño y rebota.
            const prevBottom = player.y + player.height - player.velocityY;
            if (player.velocityY > 1 && prevBottom <= enemy.y + 12) {
                player.velocityY = -9;
                player.invincibleTimer = Math.max(player.invincibleTimer, 12);
                player.jumpsLeft = player.maxJumps - 1;
                Sound.play('stomp');
                if (++this.progress.data.stats.stomps >= 25) this.unlockAchievement('stomper');
                this.hitEnemy(enemy, 1, '#ffd700');
                return;
            }
            // Un jefe que solo camina no hace daño al tocarlo: para pegarle hay que estar pegado a él
            // y, como avanza hacia Freddy, lo volvía a tumbar cada vez que acababa la invulnerabilidad.
            // Su cuerpo aparta a Freddy: si se quedara dentro, el siguiente ataque le daría sin aviso.
            if (enemy.isBoss && enemy.state === 'walk') {
                if (player.dashTimer === 0) {
                    const fromLeft = player.x + player.width / 2 < enemy.x + enemy.width / 2;
                    player.x = fromLeft ? enemy.x - player.width : enemy.x + enemy.width;
                }
                return;
            }
            this.hurtPlayer(enemy.x + enemy.width / 2, enemy.heavy);
        });

        this.enemyProjectiles.forEach(p => {
            if (p.active && Collision.aabb(bounds, p.getBounds())) {
                p.active = false;
                this.hurtPlayer(p.x, p.type === 'goo');
            }
        });

        this.level.fires.forEach(f => {
            const fire = this.level.fireBounds(f);
            if (fire && Collision.aabb(bounds, fire) && player.takeDamage(1, f.x)) {
                player.velocityY = -10;
                this.spawnParticles(f.x, f.y - 30, '#ff9800', 14);
                this.triggerScreenShake(6);
            }
        });

        this.level.hazards.forEach(h => {
            if (Collision.aabb(bounds, this.level.hazardBounds(h))) {
                if (player.takeDamage(1, h.x + h.width / 2)) {
                    player.velocityY = -10;
                    this.spawnParticles(player.x + player.width / 2, player.y + player.height, '#6d4c41');
                    this.triggerScreenShake(6);
                }
            }
        });
    }

    handleCollectibles() {
        const player = this.player;
        this.collectibles.forEach(c => {
            if (c.collected || !Collision.aabb(player.getBounds(), c.getBounds())) return;
            if (c.type === 'poison') {
                // Veneno: se rompe al tocarlo y quita una vida (salvo invulnerable o con escudo)
                c.collected = true;
                this.spawnParticles(c.x + c.width / 2, c.y + c.height / 2, '#7bd03a', 16);
                this.spawnText(c.x, c.y, '¡VENENO!');
                this.hurtPlayer(c.x + c.width / 2);
                return;
            }
            c.collected = true;
            player.score += c.value;
            if (c.type === 'coin') player.addUltimate(5);
            if (c.type === 'star') player.addUltimate(10);
            if (STAR_TYPES.has(c.type) && !c.dropped) this.collectedCount++;

            if (c.type === 'heart' && player.lives < Math.max(5, this.progress.difficulty.lives)) player.lives++;
            if (c.type === 'laptop') {
                // Vida extra: puede pasar del tope de los corazones
                player.lives = Math.min(9, player.lives + 1);
                this.spawnText(c.x, c.y, '+1 VIDA 💻');
                Sound.play('power');
            } else if (c.type === 'potion') {
                player.powers.turbo = POWER_TIME;
                this.spawnText(c.x, c.y, '¡POCIÓN TURBO!');
                Sound.play('power');
            } else if (c.type === 'paper') {
                player.ammo = Math.min(player.maxAmmo, player.ammo + 5);
                this.spawnText(c.x, c.y, '+5 🧻');
                Sound.play('paper');
            } else if (POWER_TYPES.has(c.type)) {
                if (c.type === 'shield') player.shield = true;
                else player.powers[c.type] = POWER_TIME;
                this.spawnText(c.x, c.y, { triple: '¡PAPEL TRIPLE!', gold: '¡DESATASCADOR DORADO!', shield: '¡ESCUDO!' }[c.type]);
                Sound.play('power');
            } else {
                Sound.play('coin');
            }
            this.spawnParticles(c.x + c.width / 2, c.y + c.height / 2, '#ffd700');
        });
    }

    handleCheckpoints() {
        const player = this.player;
        this.level.checkpoints.forEach(c => {
            if (c.reached || player.dead || Math.abs(player.x + player.width / 2 - c.x) > 30) return;
            c.reached = true;
            player.spawnX = c.x - player.width / 2;
            player.spawnY = c.y - player.baseHeight - 10;
            this.spawnText(c.x, c.y - 80, 'CHECKPOINT');
            Sound.play('checkpoint');
        });
    }

    // Al entrar en la arena se cierra la pared izquierda y aparece el jefe; la salida se abre al vencerlo.
    updateBossFight() {
        const level = this.level;
        if (this.pendingBoss && this.player.x > this.pendingBoss.arenaX + 60) {
            const b = this.pendingBoss;
            this.pendingBoss = null;
            level.leftWall = b.arenaX;
            this.boss = this.createEnemy(b.type, b.x, b.y, b);
            this.boss.arenaX = b.arenaX;
            this.enemies.push(this.boss);
            this.announce(`¡JEFE: ${this.boss.name}!`);
            this.triggerScreenShake(10);
            Sound.play('boss');
            Sound.music('boss');
        }
        if (!this.boss) return;

        if (this.boss.markedForDeletion) {
            this.boss = null;
            this.announce('¡PUERTA ABIERTA!');
            Sound.music('level');
            return;
        }
        // Reabastecimiento: cae papel cada 6 s si no hay paquetes a la vista.
        if (this.levelTime % 360 === 0 && !this.collectibles.some(c => c.type === 'paper' && !c.collected)) {
            const arena = level.platforms.filter(p => p.baseX >= level.leftWall && !p.moveX);
            const p = arena[Math.floor(Math.random() * arena.length)];
            this.collectibles.push(new Collectible(p.x + p.width / 2 - 14, p.y - 34, 'paper'));
        }
    }

    updateMenuParticles() {
        this.menuParticles.forEach(p => {
            p.y -= p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotSpeed;

            if (p.y < -20) {
                p.y = 740;
                p.x = Math.random() * 960;
            }
            if (p.x < -20) p.x = 980;
            if (p.x > 980) p.x = -20;
        });
    }

    spawnParticles(x, y, color, count = 10, spread = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x,
                y,
                vx: (Math.random() - 0.5) * spread,
                vy: (Math.random() - 0.5) * spread - 2,
                life: 40,
                color,
                size: Math.random() * 5 + 2,
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.25;
                    this.life--;
                },
                draw(ctx) {
                    ctx.globalAlpha = this.life / 40;
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            });
        }
    }

    spawnDust(x, y) {
        this.spawnParticles(x, y - 4, 'rgba(200, 180, 150, 0.8)', 8, 6);
    }

    spawnText(x, y, text) {
        this.particles.push({
            x, y, text, life: 50,
            update() {
                this.y -= 1;
                this.life--;
            },
            draw(ctx) {
                ctx.globalAlpha = Math.min(1, this.life / 20);
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.font = 'bold 18px sans-serif';
                ctx.textAlign = 'center';
                ctx.strokeText(this.text, this.x, this.y);
                ctx.fillText(this.text, this.x, this.y);
                ctx.globalAlpha = 1;
            }
        });
    }

    updateHUD() {
        const player = this.player;
        if (!player) return;
        const powers = [
            player.shield ? '🛡️' : '',
            player.powers.triple > 0 ? `🧻x3 ${Math.ceil(player.powers.triple / 60)}s` : '',
            player.powers.gold > 0 ? `🪠 ${Math.ceil(player.powers.gold / 60)}s` : '',
            player.powers.turbo > 0 ? `🧪 ${Math.ceil(player.powers.turbo / 60)}s` : '',
        ].filter(Boolean).join(' ');
        // Barra de la ulti: se llena con la carga y, transformado, se vacía con el tiempo que queda
        if (player.character.ultimate) {
            const ult = document.getElementById('ult');
            const ready = player.ultimate >= ULT_MAX;
            ult.style.setProperty('--ult', player.ultTimer > 0 ? player.ultTimer / ULT_TIME : player.ultimate / ULT_MAX);
            ult.classList.toggle('ready', ready);
            document.getElementById('touch-ultimate').classList.toggle('ready', ready);
        }
        document.getElementById('lives').textContent = '❤️'.repeat(player.lives);
        document.getElementById('score').textContent = `Puntos: ${player.score}`;
        document.getElementById('ammo').textContent = `🧻 ${player.ammo}`;
        document.getElementById('power').textContent = powers;
        document.getElementById('level').textContent = `NIVEL ${this.currentLevel + 1}`;
        document.getElementById('collectibles').textContent = `★ ${this.collectedCount}/${this.totalCollectibles}`;
    }

    // --- Dibujo ------------------------------------------------------------------

    // El lienzo lógico es siempre 960x720, pero el canvas tiene tantos píxeles como se ven en
    // pantalla (escala CSS × devicePixelRatio). Si no, el navegador amplía 960x720 y se pixela.
    resize(cssScale) {
        // ponytail: tope 2x de resolución interna; a 3x hay que rellenar más del doble de píxeles y baja de 60 fps
        this.pixelRatio = Math.min(2, cssScale * (window.devicePixelRatio || 1));
        this.canvas.width = Math.round(960 * this.pixelRatio);
        this.canvas.height = Math.round(720 * this.pixelRatio);
        // 'high' (filtrado bicúbico) cuesta mucho a esta resolución: a 2x bajaba a 24 fps. 'medium' se ve igual.
        // Cambiar el tamaño del canvas reinicia el estado del contexto, por eso se fija aquí.
        this.ctx.imageSmoothingQuality = 'medium';
    }

    draw() {
        const ctx = this.ctx;
        ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        ctx.save();
        ctx.translate(this.screenShake.x, this.screenShake.y);
        ctx.clearRect(-10, -10, 980, 740);

        if (this.state === 'menu') {
            this.drawMenuBackground();
        } else if (this.level) {
            const camX = Math.round(this.camX);
            this.scenery.drawBackground(ctx);

            ctx.save();
            ctx.translate(-camX, 0);
            this.level.draw(ctx, this.scenery, this.freddySheet, this.exitOpen, camX, this.itemSheet);
            if (this.state !== 'gameOver' && this.state !== 'victory') {
                const grounded = [...this.collectibles.filter(c => !c.collected), ...this.enemies];
                if (!this.player.dead && this.state !== 'exiting') grounded.push(this.player);
                this.scenery.drawShadows(ctx, grounded, this.level.platforms);
                this.collectibles.forEach(c => c.draw(ctx, this.itemSheet));
                this.enemies.forEach(e => e.draw(ctx, this.enemySheet));
                this.enemyProjectiles.forEach(p => p.draw(ctx, this.itemSheet));
                this.drawPlayer(ctx);
            }
            if (this.flood && this.flood.started) this.drawFlood(ctx, camX);
            this.particles.forEach(p => p.draw(ctx));
            ctx.restore();
            this.scenery.drawForeground(ctx);

            if (this.flashAlpha > 0) {
                ctx.globalAlpha = this.flashAlpha;
                ctx.fillStyle = '#fff';
                ctx.fillRect(-10, -10, 980, 740);
                ctx.globalAlpha = 1;
            }
            if (this.boss) this.drawBossBar();
            if (this.combo > 1) this.drawCombo();
            if (this.banner) this.drawBanner();
        }

        if (this.fade > 0) {
            ctx.globalAlpha = this.fade;
            ctx.fillStyle = '#000';
            ctx.fillRect(-10, -10, 980, 740);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    // Al cruzar la puerta, Freddy encoge hacia el centro de la puerta y desaparece.
    drawPlayer(ctx) {
        // Transformado: hoja de la ulti (si aún no ha llegado, la normal)
        const ult = this.player.ultTimer > 0 && this.ultSheets[this.player.character.ultimate.sheet];
        const sheet = ult || this.sheets[this.character];
        if (this.state !== 'exiting') {
            this.player.draw(ctx, sheet, this.carSheet);
            return;
        }
        const t = Math.min(1, this.exitTimer / 30);
        const level = this.level;
        const doorX = level.exitX + level.exitWidth / 2;
        const doorY = level.exitY + level.exitHeight;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.translate(doorX, doorY);
        ctx.scale(1 - t * 0.6, 1 - t * 0.6);
        ctx.translate(-doorX, -doorY);
        this.player.draw(ctx, sheet, this.carSheet);
        ctx.restore();
    }

    drawFlood(ctx, camX) {
        const edge = this.flood.x;
        if (edge < camX - 40) return;
        const t = this.levelTime;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(camX - 20, -10);
        for (let y = -10; y <= 740; y += 20) {
            ctx.lineTo(edge + Math.sin(y * 0.05 + t * 0.12) * 14 + Math.sin(y * 0.13 - t * 0.07) * 6, y);
        }
        ctx.lineTo(camX - 20, 740);
        ctx.closePath();
        const g = ctx.createLinearGradient(edge - 200, 0, edge, 0);
        g.addColorStop(0, 'rgba(70, 45, 20, 0.95)');
        g.addColorStop(1, 'rgba(120, 85, 40, 0.85)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(220, 200, 150, 0.7)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
    }

    drawBossBar() {
        const ctx = this.ctx;
        const w = 500;
        const x = 480 - w / 2;
        const y = 690;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 4, y - 22, w + 8, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.boss.name, 480, y - 6);
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, 10);
        ctx.fillStyle = this.boss.phase === 2 ? '#e91e63' : '#8bc34a';
        ctx.fillRect(x, y, w * (this.boss.health / this.boss.maxHealth), 10);
    }

    drawCombo() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.comboTimer / 30);
        ctx.font = `bold ${22 + Math.min(this.combo, 5) * 3}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#ff9800';
        ctx.strokeText(`COMBO x${this.combo}`, 940, 110);
        ctx.fillText(`COMBO x${this.combo}`, 940, 110);
        ctx.restore();
    }

    drawBanner() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.banner.timer / 30);
        ctx.font = 'bold 34px sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#ffeb3b';
        ctx.strokeText(this.banner.text, 480, 300);
        ctx.fillText(this.banner.text, 480, 300);
        ctx.restore();
    }

    drawMenuBackground() {
        const ctx = this.ctx;
        if (this.backgrounds.bg_00) {
            ctx.drawImage(this.backgrounds.bg_00, 0, 0, 960, 720);
            ctx.fillStyle = 'rgba(15,12,41,0.7)';
            ctx.fillRect(0, 0, 960, 720);
        } else {
            ctx.fillStyle = '#0f0c29';
            ctx.fillRect(0, 0, 960, 720);
        }

        const time = Date.now() / 1000;

        this.menuParticles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;

            if (p.type === 'paper') {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.font = `${p.size * 3}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);
            }

            ctx.restore();
        });

        // Freddy perseguido por un bug por la parte de abajo
        const freddyX = (time * 80) % 1200 - 100;
        ctx.globalAlpha = 0.8;
        this.freddySheet.draw(ctx, 'run', Math.floor(time * 12), freddyX, 700, 0.45);
        this.enemySheet.draw(ctx, 'bug_run', Math.floor(time * 12), freddyX - 160, 700, 0.35);
        ctx.globalAlpha = 1;
    }

    gameLoop(now) {
        this.accumulator += Math.min(now - this.lastTime, 250);
        this.lastTime = now;
        while (this.accumulator >= STEP) {
            this.update();
            this.accumulator -= STEP;
        }
        this.draw();
        const playing = this.state === 'playing' || this.state === 'exiting';
        if (playing !== this.wasPlaying) {
            this.wasPlaying = playing;
            document.documentElement.classList.toggle('playing', playing); // css: mandos táctiles de juego
        }
        requestAnimationFrame(t => this.gameLoop(t));
    }
}
