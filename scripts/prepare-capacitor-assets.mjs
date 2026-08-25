import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = "/home/ubuntu/webdev-static-assets";
const outputDirectory = path.resolve("dist/public/manus-storage");
const storageBaseUrl = process.env.MANUS_ASSET_BASE_URL?.replace(/\/$/, "");
const assets = [
  ["night-shift-visual-target_29f9f3b7.png", "night-shift-visual-target_29f9f3b7.png"],
  ["night-shift-worker-sprites_0a478e17.png", "night-shift-worker-sprites_0a478e17.png"],
  ["night-shift-pursuer-faces_0bdf956d.png", "night-shift-pursuer-faces_0bdf956d.png"],
  ["night-shift-office-props_13544a5d.png", "night-shift-office-props_13544a5d.png"],
  ["prism-relay-mark_555c1244.png", "prism-relay-mark_555c1244.png"],
];

async function prepareAsset([sourceName, outputName]) {
  const outputPath = path.join(outputDirectory, outputName);
  try {
    await copyFile(path.join(sourceDirectory, sourceName), outputPath);
    return "local";
  } catch (error) {
    if ((error).code !== "ENOENT" || !storageBaseUrl) throw error;
    const response = await fetch(`${storageBaseUrl}/${encodeURIComponent(outputName)}`);
    if (!response.ok) throw new Error(`Asset fallback failed for ${outputName}: HTTP ${response.status}`);
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    return "storage";
  }
}

await mkdir(outputDirectory, { recursive: true });
const locations = await Promise.all(assets.map(prepareAsset));
console.log(`Prepared ${assets.length} runtime game assets for the Android bundle (${locations.join(", ")}).`);
