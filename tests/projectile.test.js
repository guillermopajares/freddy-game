const Projectile = require('../js/projectile');

describe('Projectile', () => {
    describe('constructor', () => {
        it('should initialize correctly with default type "paper"', () => {
            const x = 100;
            const y = 200;
            const direction = 1;

            const projectile = new Projectile(x, y, direction);

            expect(projectile.x).toBe(x);
            expect(projectile.y).toBe(y);
            expect(projectile.direction).toBe(direction);
            expect(projectile.type).toBe('paper');
            expect(projectile.width).toBe(28);
            expect(projectile.height).toBe(28);
            expect(projectile.speed).toBe(8);
            expect(projectile.lifetime).toBe(120);

            // Check default initializations
            expect(projectile.velocityX).toBe(direction * 8);
            expect(projectile.velocityY).toBe(0);
            expect(projectile.active).toBe(true);
            expect(projectile.rotation).toBe(0);
            expect(projectile.trail).toEqual([]);
            expect(projectile.animFrame).toBe(0);
            expect(projectile.animTimer).toBe(0);
            expect(projectile.swingAngle).toBe(0);
        });

        it('should initialize correctly when explicitly passed type "paper"', () => {
            const x = 50;
            const y = 50;
            const direction = -1;

            const projectile = new Projectile(x, y, direction, 'paper');

            expect(projectile.x).toBe(x);
            expect(projectile.y).toBe(y);
            expect(projectile.direction).toBe(direction);
            expect(projectile.type).toBe('paper');
            expect(projectile.width).toBe(28);
            expect(projectile.height).toBe(28);
            expect(projectile.speed).toBe(8);
            expect(projectile.lifetime).toBe(120);
            expect(projectile.velocityX).toBe(direction * 8);
        });

        it('should initialize correctly for a different type (e.g., "plunger")', () => {
            const x = 150;
            const y = 250;
            const direction = 1;

            const projectile = new Projectile(x, y, direction, 'plunger');

            expect(projectile.x).toBe(x);
            expect(projectile.y).toBe(y);
            expect(projectile.direction).toBe(direction);
            expect(projectile.type).toBe('plunger');
            expect(projectile.width).toBe(40);
            expect(projectile.height).toBe(40);
            expect(projectile.speed).toBe(6);
            expect(projectile.lifetime).toBe(35);
            expect(projectile.velocityX).toBe(direction * 6);
        });
    });
});
