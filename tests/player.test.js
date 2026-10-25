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
        input.down.add('jump'); // mantenido: salto completo
        input.pressed.add('jump');
        let top = floor;
        for (let i = 0; i < 30; i++) {
            run(player, input, 1, level);
            top = Math.min(top, player.y);
        }
        expect(floor - top).toBeGreaterThan(130);
        expect(floor - top).toBeLessThan(160);

        input.pressed.add('jump'); // doble salto en el aire
        for (let i = 0; i < 30; i++) {
            run(player, input, 1, level);
            top = Math.min(top, player.y);
        }
        expect(floor - top).toBeGreaterThan(200);
    });

    test('soltar el salto pronto da un salto corto', () => {
        const floor = player.y;
        input.pressed.add('jump');
        let top = floor;
        for (let i = 0; i < 30; i++) {
            run(player, input, 1, level);
            top = Math.min(top, player.y);
        }
        expect(floor - top).toBeLessThan(60);
    });

    test('se puede saltar unos frames después de salir del borde y pulsar justo antes de aterrizar', () => {
        const ledge = { x: 0, y: 650, width: 120, height: 70, ground: true };
        const edgeLevel = { platforms: [ledge], width: 960, leftWall: 0 };
        player.x = 110;
        input.down.add('right');
        run(player, input, 6, edgeLevel); // ya ha salido del borde
        expect(player.onGround).toBe(false);
        input.pressed.add('jump');
        input.down.add('jump');
        run(player, input, 1, edgeLevel);
        expect(player.velocityY).toBeLessThan(-10);
        expect(player.jumpsLeft).toBe(1);

        player.x = 50;
        player.y = 650 - 108 - 30; // cayendo, a punto de aterrizar sin saltos en el aire
        player.velocityY = 4;
        player.jumpsLeft = 0;
        input.down.clear();
        input.pressed.add('jump');
        run(player, input, 10, level);
        expect(player.velocityY).toBeLessThan(0);
    });

    test('lanzar papel gasta munición; el rollo gigante cuesta 3', () => {
        player.ammo = 10;
        input.pressed.add('fire');
        run(player, input, 1, level);
        expect(player.ammo).toBe(9);
        expect(player.projectiles[0].type).toBe('paper');

        run(player, input, 30, level);
        input.down.add('fire');
        run(player, input, 50, level);
        input.down.delete('fire');
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

    test('en Fácil (mercy) la invencibilidad tras un golpe dura más', () => {
        expect(player.takeDamage(1, 0)).toBe(true);
        const normal = player.invincibleTimer;
        const easy = new Player(100, 542, { mercy: 1.6 });
        expect(easy.takeDamage(1, 0)).toBe(true);
        expect(easy.invincibleTimer).toBe(Math.round(normal * 1.6));
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
        input.down.add('down');
        run(player, input, 2, level);
        expect(player.crouching).toBe(true);
        level.platforms = [GROUND, { x: 0, y: player.y - 20, width: 960, height: 10, ground: true }];
        input.down.delete('down');
        run(player, input, 2, level);
        expect(player.crouching).toBe(true);
    });
});


const GROUND_Y = 650;
const groundPlatform = { x: 0, y: GROUND_Y, width: 2000, height: 70, ground: true };

// Simulated input: the given keys are held, none were just pressed.
const fakeInput = (...held) => ({
    isDown: code => held.includes(code),
    isPressed: () => false,
});

const playerOnGround = () => {
    const player = new Player(300, GROUND_Y - 108);
    player.onGround = true;
    return player;
};

describe('Player', () => {
    describe('handleInput', () => {
        it('shrinks to crouch height while keeping the feet on the ground', () => {
            const player = playerOnGround();
            player.handleInput(fakeInput('down'), [groundPlatform]);
            expect(player.crouching).toBe(true);
            expect(player.height).toBe(player.crouchHeight);
            expect(player.y + player.height).toBe(GROUND_Y);
        });

        it('walks at half speed while crouching', () => {
            const player = playerOnGround();
            player.handleInput(fakeInput('down', 'right'), [groundPlatform]);
            expect(player.crouching).toBe(true);
            expect(player.velocityX).toBe(player.speed * 0.5);
            expect(player.facing).toBe(1);

            player.handleInput(fakeInput('down', 'left'), [groundPlatform]);
            expect(player.velocityX).toBe(-player.speed * 0.5);
            expect(player.facing).toBe(-1);
        });

        it('walks at full speed when not crouching', () => {
            const player = playerOnGround();
            player.handleInput(fakeInput('right'), [groundPlatform]);
            expect(player.crouching).toBe(false);
            expect(player.velocityX).toBe(player.speed);
        });

        it('stands up under a floating platform', () => {
            const player = playerOnGround();
            const low = { x: 280, y: 580, width: 120, height: 20 };
            player.handleInput(fakeInput('down'), [groundPlatform, low]);
            expect(player.crouching).toBe(true);

            player.handleInput(fakeInput(), [groundPlatform, low]);
            expect(player.crouching).toBe(false);
            expect(player.height).toBe(player.baseHeight);
        });

        it('stays crouched under solid ground overhead', () => {
            const player = playerOnGround();
            const solidCeiling = { x: 280, y: 520, width: 120, height: 40, ground: true };
            player.handleInput(fakeInput('down'), [groundPlatform, solidCeiling]);
            player.handleInput(fakeInput(), [groundPlatform, solidCeiling]);
            expect(player.crouching).toBe(true);
        });
    });
});

describe('Personajes', () => {
    const level = { platforms: [GROUND], width: 960, leftWall: 0 };

    test('Dani embiste en coche: dash largo, invencible y daña (ramming)', () => {
        const input = makeInput();
        const dani = new Player(100, 650 - 108, { character: { car: true } });
        run(dani, input, 2, level);
        input.pressed.add('dash');
        run(dani, input, 30, level);
        expect(dani.ramming).toBe(true);
        expect(dani.invincible).toBe(true);
        const freddy = new Player(100, 650 - 108);
        input.pressed.add('dash');
        run(freddy, input, 30, level);
        expect(freddy.dashTimer).toBe(0);
        expect(freddy.ramming).toBeFalsy();
    });

    test('las estadísticas del personaje cambian a Player', () => {
        const fer = new Player(0, 0, { character: { punch: 1, speed: 4.2 } });
        expect(fer.meleeDamage).toBe(3);
        expect(fer.speed).toBe(4.2);
    });

    test('jumps: 3 da un salto más en el aire (Elena)', () => {
        const input = makeInput();
        const elena = new Player(100, 650 - 108, { character: { jumps: 3 } });
        run(elena, input, 2, level);
        input.pressed.add('jump');
        run(elena, input, 10, level);
        input.pressed.add('jump');
        run(elena, input, 10, level);
        expect(elena.jumpsLeft).toBe(1);
        input.pressed.add('jump');
        run(elena, input, 1, level);
        expect(elena.velocityY).toBeLessThan(0);
        expect(elena.jumpsLeft).toBe(0);
    });

    test('dash: true alarga el dash y acorta la espera (Tony)', () => {
        const input = makeInput();
        const tony = new Player(100, 650 - 108, { character: { dash: true } });
        run(tony, input, 2, level);
        input.pressed.add('dash');
        run(tony, input, 1, level);
        expect(tony.dashTimer).toBe(21);
        expect(tony.dashCooldown).toBe(36);
    });

    test('la poción turbo acelera mientras dura', () => {
        const input = makeInput();
        const p = new Player(100, 650 - 108);
        run(p, input, 2, level);
        p.powers.turbo = 10;
        input.down.add('right');
        run(p, input, 1, level);
        expect(p.velocityX).toBeCloseTo(3.5 * 1.3);
        run(p, input, 12, level);
        expect(p.velocityX).toBe(3.5);
    });
});

describe('Ulti', () => {
    const level = { platforms: [GROUND], width: 960, leftWall: 0 };
    const DANI = { car: true, speed: 3.5, ultimate: { speed: 4.6, jumpForce: -14.5, punch: 3, jumps: 3, car: false } };

    test('la barra solo carga en personajes con ulti y tiene tope', () => {
        const freddy = new Player(0, 0);
        freddy.addUltimate(50);
        expect(freddy.ultimate).toBe(0);
        const dani = new Player(0, 0, { character: DANI });
        dani.addUltimate(60);
        dani.addUltimate(60);
        expect(dani.ultimate).toBe(Player.ULT_MAX);
    });

    test('no se activa sin la barra llena', () => {
        const input = makeInput();
        const dani = new Player(100, 650 - 108, { character: DANI });
        dani.addUltimate(Player.ULT_MAX - 1);
        input.pressed.add('ultimate');
        run(dani, input, 1, level);
        expect(dani.ultTimer).toBe(0);
    });

    test('con la barra llena transforma: stats de la ulti y, al acabar, las normales', () => {
        const input = makeInput();
        const dani = new Player(100, 650 - 108, { character: DANI });
        run(dani, input, 2, level);
        dani.addUltimate(Player.ULT_MAX);
        input.pressed.add('ultimate');
        dani.update(input, level);
        expect(dani.transformed).toBe(true);
        expect(dani.ultimate).toBe(0);
        expect(dani.speed).toBe(4.6);
        expect(dani.maxJumps).toBe(3);
        expect(dani.meleeDamage).toBe(5);
        // Transformado no embiste en coche
        input.pressed.clear();
        input.pressed.add('dash');
        run(dani, input, 1, level);
        expect(dani.ramming).toBeFalsy();
        // Mientras dura no carga la barra
        dani.addUltimate(50);
        expect(dani.ultimate).toBe(0);
        run(dani, input, 700, level);
        expect(dani.ultTimer).toBe(0);
        expect(dani.speed).toBe(3.5);
        expect(dani.maxJumps).toBe(2);
        expect(dani.form.car).toBe(true);
    });
});
