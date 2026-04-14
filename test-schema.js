const fs = require('fs');
const viteConfig = fs.readFileSync('.env.example', 'utf8');
console.log(viteConfig);
