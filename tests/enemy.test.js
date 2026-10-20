const { ENEMY_TYPES } = require('../js/enemy');

describe('Enemy', () => {
    describe('heartDropChance', () => {
        it('gives normal enemies a 15% chance', () => {
            expect(new ENEMY_TYPES.CodeBug(0, 0).heartDropChance).toBe(0.15);
            expect(new ENEMY_TYPES.Error404(0, 0).heartDropChance).toBe(0.15);
        });

        it('always drops a heart for elite enemies', () => {
            expect(new ENEMY_TYPES.CodeBug(0, 0, { elite: true }).heartDropChance).toBe(1);
            expect(new ENEMY_TYPES.Error404(0, 0, { elite: true }).heartDropChance).toBe(1);
        });

        it('always drops a heart for bosses', () => {
            expect(new ENEMY_TYPES.Boss404(0, 0).heartDropChance).toBe(1);
            expect(new ENEMY_TYPES.BossSpider(0, 0).heartDropChance).toBe(1);
        });
    });
});
