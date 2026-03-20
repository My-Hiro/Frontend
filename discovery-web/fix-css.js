const fs = require('fs');
let c = fs.readFileSync('src/app/globals.css', 'utf8');
c = c.replace(/@layer base \{/g, '@layer base-custom {');
c = c.replace(/@layer theme \{/g, '@layer theme-custom {');
c = c.replace(/@layer properties \{/g, '@layer properties-custom {');
// If I prepended @tailwind base earlier, let's remove it so it doesn't cause issues
c = c.replace('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n', '');
fs.writeFileSync('src/app/globals.css', c, 'utf8');
