// Regenera js/assets.js con las imágenes de assets/ embebidas en base64.
// Solo se usa al abrir index.html con doble clic (file://): ahí el navegador no deja
// leer píxeles de imágenes sueltas, y el chroma key los necesita. Por http se cargan los ficheros.
// Uso: node tools/build-assets.js
const fs = require('fs');
const path = require('path');

const ASSET_FILES = require('../js/asset-files.js');
const root = path.join(__dirname, '..');
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg' };

let out = '// Auto-generated asset data (base64)\nconst ASSETS = {};\n\n';
for (const [key, file] of Object.entries(ASSET_FILES)) {
    const data = fs.readFileSync(path.join(root, file)).toString('base64');
    out += `ASSETS["${key}"] = "data:${mime[path.extname(file)]};base64,${data}";\n`;
}
fs.writeFileSync(path.join(root, 'js/assets.js'), out);
console.log(`js/assets.js: ${Object.keys(ASSET_FILES).length} imágenes, ${(out.length / 1e6).toFixed(1)} MB`);
