import Phaser from "phaser";
import { flashTint, hitSpark, floatText as fxFloatText, burst } from "../systems/Fx";
import { explosion } from "../systems/Particles";
import { HealthPack } from "./HealthPack";
import type { Player } from "./Player";

/** 小怪死亡掉血包概率（Boss 走专属死亡演出，不经此路径） */
const PACK_DROP_CHANCE = 35;

/** 敌人基类：hp/接触伤害/受击闪白/死亡淡出；运动逻辑由子类 tick 实现（场景经 CombatSystem 驱动） */
export abstract class Enemy extends Phaser.GameObjects.Sprite {
  hp: number;
  readonly maxHp: number;
  readonly touchDamage: number;
  dead = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    hp: number,
    touchDamage: number,
  ) {
    super(scene, x, y, texture);
    this.hp = hp;
    this.maxHp = hp;
    this.touchDamage = touchDamage;
    scene.add.existing(this);
  }

  bounds(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height,
    );
  }

  /** fromX = 命中点 x（Boss 弱点判定用；普通敌人忽略） */
  hit(damage: number, fromX?: number): void {
    void fromX;
    if (this.dead) return;
    this.hp -= damage;
    hitSpark(this.scene, this.x, this.y - this.height / 2);
    this.floatText(`-${damage}`, "#ffe08a");
    flashTint(this);
    if (this.hp <= 0) this.die();
  }

  /** 受击伤害飘字 */
  protected floatText(text: string, color: string): void {
    fxFloatText(this.scene, this.x, this.y - this.height / 2 - 8, text, { color, bold: true });
  }

  protected die(): void {
    this.dead = true;
    // 金色碎屑四散 + 机体黑烟上升
    burst(this.scene, this.x, this.y);
    explosion(this.scene, this.x, this.y, {
      tints: [0xffd23e, 0xff9f1a, 0xffffff],
      count: 13,
      speed: [60, 180],
      life: [320, 600],
    });
    explosion(this.scene, this.x, this.y - 6, {
      tints: [0x4a4a52, 0x6a6a72],
      count: 4,
      speed: [14, 38],
      angle: [250, 290],
      life: [450, 780],
      gravityY: -70,
      alpha: 0.5,
      scale: 1.5,
    });
    // 掉落血包：35% 概率（地面高度由所在关卡场景标注，兜底 500）
    if (Phaser.Math.Between(1, 100) <= PACK_DROP_CHANCE) {
      const scene = this.scene as unknown as { player?: Player; groundTop?: number };
      if (scene.player) {
        new HealthPack(this.scene, this.x, this.y, scene.player, scene.groundTop);
      }
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + 24,
      angle: 160,
      duration: 260,
      onComplete: () => this.destroy(),
    });
  }

  abstract tick(player: Player, time: number, delta: number): void;
}
