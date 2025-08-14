import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tamanhos de ícones necessários para PWA
const iconSizes = [
  16, 32, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512
];

// Função para criar ícone PNG a partir do SVG
function createIcon(size) {
  const svgContent = fs.readFileSync(path.join(__dirname, '../public/icons/icon.svg'), 'utf8');
  
  // Criar um HTML temporário para renderizar o SVG
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; }
    svg { width: ${size}px; height: ${size}px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;
  
  // Salvar como HTML temporário
  const tempHtmlPath = path.join(__dirname, `../public/icons/temp-${size}.html`);
  fs.writeFileSync(tempHtmlPath, html);
  
  console.log(`Ícone ${size}x${size} criado: temp-${size}.html`);
  console.log(`Para converter para PNG, use um conversor online ou ferramenta como Puppeteer`);
}

// Gerar todos os ícones
console.log('Gerando ícones para PWA...');
iconSizes.forEach(size => {
  createIcon(size);
});

console.log('\nÍcones HTML criados!');
console.log('Para converter para PNG, você pode:');
console.log('1. Usar um conversor online como convertio.co');
console.log('2. Usar ferramentas como Puppeteer ou Playwright');
console.log('3. Usar ferramentas de design como Figma ou Adobe Illustrator');
console.log('\nTamanhos necessários:');
iconSizes.forEach(size => {
  console.log(`- icon-${size}x${size}.png`);
});
