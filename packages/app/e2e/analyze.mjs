import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const png = fs.readFileSync("/tmp/helios-e2e.png");
  const dataUrl = "data:image/png;base64," + png.toString("base64");

  const analysis = await page.evaluate(async (url) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    let warm = 0;
    let nonBlack = 0;
    const step = 4;
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma > 24) lit++;
      if (r + g + b > 40) nonBlack++;
      if (r > 120 && r > g + 30 && r > b + 30) warm++;
    }
    const total = c.width * c.height / step;
    return {
      width: c.width,
      height: c.height,
      litRatio: +(lit / total).toFixed(4),
      nonBlackRatio: +(nonBlack / total).toFixed(4),
      warmRatio: +(warm / total).toFixed(4),
    };
  }, dataUrl);

  console.log(JSON.stringify(analysis));
  if (analysis.litRatio < 0.001) {
    console.error("screenshot appears blank (litRatio < 0.1%)");
    process.exitCode = 1;
  }
  await browser.close();
}

void main();