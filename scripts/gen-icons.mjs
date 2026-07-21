// Gera os ícones PWA (PNG) a partir do public/favicon.svg, com fundo creme
// (ícone maskable precisa de fundo sólido). Uso: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "public", "favicon.svg");
const OUT = path.join(ROOT, "public", "icons");
mkdirSync(OUT, { recursive: true });

const CREME = { r: 240, g: 237, b: 230, alpha: 1 }; // #F0EDE6

async function gerar(tamanho, nome) {
  // arte em ~72% do quadro para sobrar respiro na máscara redonda
  const arte = Math.round(tamanho * 0.72);
  const artePng = await sharp(SRC).resize(arte, arte, { fit: "contain", background: CREME }).png().toBuffer();
  await sharp({
    create: { width: tamanho, height: tamanho, channels: 4, background: CREME },
  })
    .composite([{ input: artePng, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, nome));
  console.log(`ok ${nome} (${tamanho}x${tamanho})`);
}

await gerar(192, "icon-192.png");
await gerar(512, "icon-512.png");
await gerar(180, "apple-touch-icon.png");
