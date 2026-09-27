/** 启动场景：生成全部程序化纹理后进入标题页。 */

import Phaser from "phaser";
import { createTextures } from "../textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    createTextures(this);
    this.scene.start("title");
  }
}
