import type { MothDef } from "../data/enemies";
import { burst } from "../systems/Fx";
import { ENEMY_ANIMS } from "../systems/Textures";
import { ScoutDrone } from "./ScoutDrone";

/** 孢翼蛾：黑森林的荧光鳞粉飞蛾（侦察机同款悬停-俯扑行为，换皮），俯扑瞬间撒落一圈荧光孢粉 */
export class SporeMoth extends ScoutDrone {
  constructor(scene: Phaser.Scene, def: MothDef) {
    super(scene, def);
  }

  protected applySkin(): void {
    this.setTexture("moth0");
  }

  protected hoverAnimKey(): string {
    return ENEMY_ANIMS.mothFlutter;
  }

  protected onDiveStart(): void {
    burst(this.scene, this.x, this.y, {
      color: 0x9fe86a,
      count: 6,
      size: 3,
      grow: 14,
      duration: 320,
      spreadX: 7,
      spreadY: 7,
    });
  }
}
