// Deck for AXIS Camera Station Edge — Stream Deck plugin
// Pavel Kotyza <kotyza@gmail.com> — https://www.4xs.dev
//
// ACS Edge (web app or Windows desktop client) is driven entirely by keyboard shortcuts, so each key
// sends one keystroke to the focused window: macOS via System Events, Windows via SendKeys.
import streamDeck, { SingletonAction } from "@elgato/streamdeck";
import { execFile } from "node:child_process";
import { platform } from "node:os";

const PLUGIN = "com.4xsdev.acs-edge";
const DEFAULT_URL = "https://acs.mysystems.axis.com";

// ---------------------------------------------------------------- commands
// mac: System Events `key code` (Carbon) + modifiers; win: SendKeys string.
// Colours: playback amber, PTZ blue, info grey. Glyphs are drawn as SVG paths, not font glyphs.
const CMD = {
    "prev":       { title: "Prev\nrecording",  color: "#ffcc33", glyph: "prev",    mac: { code: 38 },                       win: "j" },
    "next":       { title: "Next\nrecording",  color: "#ffcc33", glyph: "next",    mac: { code: 37 },                       win: "l" },
    "back":       { title: "−0.5 s",           color: "#ffcc33", glyph: "back",    mac: { code: 123 },                      win: "{LEFT}" },
    "fwd":        { title: "+0.5 s",           color: "#ffcc33", glyph: "fwd",     mac: { code: 124 },                      win: "{RIGHT}" },
    "play":       { title: "Play /\nPause",    color: "#ffcc33", glyph: "play",    mac: { code: 49 },                       win: " " },
    "zoom-in":    { title: "Zoom in",          color: "#4da3ff", glyph: "zoomin",  mac: { key: "+", mods: ["control"] },    win: "^{+}" },
    "zoom-out":   { title: "Zoom out",         color: "#4da3ff", glyph: "zoomout", mac: { key: "-", mods: ["control"] },    win: "^{-}" },
    "tilt-up":    { title: "Tilt up",          color: "#4da3ff", glyph: "up",      mac: { code: 126, mods: ["control"] },   win: "^{UP}" },
    "tilt-down":  { title: "Tilt down",        color: "#4da3ff", glyph: "down",    mac: { code: 125, mods: ["control"] },   win: "^{DOWN}" },
    "pan-left":   { title: "Pan left",         color: "#4da3ff", glyph: "left",    mac: { code: 123, mods: ["control"] },   win: "^{LEFT}" },
    "pan-right":  { title: "Pan right",        color: "#4da3ff", glyph: "right",   mac: { code: 124, mods: ["control"] },   win: "^{RIGHT}" },
    "details":    { title: "Stream\ndetails",  color: "#9a9a9e", glyph: "info",    mac: { code: 34, mods: ["control"] },    win: "^i" },
    "debug":      { title: "Copy\ndebug info", color: "#9a9a9e", glyph: "bug",     mac: { code: 2, mods: ["control", "option"] }, win: "^%d" },
    "help":       { title: "Shortcuts",        color: "#9a9a9e", glyph: "help",    mac: { key: "?" },                       win: "{?}" },
};

// Glyphs: simple stroked/filled paths on a 144×144 key, centred around (72,56).
const GLYPH = {
    prev:    `<path d="M92 34v44L58 56z" fill="C"/><rect x="48" y="34" width="8" height="44" fill="C"/>`,
    next:    `<path d="M52 34v44l34-22z" fill="C"/><rect x="88" y="34" width="8" height="44" fill="C"/>`,
    back:    `<path d="M84 34L58 56l26 22" fill="none" stroke="C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    fwd:     `<path d="M60 34l26 22-26 22" fill="none" stroke="C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    play:    `<path d="M50 32v48l38-24z" fill="C"/><rect x="94" y="32" width="8" height="48" fill="C" opacity=".55"/>`,
    zoomin:  `<circle cx="66" cy="52" r="20" fill="none" stroke="C" stroke-width="8"/><path d="M81 67l16 16" stroke="C" stroke-width="9" stroke-linecap="round"/><path d="M66 42v20M56 52h20" stroke="C" stroke-width="7" stroke-linecap="round"/>`,
    zoomout: `<circle cx="66" cy="52" r="20" fill="none" stroke="C" stroke-width="8"/><path d="M81 67l16 16" stroke="C" stroke-width="9" stroke-linecap="round"/><path d="M56 52h20" stroke="C" stroke-width="7" stroke-linecap="round"/>`,
    up:      `<path d="M72 78V36M50 56l22-22 22 22" fill="none" stroke="C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    down:    `<path d="M72 34v42M50 56l22 22 22-22" fill="none" stroke="C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    left:    `<path d="M94 56H52M72 34L50 56l22 22" fill="none" stroke="C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    right:   `<path d="M50 56h42M72 34l22 22-22 22" fill="none" stroke="C" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    info:    `<circle cx="72" cy="56" r="24" fill="none" stroke="C" stroke-width="8"/><path d="M72 52v16" stroke="C" stroke-width="8" stroke-linecap="round"/><circle cx="72" cy="42" r="4.5" fill="C"/>`,
    bug:     `<rect x="54" y="44" width="36" height="34" rx="14" fill="none" stroke="C" stroke-width="8"/><path d="M60 36l6 8M84 36l-6 8M46 56h8M90 56h8M48 74l8-6M96 74l-8-6" stroke="C" stroke-width="7" stroke-linecap="round"/>`,
    help:    `<circle cx="72" cy="56" r="24" fill="none" stroke="C" stroke-width="8"/><path d="M63 49a9 9 0 1 1 13 8c-3 2-4 4-4 7" fill="none" stroke="C" stroke-width="7" stroke-linecap="round"/><circle cx="72" cy="70" r="4" fill="C"/>`,
    open:    `<rect x="40" y="36" width="64" height="44" rx="6" fill="none" stroke="C" stroke-width="8"/><path d="M40 48h64" stroke="C" stroke-width="6"/><circle cx="49" cy="42" r="2.5" fill="C"/><circle cx="57" cy="42" r="2.5" fill="C"/>`,
};

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function keyImage(glyph, color, title) {
    const lines = String(title).split("\n").slice(0, 2);
    const size = Math.max(...lines.map((l) => l.length)) <= 10 ? 22 : 18;
    const y0 = lines.length === 1 ? 108 : 100;
    const text = lines.map((l, i) =>
        `<text x="72" y="${y0 + i * (size + 2)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#f2f2f7" text-anchor="middle">${esc(l)}</text>`).join("");
    const art = (GLYPH[glyph] ?? "").replace(/"C"/g, `"${color}"`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <rect width="144" height="144" rx="18" fill="#1c1c1e"/><rect width="144" height="10" fill="${color}"/>${art}${text}</svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ---------------------------------------------------------------- keystrokes
function sendKeys(cmd) {
    return new Promise((resolve, reject) => {
        const done = (err) => (err ? reject(err) : resolve());
        if (platform() === "darwin") {
            const m = cmd.mac;
            const mods = (m.mods ?? []).map((x) => `${x} down`).join(", ");
            const using = mods ? ` using {${mods}}` : "";
            const stmt = m.key !== undefined ? `keystroke "${m.key}"${using}` : `key code ${m.code}${using}`;
            execFile("osascript", ["-e", `tell application "System Events" to ${stmt}`], done);
        } else if (platform() === "win32") {
            const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${cmd.win.replace(/'/g, "''")}')`;
            execFile("powershell", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", script], done);
        } else {
            reject(new Error(`unsupported platform ${platform()}`));
        }
    });
}

// ---------------------------------------------------------------- actions
class Command extends SingletonAction {
    manifestId = `${PLUGIN}.command`;
    onWillAppear(ev) { this.#paint(ev.action, ev.payload.settings); }
    onDidReceiveSettings(ev) { this.#paint(ev.action, ev.payload.settings); }
    async onKeyDown(ev) {
        const cmd = CMD[ev.payload.settings.command] ?? CMD.play;
        try { await sendKeys(cmd); }
        catch (e) { streamDeck.logger.error(`keystroke failed: ${e.message}`); ev.action.showAlert(); }
    }
    #paint(a, s) { const c = CMD[s.command] ?? CMD.play; a.setImage(keyImage(c.glyph, c.color, c.title)); }
}

class Open extends SingletonAction {
    manifestId = `${PLUGIN}.open`;
    onWillAppear(ev) { ev.action.setImage(keyImage("open", "#ffcc33", "Open\nACS Edge")); }
    onKeyDown(ev) {
        const url = (ev.payload.settings.url ?? "").trim() || DEFAULT_URL;
        streamDeck.system.openUrl(url);
    }
}

/** Ko-fi — GitHub build only (Marketplace forbids sponsor links inside plugins; plugin/package.sh --kofi adds it). */
class Kofi extends SingletonAction {
    manifestId = `${PLUGIN}.kofi`;
    onKeyDown() { streamDeck.system.openUrl("https://ko-fi.com/K3K6RR4LY"); }
}

streamDeck.actions.registerAction(new Command());
streamDeck.actions.registerAction(new Open());
streamDeck.actions.registerAction(new Kofi());
streamDeck.connect();
