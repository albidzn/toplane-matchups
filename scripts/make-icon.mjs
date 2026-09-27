// Renders build/icon.png (512x512) for the desktop app. electron-builder
// converts it into a multi-size .ico for the exe and installer.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6d98a"/>
      <stop offset="1" stop-color="#c68d2e"/>
    </linearGradient>
    <radialGradient id="bg" cx="0.5" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#22304a"/>
      <stop offset="1" stop-color="#0a0e14"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect x="10" y="10" width="492" height="492" rx="104" fill="none" stroke="#e8b04b" stroke-opacity="0.25" stroke-width="4"/>
  <path d="M256 62 L420 150 V298 C420 374 352 434 256 462 C160 434 92 374 92 298 V150 Z"
        fill="none" stroke="url(#gold)" stroke-width="22" stroke-linejoin="round"/>
  <path d="M256 150 L334 194 V284 L256 334 L178 284 V194 Z" fill="url(#gold)"/>
  <circle cx="256" cy="240" r="28" fill="#0a0e14"/>
</svg>`;

fs.mkdirSync(path.join(root, "build"), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(path.join(root, "build", "icon.png"));
console.log("wrote build/icon.png");
