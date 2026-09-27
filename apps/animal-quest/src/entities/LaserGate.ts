import Phaser from "phaser";
import type { LaserGateDef } from "../data/levels";
import { Sfx } from "../systems/Sfx";
import type { Player } from "./Player";

/** 开启转预警的闪烁窗口 */
const WARN_MS = 500;
/** 激光接触伤害 */
const LASER_DAMAGE = 16;

/**
 * 激光闸门：垂直光柱周期启闭（on → 500ms 预警闪烁 → off），相位可偏移。
 * 开启期光柱与玩家包围盒相交即受伤；发射器顶/底座装饰恒亮。
 */
export class LaserGate {
  private readonly def: LaserGateDef;
  private readonly beam: Phaser.GameObjects.Rectangle;
  private readonly tele: Phaser.GameObjects.Rectangle;
  private wasOn = false;

  constructor(scene: Phaser.Scene, def: LaserGateDef) {
    this.def = def;
    // 发射器（顶罩 + 底座）
    scene.add.rectangle(def.x - 8, def.top - 8, 16, 8, 0x3a4150).setOrigin(0);
    scene.add.rectangle(def.x - 5, def.top + def.h, 10, 6, 0x3a4150).setOrigin(0);
    this.tele = scene.add
      .rectangle(def.x, def.top + def.h / 2, 4, def.h, 0xff3b30, 0.3)
      .setVisible(false);
    this.beam = scene.add
      .rectangle(def.x, def.top + def.h / 2, 7, def.h, 0xff5544, 0.92)
      .setVisible(false);
  }

  tick(player: Player, time: number): void {
    const local = (time + this.def.offsetMs) % this.def.periodMs;
    if (local < this.def.onMs) {
      if (!this.wasOn) {
        this.wasOn = true;
        Sfx.laserCharge();
      }
      this.tele.setVisible(false);
      this.beam.setVisible(true);
      const rect = new Phaser.Geom.Rectangle(this.def.x - 4, this.def.top, 8, this.def.h);
      if (Phaser.Geom.Rectangle.Overlaps(rect, player.bounds())) {
        player.damage(LASER_DAMAGE, this.def.x);
      }
    } else {
      this.wasOn = false;
      this.beam.setVisible(false);
      const warn = local < this.def.onMs + WARN_MS;
      this.tele.setVisible(warn);
      if (warn) this.tele.setAlpha(0.18 + Math.abs(Math.sin(time / 90)) * 0.22);
    }
  }
}
