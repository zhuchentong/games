import { LEVEL1 } from "../data/level1";
import { BaseLevelScene, type LevelDescriptor } from "./BaseLevelScene";
import { LEVEL_SCENE_KEYS } from "./levelKeys";

/** 第一关「森林 · 机龙巢径」：全部流程在 BaseLevelScene，此处只声明关卡数据与去向 */
export class Level1Scene extends BaseLevelScene {
  static readonly KEY = LEVEL_SCENE_KEYS[0];

  constructor() {
    super(Level1Scene.KEY);
  }

  protected get desc(): LevelDescriptor {
    return { id: 1, L: LEVEL1, music: "level", ambient: "forest", nextKey: LEVEL_SCENE_KEYS[1] };
  }
}
