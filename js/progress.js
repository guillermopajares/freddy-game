// Progreso guardado: niveles, récords, logros, ranking local y ajustes.
// Sin dependencias del navegador para poder probarlo en Node (storage = localStorage o null).
const PROGRESS_KEY = 'freddyProgress';
const RANKING_SIZE = 10;
const NAME_MAX = 15; // la API admite 30, pero en el panel caben unos 15

// bossRest: los jefes descansan esa proporción más entre ataques (1.5 = 50 % más)
// mercy: multiplica la invencibilidad tras un golpe; hearts: multiplica la probabilidad de soltar corazón.
// Fácil va pensado para el móvil, donde con los botones táctiles cuesta mucho más esquivar.
const DIFFICULTY = {
    easy: { label: 'Fácil', lives: 6, enemyHealth: 0.5, bossHealth: 0.5, elite: false, bossRest: 2, mercy: 1.6, hearts: 2 },
    normal: { label: 'Normal', lives: 3, enemyHealth: 1, bossHealth: 1, elite: false },
    hard: { label: 'Difícil', lives: 3, enemyHealth: 1, bossHealth: 1.3, elite: true },
};

const ACHIEVEMENTS = {
    boss404: 'Página encontrada: derrota al Error 404 Gigante',
    bossKing: 'Rey destronado: derrota al Rey Bug',
    bossGlitch: 'Sin fallos: derrota al Glitch 404',
    bossFinal: 'Código limpio: derrota al Código Espagueti',
    noDamage: 'Intocable: termina un nivel sin recibir daño',
    combo5: 'Cadena de commits: consigue un combo x5',
    noSteal: 'Mi papel es mío: termina un nivel sin que un 404 te robe',
    allStars: 'Perfeccionista: 3 estrellas en un nivel',
    stomper: 'Pies de plomo: 25 pisotones en total',
    speedrun: 'Con prisa: nivel 1 en menos de 60 segundos',
    hardWin: 'Senior: gana la partida en Difícil',
    bossRival: 'Sin rencores: derrota a un compañero rival',
};

// cabinet: 'auto' | 'full' | 'compact' | 'off' (mueble de recreativa); crt: líneas y reflejo del cristal
const DEFAULT_SETTINGS = {
    volume: 70, shake: true, flash: true, difficulty: 'normal', character: 'freddy', cabinet: 'auto', crt: true,
};

class Progress {
    // defaults: ajustes iniciales que cambian según el dispositivo (en táctil se empieza en Fácil)
    constructor(storage, defaults = {}) {
        this.storage = storage;
        const saved = this.read();
        this.data = {
            unlocked: 1,
            best: {},
            highScore: 0,
            achievements: {},
            ranking: [],        // copia local: se muestra si la API no contesta
            playerName: '',     // último nombre usado, para no reescribirlo cada partida
            stats: { stomps: 0 },
            ...saved,
            settings: { ...DEFAULT_SETTINGS, ...defaults, ...(saved.settings || {}) },
        };
    }

    read() {
        try {
            return JSON.parse(this.storage.getItem(PROGRESS_KEY)) || {};
        } catch (e) {
            return {}; // sin almacenamiento o datos corruptos: se empieza de cero
        }
    }

    save() {
        try {
            this.storage.setItem(PROGRESS_KEY, JSON.stringify(this.data));
        } catch (e) { /* almacenamiento bloqueado: solo se pierde el progreso */ }
    }

    get settings() {
        return this.data.settings;
    }

    get difficulty() {
        return DIFFICULTY[this.data.settings.difficulty] || DIFFICULTY.normal;
    }

    // Devuelve true solo la primera vez (para mostrar el aviso).
    unlock(id) {
        if (!ACHIEVEMENTS[id] || this.data.achievements[id]) return false;
        this.data.achievements[id] = true;
        this.save();
        return true;
    }

    recordLevel(index, stars, seconds) {
        const best = this.data.best[index] || { stars: 0, time: Infinity };
        this.data.best[index] = { stars: Math.max(best.stars, stars), time: Math.min(best.time, seconds) };
        this.data.unlocked = Math.max(this.data.unlocked, index + 2);
        this.save();
        return this.data.best[index];
    }

    recordScore(score) {
        if (score > this.data.highScore) {
            this.data.highScore = score;
            this.save();
        }
    }

    addToRanking(name, score, difficulty) {
        const entry = { name: name.trim().slice(0, NAME_MAX) || '???', score, difficulty };
        this.data.ranking.push(entry);
        this.data.ranking.sort((a, b) => b.score - a.score);
        this.data.ranking = this.data.ranking.slice(0, RANKING_SIZE);
        this.save();
        return this.data.ranking.indexOf(entry);
    }
}

if (typeof module !== 'undefined') module.exports = { Progress, ACHIEVEMENTS, DIFFICULTY, RANKING_SIZE, NAME_MAX };
