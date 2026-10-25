const { Progress, ACHIEVEMENTS, RANKING_SIZE, NAME_MAX } = require('../js/progress.js');

function memoryStorage(initial) {
    const data = { ...initial };
    return {
        getItem: k => (k in data ? data[k] : null),
        setItem: (k, v) => { data[k] = v; },
        data,
    };
}

describe('Progress', () => {
    test('empieza con valores por defecto si no hay nada guardado o está corrupto', () => {
        for (const storage of [memoryStorage(), memoryStorage({ freddyProgress: '{roto' }), null]) {
            const p = new Progress(storage);
            expect(p.data.unlocked).toBe(1);
            expect(p.settings.difficulty).toBe('normal');
            expect(p.difficulty.lives).toBe(3);
        }
    });

    test('guarda y recupera ajustes nuevos sobre los valores por defecto', () => {
        const storage = memoryStorage({ freddyProgress: JSON.stringify({ unlocked: 3, settings: { shake: false } }) });
        const p = new Progress(storage);
        expect(p.data.unlocked).toBe(3);
        expect(p.settings).toMatchObject({ shake: false, flash: true, volume: 70 });
    });

    test('los ajustes iniciales del dispositivo valen hasta que se guarda otro', () => {
        expect(new Progress(memoryStorage(), { difficulty: 'easy' }).settings.difficulty).toBe('easy');
        const saved = memoryStorage({ freddyProgress: JSON.stringify({ settings: { difficulty: 'hard' } }) });
        expect(new Progress(saved, { difficulty: 'easy' }).settings.difficulty).toBe('hard');
    });

    test('un logro solo se desbloquea una vez y se persiste', () => {
        const storage = memoryStorage();
        const p = new Progress(storage);
        const id = Object.keys(ACHIEVEMENTS)[0];
        expect(p.unlock(id)).toBe(true);
        expect(p.unlock(id)).toBe(false);
        expect(p.unlock('no-existe')).toBe(false);
        expect(new Progress(storage).data.achievements[id]).toBe(true);
    });

    test('el ranking se ordena y se queda con los 10 mejores', () => {
        const p = new Progress(memoryStorage());
        for (let i = 1; i <= RANKING_SIZE; i++) p.addToRanking(`J${i}`, i * 100, 'normal');
        expect(p.addToRanking('  Freddy  ', 550, 'hard')).toBe(5);
        expect(p.data.ranking).toHaveLength(RANKING_SIZE);
        expect(p.data.ranking[0].score).toBe(1000);
        expect(p.data.ranking[5]).toEqual({ name: 'Freddy', score: 550, difficulty: 'hard' });
        p.addToRanking('Un nombre demasiado largo', 2000, 'normal');
        expect(p.data.ranking[0].name).toHaveLength(NAME_MAX);
    });

    test('recordLevel guarda la mejor marca y desbloquea el siguiente nivel', () => {
        const p = new Progress(memoryStorage());
        p.recordLevel(0, 2, 80);
        const best = p.recordLevel(0, 1, 70);
        expect(best).toEqual({ stars: 2, time: 70 });
        expect(p.data.unlocked).toBe(2);
    });
});
