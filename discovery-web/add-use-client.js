const fs = require('fs');
const files = [
  'src/app/providers.tsx',
  'src/app/(main)/category/[id]/page.tsx',
  'src/app/(main)/categories/page.tsx',
  'src/app/(main)/store/[id]/page.tsx',
  'src/app/(main)/saved/page.tsx',
  'src/app/(main)/search/page.tsx',
  'src/app/(main)/profile/page.tsx',
  'src/app/(main)/product/[id]/page.tsx'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('"use client"')) {
      fs.writeFileSync(file, '"use client";\n\n' + content, 'utf8');
      console.log('Added use client to', file);
    }
  }
});
