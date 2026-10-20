// Diseño de niveles: con la física real del salto, la puerta y todos los objetos tienen que ser alcanzables.
const { levels } = require('../js/level.js');

// Distancia horizontal que cubre Freddy (salto + doble salto, 3.5 px/frame) hasta caer a `rise` px
// por encima del punto de partida; -1 si no llega a esa altura.
function horizontalReach(rise) {
    let x = 0, y = 0, vy = -12, doubled = false, best = -1;
    for (let f = 0; f < 400 && y < 800; f++) {
        vy += 0.5;
        y += vy;
        x += 3.5;
        if (vy >= 0 && !doubled) { vy = -9.6; doubled = true; }
        if (vy > 0 && y <= -rise) best = x;
    }
    return best;
}

function reachablePlatforms(level) {
    const P = level.platforms.map((p, i) => ({ i, top: p.y, a: p.x - (p.moveX || 0), b: p.x + p.width + (p.moveX || 0) }));
    const start = P.find(p => level.spawnX >= p.a && level.spawnX <= p.b);
    const seen = new Set([start.i]);
    const queue = [start];
    while (queue.length) {
        const from = queue.shift();
        for (const to of P) {
            if (seen.has(to.i)) continue;
            const gap = Math.max(0, to.a - from.b, from.a - to.b);
            const reach = horizontalReach(from.top - to.top);
            if (reach >= 0 && gap <= reach + 20) {
                seen.add(to.i);
                queue.push(to);
            }
        }
    }
    return P.filter(p => seen.has(p.i));
}

describe.each(levels.map(l => [l.name, l]))('%s', (name, level) => {
    const reachable = reachablePlatforms(level);
    const standsOn = (x, y) => reachable.some(p => x >= p.a - 10 && x <= p.b + 10 && y < p.top && p.top - y < 160);

    test('se puede llegar a la puerta', () => {
        expect(standsOn(level.exitX + level.exitWidth / 2, level.exitY + level.exitHeight - 1)).toBe(true);
    });

    test('todos los objetos están al alcance', () => {
        const unreachable = level.collectibles.filter(c => !standsOn(c.x + 14, c.y));
        expect(unreachable).toEqual([]);
    });

    test('la arena del jefe cabe dentro del nivel y la puerta está en ella', () => {
        if (!level.boss) return;
        expect(level.boss.arenaX + 960).toBeLessThanOrEqual(level.width);
        expect(level.exitX).toBeGreaterThan(level.boss.arenaX);
    });
});
