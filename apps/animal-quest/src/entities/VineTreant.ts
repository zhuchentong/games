import Phaser from "phaser";
import { VINE_TREANT_PHASES, type BossDef } from "../data/boss";
import { Sfx } from "../systems/Sfx";
import { burst, floatText, flashTint, shockRing } from "../systems/Fx";
import { dustLand, explosion } from "../systems/Particles";
import { DEPTH } from "../types";
import { BossBase } from "./BossBase";
import { Projectile } from "./Projectile";
import type { Player } from "./Player";

/** 根刺突袭后树皮开裂时长（胸口树心暴露，×2 惩罚窗口） */
const STUN_MS = 1200;
/** 巨躯横向活动边距：同机体冲撞钳制原则，贴墙玩家留脱身空间 */
const WALK_MARGIN = 130;

/**
 * 最终 Boss 古藤树怪「棘心」：黑暗森林的意志本体，与机体系/巨人皆不同源。
 * 缓慢逼近 + 大开大合的荆棘系招式（藤鞭/种子迫击/根刺突袭/孢子吐息/藤蔓缠绕/荆棘之雨）；
 * 根刺突袭扎根过深后树皮开裂 1.2s——胸口树心暴露，命中 ×2。
 * 公共框架（出场/阶段机/选招/死亡/掉核心）在 BossBase。
 */
export class VineTreant extends BossBase<VineTreant> {
  /** 周身荧光孢子：古树呼吸间飘散的森林尘埃（跟随本体，视觉层） */
  private readonly spores: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef) {
    super(scene, x, y, def, VINE_TREANT_PHASES);
    this.spores = scene.add
      .particles(0, 0, "pt-glow", {
        follow: this,
        speedY: { min: -46, max: -16 },
        speedX: { min: -12, max: 12 },
        lifespan: { min: 800, max: 1400 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.55, end: 0 },
        tint: [0x9fe86a, 0xd4ff7a, 0xc9f0ff],
        frequency: 210,
        quantity: 1,
      })
      .setDepth(DEPTH.fx);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.spores.destroy());
  }

  protected get coreSpec() {
    return { offsetX: 14, offsetY: 4, hitWindow: 40, label: "树心!" };
  }

  protected get coreTexture(): string {
    return "tree-heart";
  }

  protected get halfHeight(): number {
    return 60;
  }

  protected get p3Tint(): number {
    return 0xffc9a0;
  }

  protected get deathBurstColor(): number {
    return 0x8fe06a;
  }

  protected doTickActive(player: Player, time: number, delta: number): void {
    // 缓慢逼近：古树拖着根须一步一步压过来（P3 更快），钳制房间边界给角落玩家留空间
    const dx = player.x - this.x;
    const speed = this.machine.phaseIndex === 2 ? 54 : 38;
    if (Math.abs(dx) > 280 && time >= this.nextPickAt) {
      const minX = this.def.room.x0 + WALK_MARGIN;
      const maxX = this.def.room.x1 - WALK_MARGIN;
      this.x = Phaser.Math.Clamp(this.x + Math.sign(dx) * speed * (delta / 1000), minX, maxX);
    }
    if (time >= this.nextPickAt) this.pickMove(player, time);
  }

  /** 死亡额外演出：树心碎裂 + 荧光叶片四散 */
  protected deathExtraFx(): void {
    explosion(this.scene, this.x, this.y, {
      tints: [0x8fe06a, 0xd4ff7a, 0xffffff],
      count: 22,
      speed: [80, 240],
      life: [500, 900],
      gravityY: 500,
    });
    explosion(this.scene, this.x, this.y - 20, {
      tints: [0x7ac74f, 0x4f7a3a],
      count: 10,
      speed: [60, 160],
      angle: [200, 340],
      life: [700, 1100],
      gravityY: 180,
      alpha: 0.8,
    });
  }

  // ---------- 招式实现（VINE_TREANT_PHASES 调度，返回占用时长） ----------

  /** 藤鞭横扫：枝干蓄力后绿色鞭弧向前扫过（前方矩形 20 伤） */
  whip(player: Player): number {
    void player;
    const dir = this.facingDir();
    flashTint(this, 0x9fe86a, 200);
    this.scene.tweens.add({ targets: this, scaleX: 1.08, duration: 160, yoyo: true });
    this.scene.time.delayedCall(280, () => {
      if (!this.guard()) return;
      const scene = this.scene;
      // 藤鞭弧光：挥砍月牙染色绿色自上向前扫过
      const arc = scene.add
        .image(this.x + dir * 58, this.y - 26, "fx-slash")
        .setOrigin(0.5)
        .setFlipX(dir < 0)
        .setTint(0x7ac74f)
        .setRotation(-1.05 * dir)
        .setScale(0.9)
        .setAlpha(0.95)
        .setDepth(DEPTH.fx);
      scene.tweens.add({
        targets: arc,
        rotation: 0.5 * dir,
        scale: 1.5,
        duration: 220,
        ease: "Cubic.Out",
      });
      scene.tweens.add({
        targets: arc,
        alpha: 0,
        delay: 90,
        duration: 160,
        onComplete: () => arc.destroy(),
      });
      const rect = new Phaser.Geom.Rectangle(
        dir > 0 ? this.x + 14 : this.x - 150,
        this.y - 70,
        136,
        104,
      );
      if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
        this.playerRef.damage(20, this.x);
      }
      explosion(scene, this.x + dir * 76, this.y - 30, {
        tints: [0x7ac74f, 0x9fe86a, 0xd4ff7a],
        count: 9,
        speed: [70, 190],
        life: [260, 480],
      });
      Sfx.attack();
    });
    return 1000;
  }

  /** 种子迫击：连续抛出 2 枚带刺种子（重力弧线飞向玩家），落点迸出荆棘 */
  mortar(player: Player): number {
    const scene = this.scene;
    for (let i = 0; i < 2; i++) {
      scene.time.delayedCall(i * 240, () => {
        if (!this.guard() || !player.active) return;
        const vy = -540;
        const vx = Phaser.Math.Clamp((player.x - this.x) / 0.72, -430, 430);
        const seed = new Projectile(
          scene,
          this.x + this.facingDir() * 40,
          this.y - 44,
          "seed-bomb",
          vx,
          vy,
          { damage: 12, fromPlayer: false, gravityY: 900, ttlMs: 760 },
        );
        seed.once(Phaser.GameObjects.Events.DESTROY, () => {
          explosion(scene, seed.x, seed.y, {
            tints: [0x7ac74f, 0x4f7a3a, 0xd4ff7a],
            count: 9,
            speed: [50, 150],
            life: [280, 520],
            gravityY: 500,
          });
          shockRing(scene, seed.x, seed.y, {
            color: 0x9fe86a,
            from: 8,
            to: 56,
            lineWidth: 3,
            duration: 260,
          });
        });
        burst(scene, this.x + this.facingDir() * 40, this.y - 44, {
          color: 0x9fe86a,
          count: 3,
          size: 4,
          grow: 10,
          duration: 180,
          spreadX: 4,
          spreadY: 4,
        });
      });
    }
    return 1100;
  }

  /** 根刺突袭：扎根震地 → 脚下三根根刺依次拱出（警示圈先行，柱内 16 伤）→ 树皮开裂，树心暴露惩罚窗口 */
  roots(player: Player): number {
    void player;
    const scene = this.scene;
    flashTint(this, 0x9fe86a, 240);
    scene.tweens.add({
      targets: this,
      y: this.def.y - 12,
      duration: 170,
      yoyo: true,
      ease: "Quad.In",
    });
    scene.time.delayedCall(330, () => {
      if (!this.guard()) return;
      const sc = this.scene;
      const groundY = this.def.y + this.halfHeight;
      sc.cameras.main.shake(220, 0.011);
      shockRing(sc, this.x, groundY - 8, {
        color: 0x7ac74f,
        from: 14,
        to: 110,
        lineWidth: 5,
        duration: 320,
      });
      dustLand(sc, this.x, groundY);
      Sfx.land();
      // 脚下三根根刺依次拱出（警示圈先行，跳出柱位可躲）
      const spots = [-92, 0, 98].map((off) =>
        Phaser.Math.Clamp(this.x + off, this.def.room.x0 + 40, this.def.room.x1 - 40),
      );
      spots.forEach((x, i) => {
        const warn = sc.add.circle(x, groundY - 4, 24).setStrokeStyle(3, 0x9fe86a, 0.75);
        sc.tweens.add({ targets: warn, alpha: 0.25, duration: 130, yoyo: true, repeat: 3 });
        sc.time.delayedCall(620 + i * 200, () => {
          warn.destroy();
          if (!this.guard()) return;
          const spike = sc.add
            .image(x, groundY, "thorn-spike")
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.fx);
          sc.tweens.add({
            targets: spike,
            scaleY: { from: 0.15, to: 1.12 },
            duration: 110,
            ease: "Back.Out",
          });
          sc.tweens.add({
            targets: spike,
            alpha: 0,
            delay: 320,
            duration: 260,
            onComplete: () => spike.destroy(),
          });
          explosion(sc, x, groundY - 20, {
            tints: [0x7ac74f, 0x4f7a3a, 0xd4ff7a],
            count: 7,
            speed: [40, 130],
            angle: [250, 290],
            life: [280, 500],
            gravityY: 220,
          });
          sc.cameras.main.shake(90, 0.004);
          const rect = new Phaser.Geom.Rectangle(x - 15, groundY - 140, 30, 140);
          if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
            this.playerRef.damage(16, x);
          }
        });
      });
    });
    // 树皮开裂：树心暴露，惩罚窗口
    scene.time.delayedCall(1500, () => {
      if (!this.guard() || this.mode !== "active") return;
      const sc = this.scene;
      this.mode = "stunned";
      this.coreExposed = true;
      this.stunUntil = sc.time.now + STUN_MS;
      floatText(sc, this.coreX(), this.y - 78, "树皮开裂!", { color: "#9fe86a", size: 14 });
      burst(sc, this.coreX(), this.y + this.coreSpec.offsetY, {
        color: 0xd4ff7a,
        count: 6,
        size: 4,
        grow: 16,
        duration: 320,
        spreadX: 8,
        spreadY: 8,
      });
    });
    return 2300;
  }

  /** 孢子吐息：吸气蓄力后连续 5 波毒孢子扇形喷吐（走位/腾空可躲） */
  breath(player: Player): number {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.07,
      scaleY: 0.94,
      duration: 200,
      yoyo: true,
    });
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(360 + i * 200, () => {
        if (!this.guard() || !player.active) return;
        const dx = player.x - this.x;
        const dy = player.y - 16 - (this.y - 26);
        const a = Math.atan2(dy, dx) + Phaser.Math.FloatBetween(-0.16, 0.16);
        new Projectile(
          this.scene,
          this.x + Math.cos(a) * 56,
          this.y - 26 + Math.sin(a) * 40,
          "poison",
          Math.cos(a) * 300,
          Math.sin(a) * 170,
          { damage: 7, fromPlayer: false, ttlMs: 1700 },
        );
        burst(this.scene, this.x + this.facingDir() * 50, this.y - 26, {
          color: 0x7ac74f,
          count: 2,
          size: 4,
          grow: 10,
          duration: 160,
          spreadX: 6,
          spreadY: 6,
        });
      });
    }
    return 1550;
  }

  /** 藤蔓缠绕：玩家脚下警示圈 → 藤蔓破土抓击（16 伤 + 向树怪方向缠拖），连续 3 次追踪玩家位置 */
  entangle(player: Player): number {
    const scene = this.scene;
    const groundY = this.def.y + this.halfHeight;
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 640, () => {
        if (!this.guard() || !player.active) return;
        const tx = Phaser.Math.Clamp(player.x, this.def.room.x0 + 30, this.def.room.x1 - 30);
        const warn = scene.add.circle(tx, groundY - 4, 26).setStrokeStyle(3, 0x9fe86a, 0.75);
        scene.tweens.add({ targets: warn, alpha: 0.25, duration: 120, yoyo: true, repeat: 3 });
        scene.time.delayedCall(520, () => {
          warn.destroy();
          if (!this.guard()) return;
          // 藤蔓破土：缩小的根刺 + 荧光碎屑
          const vine = scene.add
            .image(tx, groundY, "thorn-spike")
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.fx)
            .setScale(0.55, 0.7);
          scene.tweens.add({
            targets: vine,
            alpha: 0,
            delay: 260,
            duration: 240,
            onComplete: () => vine.destroy(),
          });
          explosion(scene, tx, groundY - 16, {
            tints: [0x7ac74f, 0x4f7a3a, 0xd4ff7a],
            count: 7,
            speed: [50, 150],
            angle: [250, 290],
            life: [260, 460],
            gravityY: 260,
          });
          scene.cameras.main.shake(80, 0.004);
          const rect = new Phaser.Geom.Rectangle(tx - 22, groundY - 110, 44, 110);
          if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
            this.playerRef.damage(16, tx);
            // 缠拖：朝树怪方向拽半步（逃脱靠走位预判警示圈）
            const body = this.playerRef.body as Phaser.Physics.Arcade.Body | null;
            body?.setVelocityX(Math.sign(this.x - this.playerRef.x) * 46);
          }
        });
      });
    }
    return 2800;
  }

  /** 荆棘之雨：天降 7 枚带刺种子，落点警示圈先行（P3 终局技） */
  rain(player: Player): number {
    const scene = this.scene;
    const groundY = this.def.y + this.halfHeight;
    for (let i = 0; i < 7; i++) {
      const x = Phaser.Math.Clamp(
        player.x + Phaser.Math.Between(-270, 270),
        this.def.room.x0 + 40,
        this.def.room.x1 - 40,
      );
      const warn = scene.add.circle(x, groundY - 4, 22).setStrokeStyle(3, 0x7ac74f, 0.7);
      scene.tweens.add({ targets: warn, alpha: 0.2, duration: 120, yoyo: true, repeat: 3 });
      scene.time.delayedCall(560 + i * 230, () => {
        warn.destroy();
        if (!this.guard()) return;
        const bomb = new Projectile(scene, x, -30, "seed-bomb", 0, 240, {
          damage: 13,
          fromPlayer: false,
          gravityY: 900,
          ttlMs: 660,
        });
        bomb.once(Phaser.GameObjects.Events.DESTROY, () => {
          explosion(scene, x, groundY - 10, {
            tints: [0x7ac74f, 0x4f7a3a, 0xd4ff7a],
            count: 9,
            speed: [40, 140],
            life: [280, 500],
            gravityY: 420,
          });
          shockRing(scene, x, groundY - 8, {
            color: 0x9fe86a,
            from: 8,
            to: 62,
            lineWidth: 3,
            duration: 260,
          });
          scene.cameras.main.shake(60, 0.003);
        });
      });
    }
    return 2600;
  }
}
