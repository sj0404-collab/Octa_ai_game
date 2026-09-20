import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Generated runtime assets now live in the repo (scripts/generate-assets.mjs).
// This script still honours the legacy external source and a remote fallback
// for older production copies.
const projectRoot = path.resolve(import.meta.dirname ?? ".", "..");
const localDirectory = path.join(projectRoot, "client", "public", "manus-storage");
const legacyDirectory = "/home/ubuntu/webdev-static-assets";
const outputDirectory = path.join(projectRoot, "dist", "public", "manus-storage");
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
    await copyFile(path.join(localDirectory, outputName), outputPath);
    return "repo";
  } catch {
    /* fall through to legacy source */
  }
  try {
    await copyFile(path.join(legacyDirectory, sourceName), outputPath);
    return "legacy";
  } catch (error) {
    if ((error).code !== "ENOENT" || !storageBaseUrl) throw error;
    const response = await fetch(`${storageBaseUrl}/${encodeURIComponent(outputName)}`);
    if (!response.ok) throw new Error(`Asset fallback failed for ${outputName}: HTTP ${response.status}`);
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    return "storage";
  }
}

await mkdir(outputDirectory, { recursive: true });
if (!existsSync(localDirectory)) {
  console.log("Runtime assets are missing from client/public/manus-storage — generating them now.");
  const generated = spawnSync("node", [path.join(projectRoot, "scripts", "generate-assets.mjs")], { stdio: "inherit" });
  if (generated.status !== 0) process.exitCode = generated.status ?? 1;
}
const locations = await Promise.all(assets.map(prepareAsset));
console.log(`Prepared ${assets.length} runtime game assets for the Android bundle (${locations.join(", ")}).`);
