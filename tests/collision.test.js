const Collision = require('../js/collision.js');

describe('Collision.aabb', () => {
    test('should return true for overlapping rectangles', () => {
        const rect1 = { x: 0, y: 0, width: 10, height: 10 };
        const rect2 = { x: 5, y: 5, width: 10, height: 10 };
        expect(Collision.aabb(rect1, rect2)).toBe(true);
    });

    test('should return false for rectangles separated horizontally', () => {
        const rect1 = { x: 0, y: 0, width: 10, height: 10 };
        const rect2 = { x: 15, y: 0, width: 10, height: 10 };
        expect(Collision.aabb(rect1, rect2)).toBe(false);
    });

    test('should return false for rectangles separated vertically', () => {
        const rect1 = { x: 0, y: 0, width: 10, height: 10 };
        const rect2 = { x: 0, y: 15, width: 10, height: 10 };
        expect(Collision.aabb(rect1, rect2)).toBe(false);
    });

    test('should return false for rectangles touching on edges (strict inequality)', () => {
        const rect1 = { x: 0, y: 0, width: 10, height: 10 };
        const rect2 = { x: 10, y: 0, width: 10, height: 10 }; // Right edge touching
        const rect3 = { x: 0, y: 10, width: 10, height: 10 }; // Bottom edge touching

        expect(Collision.aabb(rect1, rect2)).toBe(false);
        expect(Collision.aabb(rect1, rect3)).toBe(false);
    });

    test('should return true when one rectangle is completely inside another', () => {
        const rect1 = { x: 0, y: 0, width: 20, height: 20 };
        const rect2 = { x: 5, y: 5, width: 10, height: 10 };
        expect(Collision.aabb(rect1, rect2)).toBe(true);
    });

    test('should work with negative coordinates', () => {
        const rect1 = { x: -10, y: -10, width: 20, height: 20 };
        const rect2 = { x: 0, y: 0, width: 20, height: 20 };
        expect(Collision.aabb(rect1, rect2)).toBe(true);

        const rect3 = { x: 15, y: 15, width: 10, height: 10 };
        expect(Collision.aabb(rect1, rect3)).toBe(false);
    });
});


const floating = () => ({ x: 100, y: 580, width: 120, height: 20 });
const ground = () => ({ x: 100, y: 650, width: 300, height: 70, ground: true });
const entity = (props) => ({ width: 40, height: 108, velocityX: 0, velocityY: 0, jumpsLeft: 0, maxJumps: 2, ...props });

describe('Collision', () => {
    describe('checkPlatformCollisions', () => {
        it('lets an entity walk through the side of a floating platform', () => {
            const e = entity({ x: 90, y: 542, velocityX: 3.5, velocityY: 0.5 });
            Collision.checkPlatformCollisions(e, [floating()]);
            expect(e.x).toBe(90);
            expect(e.velocityX).toBe(3.5);
            expect(e.onGround).toBe(false);
        });

        it('lets an entity jump through a floating platform from below', () => {
            const e = entity({ x: 120, y: 590, velocityY: -8 });
            Collision.checkPlatformCollisions(e, [floating()]);
            expect(e.y).toBe(590);
            expect(e.velocityY).toBe(-8);
            expect(e.onGround).toBe(false);
        });

        it('lands an entity falling onto a floating platform', () => {
            const platform = floating();
            const e = entity({ x: 120, y: 475, velocityY: 5 });
            Collision.checkPlatformCollisions(e, [platform]);
            expect(e.y).toBe(platform.y - e.height);
            expect(e.velocityY).toBe(0);
            expect(e.onGround).toBe(true);
            expect(e.ground).toBe(platform);
            expect(e.jumpsLeft).toBe(2);
        });

        it('does not land an entity that was already below the floating platform surface', () => {
            const e = entity({ x: 120, y: 500, velocityY: 2 });
            Collision.checkPlatformCollisions(e, [floating()]);
            expect(e.y).toBe(500);
            expect(e.onGround).toBe(false);
        });

        it('blocks an entity against the side of the ground', () => {
            const platform = ground();
            const e = entity({ x: 70, y: 600, velocityX: 3.5 });
            Collision.checkPlatformCollisions(e, [platform]);
            expect(e.x).toBe(platform.x - e.width);
            expect(e.velocityX).toBe(0);
        });

        it('blocks an entity hitting the ground from below', () => {
            const platform = ground();
            const e = entity({ x: 200, y: 715, velocityY: -8 });
            Collision.checkPlatformCollisions(e, [platform]);
            expect(e.y).toBe(platform.y + platform.height);
            expect(e.velocityY).toBe(0);
        });

        it('lands an entity falling onto the ground', () => {
            const platform = ground();
            const e = entity({ x: 200, y: 545, velocityY: 5 });
            Collision.checkPlatformCollisions(e, [platform]);
            expect(e.y).toBe(platform.y - e.height);
            expect(e.onGround).toBe(true);
        });
    });
});
