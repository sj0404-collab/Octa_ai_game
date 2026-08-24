/** Prism Relay design reminder: Babylon owns the reactor painting; the React frame stays invisible and lifecycle-safe. */
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";

export interface GameHandle {
  scene: Scene;
  dispose: () => void;
}

export async function createGameScene(engine: Engine, _canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.008, 0.014, 0.03, 1);
  scene.ambientColor.set(0.2, 0.3, 0.42);
  const officeLight = new HemisphericLight("office-light", new Vector3(0.15, 1, -0.2), scene);
  officeLight.intensity = 1.35;
  officeLight.diffuse.set(0.55, 0.7, 0.9);
  officeLight.groundColor.set(0.035, 0.05, 0.08);

  const camera = new ArcRotateCamera("reactor-camera", -Math.PI / 2, 0.34, 20, new Vector3(0, 0, 0), scene);
  camera.fov = 0.87;
  camera.lowerRadiusLimit = 0.55;
  camera.upperRadiusLimit = 38;
  camera.lowerBetaLimit = 0.18;
  camera.upperBetaLimit = 1.32;
  camera.minZ = 0.025;
  camera.maxZ = 200;

  const world = new GameWorld(scene, camera);
  const updateObserver = scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(0.05, engine.getDeltaTime() / 1000);
    world.update(delta);
  });

  return {
    scene,
    dispose: () => {
      scene.onBeforeRenderObservable.remove(updateObserver);
      world.dispose();
      officeLight.dispose();
      scene.dispose();
    },
  };
}
