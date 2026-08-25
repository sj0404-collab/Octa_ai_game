import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const tempDirectory = await mkdtemp(path.join(tmpdir(), "ai-core-input-test-"));
const bundlePath = path.join(tempDirectory, "input-manager.mjs");

class TestWindow extends EventTarget {}

function dispatch(windowTarget, type, key) {
  const event = new Event(type, { cancelable: true });
  if (key) Object.defineProperty(event, "key", { value: key });
  windowTarget.dispatchEvent(event);
}

try {
  await build({ entryPoints: ["client/src/game/InputManager.ts"], bundle: true, format: "esm", platform: "node", outfile: bundlePath });
  const testWindow = new TestWindow();
  globalThis.window = testWindow;
  const { InputManager } = await import(`${pathToFileURL(bundlePath).href}?run=${Date.now()}`);
  const input = new InputManager();

  dispatch(testWindow, "ai-core-sprint-start");
  if (!input.isSprinting()) throw new Error("Sprint start event was not retained");
  dispatch(testWindow, "ai-core-sprint-stop");
  if (input.isSprinting()) throw new Error("Sprint stop event was not retained");

  dispatch(testWindow, "keydown", "Shift");
  if (!input.isSprinting()) throw new Error("Shift did not enable sprint");
  dispatch(testWindow, "keyup", "Shift");
  if (input.isSprinting()) throw new Error("Shift release did not disable sprint");

  dispatch(testWindow, "ai-core-roll");
  if (!input.consumeRoll()) throw new Error("Roll event was not queued");
  if (input.consumeRoll()) throw new Error("Roll event was not consumed exactly once");
  input.dispose();
  console.log("Input control contract passed: sprint hold/release and roll dispatch.");
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
