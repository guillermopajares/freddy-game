// Ranking online (contrato en api.md). Sin DOM: se prueba en Node con un fetch simulado.
const API_URL = 'https://freddygame.rodrycode.com/api';
const API_TIMEOUT = 5000; // ms: sin respuesta, el juego sigue con el ranking local

const RankingApi = {
    async request(path, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), API_TIMEOUT);
        try {
            const res = await fetch(API_URL + path, { ...options, signal: controller.signal });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
            return body;
        } finally {
            clearTimeout(timer);
        }
    },

    // [{ position, username, points, created_at }], de más a menos puntos
    async fetchRanking(limit = 10) {
        return (await this.request(`/ranking?limit=${limit}`)).ranking || [];
    },

    // Devuelve { id, username, points, created_at, position }
    submitScore(username, points) {
        return this.request('/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, points: Math.floor(points) }), // la API exige un entero
        });
    },
};

if (typeof module !== 'undefined') module.exports = { RankingApi, API_URL, API_TIMEOUT };
