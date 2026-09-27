import Phaser from "phaser";
import type { ThornburDef } from "../data/enemies";
import { ENEMY_ANIMS } from "../systems/Textures";
import { burst, shockRing } from "../systems/Fx";
import { explosion } from "../systems/Particles";
import { Sfx } from "../systems/Sfx";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

type ThornburState = "guard" | "chase" | "fuse";

/** 警戒半径：进入后追击 */
const AGGRO_RANGE = 260;
const CHASE_SPEED = 150;
/** 引信触发距离与引信时长（触发后仍继续逼近，爆炸时必在半径内） */
const FUSE_RANGE = 80;
const FUSE_MS = 700;
/** 自爆伤害半径 */
const BOOM_RADIUS = 95;

/** 爆刺栗：荆棘栗苞追击玩家，贴近后尖刺竖起闪烁 700ms 自爆（范围伤害）；
 * 引信期间可被击杀拆除（走普通死亡，不引爆） */
export class Thornbur extends Enemy {
  private readonly baseX: number;
  private readonly boomDamage: number;
  private mode: ThornburState = "guard";
  private fuseUntil = 0;

  constructor(scene: Phaser.Scene, def: ThornburDef) {
    super(scene, def.x, def.y, "thornbur0", def.hp, def.touchDamage);
    this.baseX = def.x;
    this.boomDamage = def.boomDamage;
    this.play(ENEMY_ANIMS.thornburWobble);
  }

  tick(player: Player, time: number, delta: number): void {
    if (this.mode === "guard") {
      // 原地小幅踱步警戒
      this.x = this.baseX + Math.sin(time / 320) * 6;
      this.setFlipX(player.x < this.x);
      if (Math.abs(player.x - this.x) < AGGRO_RANGE) this.mode = "chase";
      return;
    }

    if (this.mode === "chase") {
      const dx = player.x - this.x;
      this.x += Math.sign(dx) * CHASE_SPEED * (delta / 1000);
      this.setFlipX(dx < 0);
      if (Math.abs(player.x - this.x) < FUSE_RANGE) {
        this.mode = "fuse";
        this.fuseUntil = time + FUSE_MS;
      }
      return;
    }

    // 引信：荧光绿急促闪烁 + 继续逼近（爆刺栗不会停），到时自爆
    const dx = player.x - this.x;
    this.x += Math.sign(dx) * CHASE_SPEED * (delta / 1000);
    this.setFlipX(dx < 0);
    this.setTint(Math.floor(time / 80) % 2 === 0 ? 0xbaff70 : 0xffffff);
    if (time >= this.fuseUntil) this.explode(player);
  }

  /** 自爆：尖刺四射 + 荧光冲击环，范围判定玩家（无敌帧语义照常），自身就地销毁（不掉血包） */
  private explode(player: Player): void {
    this.dead = true;
    this.clearTint();
    const scene = this.scene;
    explosion(scene, this.x, this.y - 8, {
      tints: [0x7ac74f, 0x4f7a3a, 0xd4ff7a],
      count: 10,
      speed: [70, 210],
      life: [300, 560],
    });
    // 荆棘针刺：八向短刺直线射出（纯视觉层，伤害走上面的范围判定）
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const thorn = scene.add
        .image(this.x, this.y - 8, "thorn-spike")
        .setScale(0.22)
        .setRotation(a + Math.PI / 2)
        .setDepth(5);
      scene.tweens.add({
        targets: thorn,
        x: thorn.x + Math.cos(a) * (BOOM_RADIUS + 26),
        y: thorn.y + Math.sin(a) * (BOOM_RADIUS + 26),
        alpha: 0,
        duration: 300,
        ease: "Cubic.Out",
        onComplete: () => thorn.destroy(),
      });
    }
    shockRing(scene, this.x, this.y - 8, {
      color: 0x9fe86a,
      from: 12,
      to: BOOM_RADIUS + 20,
      lineWidth: 4,
      duration: 260,
    });
    burst(scene, this.x, this.y - 8, {
      color: 0x4f7a3a,
      count: 5,
      size: 4,
      grow: 12,
      duration: 260,
      spreadX: 8,
      spreadY: 6,
    });
    Sfx.boom();
    scene.cameras.main.shake(120, 0.006);
    if (Phaser.Math.Distance.Between(player.x, player.y - 16, this.x, this.y - 8) < BOOM_RADIUS) {
      player.damage(this.boomDamage, this.x);
    }
    this.destroy();
  }
}
