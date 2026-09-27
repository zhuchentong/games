import { LEVEL2 } from "../data/level2";
import { BaseLevelScene, type LevelDescriptor } from "./BaseLevelScene";
import { LEVEL_SCENE_KEYS } from "./levelKeys";

/** 第二关「熔火机厂」：熔岩坑/吊台/激光闸门 + 马克二型；通关后推进第三关「黑暗森林」 */
export class Level2Scene extends BaseLevelScene {
  static readonly KEY = LEVEL_SCENE_KEYS[1];

  constructor() {
    super(Level2Scene.KEY);
  }

  protected get desc(): LevelDescriptor {
    return { id: 2, L: LEVEL2, music: "level2", ambient: "furnace", nextKey: LEVEL_SCENE_KEYS[2] };
  }
}
