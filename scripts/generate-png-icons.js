import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tamanhos de ícones necessários para PWA
const iconSizes = [
  16, 32, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512
];

async function generatePNGIcons() {
  console.log('Iniciando geração de ícones PNG...');
  
  // Ler o SVG base
  const svgPath = path.join(__dirname, '../public/icons/icon.svg');
  if (!fs.existsSync(svgPath)) {
    console.error('Arquivo SVG não encontrado:', svgPath);
    return;
  }
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Iniciar o browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    for (const size of iconSizes) {
      console.log(`Gerando ícone ${size}x${size}...`);
      
      const page = await browser.newPage();
      
      // Configurar viewport
      await page.setViewport({ width: size, height: size });
      
      // Criar HTML para renderizar o SVG
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: transparent;
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${size}px;
              height: ${size}px;
            }
            svg { 
              width: ${size}px; 
              height: ${size}px; 
              display: block;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
        </html>
      `;
      
      await page.setContent(html);
      
      // Aguardar renderização
      await page.waitForTimeout(100);
      
      // Capturar screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        omitBackground: true,
        clip: {
          x: 0,
          y: 0,
          width: size,
          height: size
        }
      });
      
      // Salvar arquivo
      const outputPath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
      fs.writeFileSync(outputPath, screenshot);
      
      console.log(`✓ Ícone ${size}x${size} salvo: icon-${size}x${size}.png`);
      
      await page.close();
    }
    
    console.log('\n🎉 Todos os ícones PNG foram gerados com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar ícones:', error);
  } finally {
    await browser.close();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePNGIcons().catch(console.error);
}

export { generatePNGIcons };
