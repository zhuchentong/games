import Phaser from "phaser";

const FADE_MS = 250;

/** 正在淡出的场景集合（防连按导致重复 start） */
const fading = new WeakSet<Phaser.Scene>();

/** 统一场景切换：当前场景淡出 250ms 后再 start（目标场景在 create 末尾调用 fadeIn） */
export function fadeTo(scene: Phaser.Scene, key: string, data?: object): void {
  if (fading.has(scene)) return;
  fading.add(scene);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    fading.delete(scene);
    scene.scene.start(key, data);
  });
  scene.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
}

/** 目标场景 create 末尾调用，配合 fadeTo 形成完整过渡 */
export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
}
