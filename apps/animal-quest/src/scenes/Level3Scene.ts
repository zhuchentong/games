import { LEVEL3 } from "../data/level3";
import { BaseLevelScene, type LevelDescriptor } from "./BaseLevelScene";
import { LEVEL_SCENE_KEYS } from "./levelKeys";

/** 第三关「黑暗森林」（最终关）：幻影平台/孢子气流/森林系小怪 + 古藤树怪；拾取森林之心进结算 */
export class Level3Scene extends BaseLevelScene {
  static readonly KEY = LEVEL_SCENE_KEYS[2];

  constructor() {
    super(Level3Scene.KEY);
  }

  protected get desc(): LevelDescriptor {
    return { id: 3, L: LEVEL3, music: "level3", ambient: "darkwood", nextKey: null };
  }
}
