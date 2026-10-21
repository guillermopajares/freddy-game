// Cliente del ranking online con un fetch simulado: nunca llama a la API real.
const { RankingApi, API_URL, API_TIMEOUT } = require('../js/api.js');

function reply(status, body) {
    return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

afterEach(() => {
    delete global.fetch;
    jest.useRealTimers();
});

describe('RankingApi', () => {
    test('fetchRanking pide el límite y devuelve la lista', async () => {
        const ranking = [{ position: 1, username: 'Freddy', points: 15400, created_at: '2026-10-20 21:25:07' }];
        global.fetch = jest.fn(() => reply(200, { ranking }));
        await expect(RankingApi.fetchRanking(10)).resolves.toEqual(ranking);
        expect(global.fetch.mock.calls[0][0]).toBe(`${API_URL}/ranking?limit=10`);
    });

    test('submitScore envía JSON con los puntos como entero', async () => {
        global.fetch = jest.fn(() => reply(201, { id: 2, username: 'Ana', points: 1500, position: 3 }));
        await expect(RankingApi.submitScore('Ana', 1500.7)).resolves.toMatchObject({ position: 3 });
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toBe(`${API_URL}/scores`);
        expect(options.method).toBe('POST');
        expect(options.headers['Content-Type']).toBe('application/json');
        expect(JSON.parse(options.body)).toEqual({ username: 'Ana', points: 1500 });
    });

    test('un error de la API se convierte en excepción con su mensaje', async () => {
        global.fetch = jest.fn(() => reply(422, { error: 'Datos no válidos.' }));
        await expect(RankingApi.submitScore('', 10)).rejects.toThrow('Datos no válidos.');
        global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('no JSON')) }));
        await expect(RankingApi.fetchRanking()).rejects.toThrow('HTTP 500');
    });

    test('si la API no contesta, se aborta al pasar el tiempo límite', async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')));
        }));
        const pending = RankingApi.fetchRanking();
        jest.advanceTimersByTime(API_TIMEOUT);
        await expect(pending).rejects.toThrow('aborted');
    });
});
