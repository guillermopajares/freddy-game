// Imágenes del juego. Por http se cargan estos ficheros; con file:// se usa js/assets.js
// (generado desde aquí con `node tools/build-assets.js`).
const ASSET_FILES = {
    freddy: 'assets/freddy_sprites.png',
    bg_00: 'assets/bg_00.png',
    bg_01: 'assets/bg_01.png',
    bg_02: 'assets/bg_02.png',
    bg_03: 'assets/bg_03.png',
    bg_04: 'assets/bg_04.png',
    bg_05: 'assets/bg_05.png',
    enemies: 'assets/enemies.jpg',
    dani: 'assets/dani.jpg',
    dani_car: 'assets/dani_car.jpg',
    fer: 'assets/fer.jpg',
    guille: 'assets/guille.jpg',
    charly: 'assets/charly.jpg',
    david: 'assets/david.jpg',
    juancarlos: 'assets/juancarlos.jpg',
    sergio: 'assets/sergio.jpg',
    rober: 'assets/rober.jpg',
    alvaro: 'assets/alvaro.jpg',
};

if (typeof module !== 'undefined') module.exports = ASSET_FILES;
