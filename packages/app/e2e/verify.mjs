import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(BASE, { waitUntil: "networkidle" });

  await page.waitForSelector("text=/loaded \\d+ object/i", { timeout: 15000 });
  const status = await page.evaluate(() => document.body.textContent);
  const loadedMatch = /loaded (\d+) object/.exec(status ?? "");
  console.log(`status: loaded ${loadedMatch?.[1]} objects`);

  const items = await page.$$(".obj-item");
  console.log(`object list items: ${items.length}`);

  const canvas = await page.$("canvas");
  if (!canvas) throw new Error("no canvas found — WebGL failed");
  console.log("canvas present");

  const rendererInfo = await page.evaluate(() => {
    const h = window.helios;
    if (!h) return null;
    return {
      universeSize: h.universe?.size,
      sunExists: !!h.universe?.get("star/sol"),
      earthExists: !!h.universe?.get("planet/earth"),
      hasScene: !!h.sceneViz?.scene,
      simTime: h.simTime ? h.simTime() : null,
    };
  });
  console.log("rendererInfo:", JSON.stringify(rendererInfo));

  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/helios-e2e.png" });

  const glErrors = consoleErrors.filter((e) => /WebGL|three/i.test(e));
  console.error("webgl/three errors:", glErrors);
  if (glErrors.length > 0) process.exitCode = 1;

  await browser.close();
}

void main();