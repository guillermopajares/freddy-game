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

        it('should initialize an aimed enemy "pixel" shot', () => {
            const projectile = new Projectile(150, 250, 0.6, 'pixel', 3.6);

            expect(projectile.type).toBe('pixel');
            expect(projectile.width).toBe(18);
            expect(projectile.damage).toBe(1);
            expect(projectile.velocityX).toBeCloseTo(0.6 * 4.5);
            expect(projectile.velocityY).toBe(3.6);
        });
    });

    describe('update', () => {
        it('applies gravity to goo and deactivates when leaving the screen', () => {
            const goo = new Projectile(100, 700, 1, 'goo', -5);
            goo.update();
            expect(goo.velocityY).toBeCloseTo(-5 + 0.22);
            for (let i = 0; i < 100 && goo.active; i++) goo.update();
            expect(goo.active).toBe(false);
        });

        it('charged paper pierces and hits harder', () => {
            const big = new Projectile(0, 0, 1, 'paperBig');
            expect(big.pierce).toBe(true);
            expect(big.damage).toBe(3);
        });
    });
});
