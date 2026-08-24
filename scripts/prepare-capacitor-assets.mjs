import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = "/home/ubuntu/webdev-static-assets";
const outputDirectory = path.resolve("dist/public/manus-storage");
const assets = [
  ["prism-relay-visual-target.png", "prism-relay-visual-target_09a3647c.png"],
  ["prism-relay-player-drone.png", "prism-relay-player-drone_9dbcead1.png"],
  ["prism-relay-sentinel.png", "prism-relay-sentinel_a7aabcbf.png"],
  ["prism-relay-mark.png", "prism-relay-mark_555c1244.png"],
];

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  assets.map(([sourceName, outputName]) => copyFile(path.join(sourceDirectory, sourceName), path.join(outputDirectory, outputName))),
);

console.log(`Prepared ${assets.length} runtime game assets for the Android bundle.`);
