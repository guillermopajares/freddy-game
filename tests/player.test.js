global.Collision = require('../js/collision');
global.Sound = { play: jest.fn() };
const Player = require('../js/player');

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
            player.handleInput(fakeInput('KeyS'), [groundPlatform]);
            expect(player.crouching).toBe(true);
            expect(player.height).toBe(player.crouchHeight);
            expect(player.y + player.height).toBe(GROUND_Y);
        });

        it('walks at half speed while crouching', () => {
            const player = playerOnGround();
            player.handleInput(fakeInput('KeyS', 'KeyD'), [groundPlatform]);
            expect(player.crouching).toBe(true);
            expect(player.velocityX).toBe(player.speed * 0.5);
            expect(player.facing).toBe(1);

            player.handleInput(fakeInput('KeyS', 'KeyA'), [groundPlatform]);
            expect(player.velocityX).toBe(-player.speed * 0.5);
            expect(player.facing).toBe(-1);
        });

        it('walks at full speed when not crouching', () => {
            const player = playerOnGround();
            player.handleInput(fakeInput('KeyD'), [groundPlatform]);
            expect(player.crouching).toBe(false);
            expect(player.velocityX).toBe(player.speed);
        });

        it('stands up under a floating platform', () => {
            const player = playerOnGround();
            const low = { x: 280, y: 580, width: 120, height: 20 };
            player.handleInput(fakeInput('KeyS'), [groundPlatform, low]);
            expect(player.crouching).toBe(true);

            player.handleInput(fakeInput(), [groundPlatform, low]);
            expect(player.crouching).toBe(false);
            expect(player.height).toBe(player.baseHeight);
        });

        it('stays crouched under solid ground overhead', () => {
            const player = playerOnGround();
            const solidCeiling = { x: 280, y: 520, width: 120, height: 40, ground: true };
            player.handleInput(fakeInput('KeyS'), [groundPlatform, solidCeiling]);
            player.handleInput(fakeInput(), [groundPlatform, solidCeiling]);
            expect(player.crouching).toBe(true);
        });
    });
});
