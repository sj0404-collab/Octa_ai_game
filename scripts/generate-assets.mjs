/**
 * Night Shift — procedural asset pipeline.
 *
 * Generates the runtime PNG assets that the game previously expected from the
 * external `manus-storage` bucket. The output is written to
 * `client/public/manus-storage/` so dev server and production bundle both serve
 * them with zero external dependencies. Pure Node: zlib + manual PNG encoding.
 *
 * Run: `node scripts/generate-assets.mjs`
 */
import { deflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "client", "public", "manus-storage");

// ---------------------------------------------------------------------------
// Minimal RGBA canvas
// ---------------------------------------------------------------------------
function makeCanvas(width, height, scale = 1) {
  const w = width * scale;
  const h = height * scale;
  const data = new Uint8Array(w * h * 4);
  return { w, h, scale, data };
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);

function blendPixel(canvas, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= canvas.w || y >= canvas.h || a <= 0) return;
  const i = (y * canvas.w + x) * 4;
  const sa = a / 255;
  const da = canvas.data[i + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  canvas.data[i] = (r * sa + canvas.data[i] * da * (1 - sa)) / outA;
  canvas.data[i + 1] = (g * sa + canvas.data[i + 1] * da * (1 - sa)) / outA;
  canvas.data[i + 2] = (b * sa + canvas.data[i + 2] * da * (1 - sa)) / outA;
  canvas.data[i + 3] = outA * 255;
}

function fillRect(canvas, x, y, w, h, [r, g, b], a = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(canvas.w - 1, Math.floor(x + w));
  const y1 = Math.min(canvas.h - 1, Math.floor(y + h));
  for (let yy = y0; yy <= y1; yy += 1) {
    for (let xx = x0; xx <= x1; xx += 1) {
      blendPixel(canvas, xx, yy, r, g, b, a);
    }
  }
}

/** Ellipse / circle with soft anti-aliased edge and optional concave core. */
function fillEllipse(canvas, cx, cy, rx, ry, [r, g, b], a = 255, thickness = 0) {
  const x0 = Math.max(0, Math.floor(cx - rx - 1));
  const x1 = Math.min(canvas.w - 1, Math.ceil(cx + rx + 1));
  const y0 = Math.max(0, Math.floor(cy - ry - 1));
  const y1 = Math.min(canvas.h - 1, Math.ceil(cy + ry + 1));
  for (let yy = y0; yy <= y1; yy += 1) {
    for (let xx = x0; xx <= x1; xx += 1) {
      const d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2;
      if (d > 1) continue;
      if (thickness > 0 && d < (1 - thickness) ** 2) continue;
      const coverage = Math.min(1, (1 - d) * 2.2);
      blendPixel(canvas, xx, yy, r, g, b, Math.round(a * coverage));
    }
  }
}

/** Point-in-rounded-rect with soft edge. */
function fillRoundedRect(canvas, x, y, w, h, radius, [r, g, b], a = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const x1 = Math.min(canvas.w - 1, Math.ceil(x + w));
  const y0 = Math.max(0, Math.floor(y));
  const y1 = Math.min(canvas.h - 1, Math.ceil(y + h));
  for (let yy = y0; yy <= y1; yy += 1) {
    for (let xx = x0; xx <= x1; xx += 1) {
      const qx = Math.max(x + radius, Math.min(x + w - radius, xx));
      const qy = Math.max(y + radius, Math.min(y + h - radius, yy));
      const dist = Math.hypot(xx - qx, yy - qy);
      const inside = xx >= x && xx <= x + w && yy >= y && yy <= y + h && dist <= radius;
      if (!inside) continue;
      const coverage = Math.min(1, (radius - dist) * 1.4 + 1);
      blendPixel(canvas, xx, yy, r, g, b, Math.round(a * coverage));
    }
  }
}

/** Triangle rasterizer (screen coords). */
function fillTriangle(canvas, p1, p2, p3, [r, g, b], a = 255) {
  const minX = Math.max(0, Math.floor(Math.min(p1[0], p2[0], p3[0])));
  const maxX = Math.min(canvas.w - 1, Math.ceil(Math.max(p1[0], p2[0], p3[0])));
  const minY = Math.max(0, Math.floor(Math.min(p1[1], p2[1], p3[1])));
  const maxY = Math.min(canvas.h - 1, Math.ceil(Math.max(p1[1], p2[1], p3[1])));
  const area = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]);
  if (Math.abs(area) < 1e-6) return;
  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let xx = minX; xx <= maxX; xx += 1) {
      const w0 = ((p2[0] - p1[0]) * (yy - p1[1]) - (p2[1] - p1[1]) * (xx - p1[0])) / area;
      const w1 = ((p3[0] - p2[0]) * (yy - p2[1]) - (p3[1] - p2[1]) * (xx - p2[0])) / area;
      const w2 = 1 - w0 - w1;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) blendPixel(canvas, xx, yy, r, g, b, a);
    }
  }
}

function fillRing(canvas, cx, cy, outer, inner, [r, g, b], a = 255) {
  fillEllipse(canvas, cx, cy, outer, outer, [r, g, b], a, 1 - inner / outer);
}

/** Linear gradient rectangle (vertical). */
function fillRectGradient(canvas, x, y, w, h, top, bottom, a = 255) {
  const x0 = Math.max(0, Math.floor(x));
  const x1 = Math.min(canvas.w - 1, Math.ceil(x + w));
  const y0 = Math.max(0, Math.floor(y));
  const y1 = Math.min(canvas.h - 1, Math.ceil(y + h));
  for (let yy = y0; yy <= y1; yy += 1) {
    const t = (yy - y) / Math.max(1, h);
    const [r, g, b] = [mix(top[0], bottom[0], t), mix(top[1], bottom[1], t), mix(top[2], bottom[2], t)];
    for (let xx = x0; xx <= x1; xx += 1) {
      blendPixel(canvas, xx, yy, r, g, b, a);
    }
  }
}

function downsample(canvas) {
  if (canvas.scale === 1) return canvas;
  const w = Math.floor(canvas.w / canvas.scale);
  const h = Math.floor(canvas.h / canvas.scale);
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = 0; sy < canvas.scale; sy += 1) {
        for (let sx = 0; sx < canvas.scale; sx += 1) {
          const i = ((y * canvas.scale + sy) * canvas.w + (x * canvas.scale + sx)) * 4;
          r += canvas.data[i]; g += canvas.data[i + 1]; b += canvas.data[i + 2]; a += canvas.data[i + 3]; n += 1;
        }
      }
      const i = (y * w + x) * 4;
      out[i] = r / n; out[i + 1] = g / n; out[i + 2] = b / n; out[i + 3] = a / n;
    }
  }
  return { w, h, data: out };
}

// ---------------------------------------------------------------------------
// PNG encoder (RGBA8, no palette)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(canvas) {
  const { w, h, data } = downsample(canvas);
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    const row = data.subarray(y * stride, y * stride + stride);
    Buffer.from(row.buffer, row.byteOffset, row.byteLength).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const C = {
  navy: [7, 16, 26],
  navySoft: [11, 27, 41],
  slate: [20, 42, 58],
  mint: [96, 246, 212],
  mintDim: [44, 196, 168],
  white: [233, 244, 245],
  amber: [228, 177, 94],
  coral: [255, 107, 99],
  violet: [168, 160, 255],
  indigo: [28, 46, 78],
  blueAccent: [101, 171, 255],
};

// ---------------------------------------------------------------------------
// Artwork
// ---------------------------------------------------------------------------
function drawWorkerFrame(frame, cx, cy, lean) {
  const c = makeCanvas(128, 128, 2);
  const center = 64 + lean * 10;
  // Floor shadow
  fillEllipse(c, 64, 96, 30, 9, [0, 0, 0], 90);
  // Teleport wrap (frame 4): warp diamond + converging sparks
  if (frame === 4) {
    fillEllipse(c, 64, 56, 46, 46, C.mint, 26, 0.42);
    fillEllipse(c, 64, 56, 32, 32, C.white, 34);
    const corner = (ox, oy, dir) => {
      for (let i = 0; i < 6; i += 1) {
        const x = 64 + ox * (14 + i * 5);
        const y = 56 + oy * (14 + i * 5);
        fillRect(c, x - 1.5, y - 1.5, 3, 3, C.mint, 120 - i * 16);
        fill(
          c,
          x + ox * dir,
          y - 2,
          3,
          4,
          C.mint,
          100 - i * 12,
        );
      }
    };
    corner(-1, -1, 1); corner(1, -1, -1); corner(-1, 1, 1); corner(1, 1, -1);
  }
  // Dash (frame 3): motion streaks behind
  if (frame === 3) {
    for (let i = 0; i < 5; i += 1) {
      const sx = center - 26 - i * 12;
      const sy = 56 - (i % 2 ? 12 : -14);
      fillTriangle(c, [sx, sy - 3], [sx + 9, sy], [sx, sy + 3], C.mint, 110 - i * 18);
    }
  }
  // Body shell
  fillEllipse(c, center, 58, 20, 26, C.mint, 255, 0.14);
  fillEllipse(c, center, 60, 17, 22, C.navy, 255);
  fillEllipse(c, center - 6, 50, 10, 9, C.navySoft, 255);
  // Shoulder pads (walk frames offset to suggest stride)
  const offL = frame === 1 ? 6 : frame === 2 ? -6 : 3;
  const offR = frame === 1 ? -6 : frame === 2 ? 6 : -3;
  fillEllipse(c, center + offL, 50, 7, 6, C.white, 180);
  fillEllipse(c, center + offR, 50, 7, 6, C.white, 180);
  // Head / helmet
  fillEllipse(c, center, 40, 12, 9, C.white, 255);
  fillEllipse(c, center - 3, 38, 5, 4, C.mint, 255);
  // ID badge
  fillRoundedRect(c, center - 4, 64, 8, 9, 1.5, C.amber, 255);
  fillRect(c, center - 2, 66, 4, 2, C.navy, 255);
  // Facing notch (indicates direction on the map)
  const dirSign = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  if (dirSign !== 0) {
    fillTriangle(c, [center + dirSign * 22, 58], [center + dirSign * 33, 63], [center + dirSign * 22, 68], C.mint, 255);
    fillEllipse(c, center + dirSign * 24, 63, 5, 5, C.white, 200);
  } else if (frame === 0) {
    fillRing(c, center, 26, 9, 6, C.mint, 140);
  }
  // Briefcase
  fillRoundedRect(c, center + (frame === 4 ? 0 : frame === 1 ? 16 : -16), 66, 11, 15, 2, C.slate, 255);
  fillRect(c, center + (frame === 4 ? 0 : frame === 1 ? 16 : -16) + 3, 64, 5, 2, C.mint, 255);
  return c;
}

function fill(c, x, y, w, h, col, a) {
  fillRect(c, x, y, w, h, col, a);
}

function drawWorkerSheet() {
  const frames = [0, 1, 2, 3, 4].map((frame) => {
    const lean = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    return drawWorkerFrame(frame, 64, 56, lean);
  });
  const sheet = makeCanvas(640, 128);
  frames.forEach((frame, index) => {
    const { w, h, data } = downsample(frame);
    for (let y = 0; y < h; y += 1) {
      const src = y * w;
      const dst = y * 640 + index * 128;
      sheet.data.set(data.subarray(src * 4, src * 4 + w * 4), dst * 4);
    }
  });
  return encodePNG(sheet);
}

function drawPursuerFaces() {
  const c = makeCanvas(288, 96, 2);
  // Watcher — rounded coral visor with a single glowing slit
  fillEllipse(c, 48, 44, 34, 40, C.coral, 34, 0.1);
  fillRoundedRect(c, 24, 20, 48, 48, 12, C.coral, 255);
  fillRoundedRect(c, 28, 24, 40, 40, 9, C.white, 255);
  fillRoundedRect(c, 20, 36, 56, 10, 5, C.navy, 255);
  fillRoundedRect(c, 24, 39, 48, 4, 2, C.coral, 255);
  fillEllipse(c, 34, 24, 4, 3, C.navy, 255);
  fillEllipse(c, 62, 24, 4, 3, C.navy, 255);
  // Hunter — angular amber chevron visor, twin slits, jaw spikes
  fillTriangle(c, [176, 56], [144, 20], [208, 20], C.amber, 255);
  fillTriangle(c, [176, 44], [154, 24], [198, 24], C.navy, 255);
  fillTriangle(c, [176, 34], [162, 26], [190, 26], C.amber, 255);
  fillTriangle(c, [160, 58], [148, 70], [172, 70], C.amber, 200);
  fillTriangle(c, [192, 58], [180, 70], [204, 70], C.amber, 200);
  fillTriangle(c, [176, 70], [168, 82], [184, 82], C.amber, 160);
  fillEllipse(c, 168, 22, 3, 3, C.amber, 255);
  fillEllipse(c, 184, 22, 3, 3, C.amber, 255);
  // Collector — violet disc with a tri-eye cluster and radial spikes
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8;
    fillTriangle(
      c,
      [240 + Math.cos(angle) * 26, 44 + Math.sin(angle) * 26],
      [240 + Math.cos(angle + 0.12) * 38, 44 + Math.sin(angle + 0.12) * 38],
      [240 + Math.cos(angle - 0.12) * 38, 44 + Math.sin(angle - 0.12) * 38],
      C.violet,
      220,
    );
  }
  fillEllipse(c, 240, 44, 30, 30, C.violet, 255);
  fillEllipse(c, 240, 44, 22, 22, C.white, 255);
  const eyes = [
    [232, 38],
    [248, 38],
    [240, 52],
  ];
  eyes.forEach(([ex, ey]) => {
    fillTriangle(c, [ex, ey - 6], [ex - 5, ey + 5], [ex + 5, ey + 5], C.violet, 255);
    fillEllipse(c, ex, ey, 3, 3, C.navy, 255);
  });
  return encodePNG(c);
}

function drawBrandMark() {
  const c = makeCanvas(48, 48, 2);
  fillRect(c, 0, 0, 48, 48, [0, 0, 0], 0); // transparent base
  // Outer rotated square
  fillRoundedRect(c, 8, 8, 32, 32, 4, C.mint, 220);
  // Rotated inner diamond (approximated by concentric rotated squares)
  const rot = (px, py, cx, cy, ang) => {
    const s = Math.sin(ang);
    const k = Math.cos(ang);
    return [cx + (px - cx) * k - (py - cy) * s, cy + (px - cx) * s + (py - cy) * k];
  };
  const sq = [
    [13, 22],
    [24, 11],
    [35, 22],
    [24, 33],
  ].map((p) => rot(p[0], p[1], 24, 22, Math.PI / 4));
  fillTriangle(c, sq[0], sq[1], sq[3], C.navy, 255);
  fillTriangle(c, sq[1], sq[2], sq[3], C.navy, 255);
  const inner = sq.map((p) => rot(p[0], p[1], 24, 22, Math.PI / 4 + 0.35));
  fillTriangle(c, inner[0], inner[1], inner[3], C.mint, 230);
  fillTriangle(c, inner[1], inner[2], inner[3], C.mint, 230);
  fillEllipse(c, 24, 22, 4, 4, C.white, 255);
  return encodePNG(c);
}

function drawOfficeProps() {
  const c = makeCanvas(256, 64, 2);
  // Safe (amber) — cell 0
  fillRoundedRect(c, 14, 14, 36, 36, 3, C.amber, 255);
  fillRoundedRect(c, 26, 26, 12, 12, 2, C.navy, 255);
  fillRect(c, 30, 30, 4, 4, C.amber, 255);
  // Healing station (mint cross) — cell 1
  fillEllipse(c, 96, 32, 20, 20, C.white, 255);
  fillRect(c, 89, 24, 14, 16, C.navy, 255);
  fillRect(c, 92, 21, 8, 22, C.mint, 255);
  fillRect(c, 88, 25, 16, 14, C.navy, 255);
  fillRect(c, 91, 22, 10, 20, C.mint, 255);
  // Ammo shell (blue) — cell 2
  fillTriangle(c, [158, 20], [166, 20], [162, 44], C.blueAccent, 255);
  fillRect(c, 152, 40, 20, 10, C.blueAccent, 255);
  fillRect(c, 155, 42, 14, 4, C.white, 255);
  // Relic (amber torus) — cell 3
  fillRing(c, 224, 32, 16, 9, C.amber, 255);
  fillEllipse(c, 224, 32, 6, 6, C.white, 255);
  return encodePNG(c);
}

function drawBackgroundPlate() {
  const c = makeCanvas(960, 540);
  fillRectGradient(c, 0, 0, 960, 540, [2, 6, 15], [6, 14, 26], 255);
  // Floor grid
  for (let x = 0; x < 960; x += 48) fillRect(c, x, 0, 1, 540, C.indigo, 70);
  for (let y = 0; y < 540; y += 48) fillRect(c, 0, y, 960, 1, C.indigo, 60);
  // Ceiling panels
  for (let gx = 0; gx < 4; gx += 1) {
    for (let gy = 0; gy < 2; gy += 1) {
      fillRect(c, 24 + gx * 240, 24 + gy * 240, 210, 210, C.indigo, 24);
    }
  }
  // Desks scattered
  const desks = [
    [150, 120, 96, 60],
    [620, 90, 96, 60],
    [760, 380, 96, 60],
    [300, 400, 96, 60],
    [120, 420, 60, 42],
    [820, 220, 60, 42],
  ];
  desks.forEach(([dx, dy, dw, dh], i) => {
    fillRoundedRect(c, dx, dy, dw, dh, 4, C.slate, 110);
    if (i % 2 === 0) fillEllipse(c, dx + dw * 0.28, dy + dh * 0.4, 7, 12, C.blueAccent, 150);
  });
  // Moving partition (coral)
  fillRect(c, 430, 120, 90, 14, C.coral, 190);
  fillRect(c, 430, 132, 90, 2, C.coral, 90);
  fillRect(c, 430, 118, 6, 16, C.slate, 255);
  fillRect(c, 514, 118, 6, 16, C.slate, 255);
  // Exit glow (mint, upper area)
  const gx2 = 720, gy2 = 120;
  for (let ringR = 90; ringR > 20; ringR -= 12) {
    fillRing(c, gx2, gy2, ringR, Math.max(2, ringR - 8), C.mint, 34 + (90 - ringR) * 1.5);
  }
  fillRoundedRect(c, gx2 - 6, gy2 - 6, 12, 12, 2, C.mint, 220);
  // Vault amber glow (bottom-left)
  const vx = 260, vy = 300;
  fillRing(c, vx, vy, 60, 46, C.amber, 60);
  fillRoundedRect(c, vx - 16, vy - 16, 32, 32, 4, C.amber, 200);
  fillRect(c, vx - 6, vy - 6, 12, 12, C.navy, 255);
  // Coral threat haze (right edge)
  fillEllipse(c, 940, 470, 220, 150, C.coral, 22, 0.25);
  // Scanline streaks
  for (let i = 0; i < 7; i += 1) {
    const y = 90 + i * 62;
    fillRect(c, 48, y, 270, 1, C.mint, 26);
  }
  return encodePNG(c);
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
const ASSETS = {
  "night-shift-worker-sprites_0a478e17.png": drawWorkerSheet,
  "night-shift-pursuer-faces_0bdf956d.png": drawPursuerFaces,
  "prism-relay-mark_555c1244.png": drawBrandMark,
  "night-shift-office-props_13544a5d.png": drawOfficeProps,
  "night-shift-visual-target_29f9f3b7.png": drawBackgroundPlate,
};

await mkdir(OUT_DIR, { recursive: true });
for (const [name, draw] of Object.entries(ASSETS)) {
  const png = draw();
  await writeFile(path.join(OUT_DIR, name), png);
  console.log(`written ${name} (${(png.byteLength / 1024).toFixed(1)} KiB)`);
}
console.log(`Generated ${Object.keys(ASSETS).length} assets into ${path.relative(ROOT, OUT_DIR)}/`);