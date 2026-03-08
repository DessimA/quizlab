const fs = require('fs');
const path = require('path');

function load(relativePath) {
    const absolutePath = path.resolve(__dirname, '../../', relativePath);
    const code = fs.readFileSync(absolutePath, 'utf8');
    const fn = new Function('window', 'localStorage', code);
    fn(global.window, global.localStorage);
}

module.exports = { load };