import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=/loaded 14 object/i", { timeout: 15000 });
  await page.waitForTimeout(2500);

  const analysis = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return { error: "no canvas" };
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return { error: "no webgl context" };
    const w = canvas.width;
    const h = canvas.height;
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let lit = 0;
    let warm = 0;
    let total = w * h;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma > 24) lit++;
      if (r > 120 && r > g + 30 && r > b + 30) warm++;
    }
    return {
      width: w,
      height: h,
      litRatio: lit / total,
      warmRatio: warm / total,
      sample: Array.from(pixels.slice(0, 8 * 4)),
    };
  });

  console.log("canvas analysis:", JSON.stringify(analysis));
  if (analysis.error) process.exitCode = 1;
  if (typeof analysis.litRatio === "number") {
    if (analysis.litRatio < 0.001) {
      console.error("scene appears blank (litRatio < 0.1%)");
      process.exitCode = 1;
    } else {
      console.log(`scene has content: ${(analysis.litRatio * 100).toFixed(2)}% lit pixels`);
    }
    if (analysis.warmRatio > 0) {
      console.log("warm (reddish star-like) pixels present");
    }
  }
  await browser.close();
}

void main();