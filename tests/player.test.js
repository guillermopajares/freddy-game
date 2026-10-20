// Física y combate de Freddy con una entrada simulada.
global.Collision = require('../js/collision.js');
global.Projectile = require('../js/projectile.js');
global.PROJECTILE_TYPES = global.Projectile.PROJECTILE_TYPES;
global.Sound = { play() {} };
const Player = require('../js/player.js');

const GROUND = { x: 0, y: 650, width: 960, height: 70 };

function makeInput() {
    return {
        down: new Set(),
        pressed: new Set(),
        isDown(code) { return this.down.has(code); },
        isPressed(code) { return this.pressed.has(code); },
    };
}

function run(player, input, frames, level) {
    for (let i = 0; i < frames; i++) {
        player.update(input, level);
        input.pressed.clear();
    }
}

describe('Player', () => {
    let level, input, player;
    beforeEach(() => {
        level = { platforms: [GROUND], width: 960, leftWall: 0 };
        input = makeInput();
        player = new Player(100, 650 - 108);
        run(player, input, 2, level);
    });

    test('salto y doble salto alcanzan las alturas previstas', () => {
        const floor = player.y;
        input.pressed.add('KeyW');
        let top = floor;
        for (let i = 0; i < 30; i++) {
            run(player, input, 1, level);
            top = Math.min(top, player.y);
        }
        expect(floor - top).toBeGreaterThan(130);
        expect(floor - top).toBeLessThan(160);

        input.pressed.add('KeyW'); // doble salto en el aire
        for (let i = 0; i < 30; i++) {
            run(player, input, 1, level);
            top = Math.min(top, player.y);
        }
        expect(floor - top).toBeGreaterThan(200);
    });

    test('lanzar papel gasta munición; el rollo gigante cuesta 3', () => {
        player.ammo = 10;
        input.pressed.add('Space');
        run(player, input, 1, level);
        expect(player.ammo).toBe(9);
        expect(player.projectiles[0].type).toBe('paper');

        run(player, input, 30, level);
        input.down.add('Space');
        run(player, input, 50, level);
        input.down.delete('Space');
        run(player, input, 1, level);
        expect(player.ammo).toBe(6);
        expect(player.projectiles.some(p => p.type === 'paperBig')).toBe(true);
    });

    test('el escudo absorbe un golpe y luego desaparece', () => {
        player.shield = true;
        expect(player.takeDamage(1, 0)).toBe(false);
        expect(player.lives).toBe(3);
        expect(player.shield).toBe(false);
        player.invincibleTimer = 0;
        expect(player.takeDamage(1, 0)).toBe(true);
        expect(player.lives).toBe(2);
        expect(player.hitsTaken).toBe(1);
    });

    test('caer al vacío quita una vida y reaparece en el checkpoint', () => {
        // Freddy está sobre el vacío; el checkpoint tiene suelo debajo
        level.platforms = [{ x: 250, y: 650, width: 200, height: 70 }];
        player.spawnX = 300;
        run(player, input, 120, level);
        expect(player.lives).toBe(2);
        expect(player.x).toBe(300);
        expect(player.onGround).toBe(true);
    });

    test('no se levanta si hay una plataforma encima de la cabeza', () => {
        input.down.add('KeyS');
        run(player, input, 2, level);
        expect(player.crouching).toBe(true);
        level.platforms = [GROUND, { x: 0, y: player.y - 20, width: 960, height: 10 }];
        input.down.delete('KeyS');
        run(player, input, 2, level);
        expect(player.crouching).toBe(true);
    });
});
