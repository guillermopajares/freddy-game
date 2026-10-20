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
