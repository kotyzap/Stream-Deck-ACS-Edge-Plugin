// Render the plugin's own key SVGs to PNG for static assets, profile mockups and marketplace media.
import { chromium } from "playwright";
import fs from "node:fs";
const src = fs.readFileSync("plugin/src/plugin.js", "utf8");
// evaluate CMD, GLYPH and keyImage from the plugin source without the SDK import
const body = src.replace(/^import .*$/mg, "").replace(/streamDeck\.[\s\S]*$/m, "").replace(/class Command[\s\S]*$/m, "");
const mod = new Function(body + "\nreturn { CMD, GLYPH, keyImage };")();
const wanted = { ...Object.fromEntries(Object.entries(mod.CMD).map(([k, c]) => [k, [c.glyph, c.color, c.title]])), open: ["open", "#ffcc33", "Open\nACS Edge"] };
fs.mkdirSync("keys", { recursive: true });
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 144, height: 144 }, deviceScaleFactor: 1 });
for (const [id, [g, c, t]] of Object.entries(wanted)) {
  await page.setContent(`<body style="margin:0;background:transparent"><img src="${mod.keyImage(g, c, t)}" width="144" height="144"></body>`);
  await page.screenshot({ path: `keys/${id}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 144, height: 144 } });
}
await browser.close(); console.log("rendered", Object.keys(wanted).length);
