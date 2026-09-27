import Phaser from "phaser";
import { LAVA_GIANT_PHASES, type BossDef } from "../data/boss";
import { Sfx } from "../systems/Sfx";
import { burst, flashTint, floatText, shockRing } from "../systems/Fx";
import { dustLand, explosion } from "../systems/Particles";
import { DEPTH } from "../types";
import { BossBase } from "./BossBase";
import { Projectile } from "./Projectile";
import type { Player } from "./Player";

/** 重拳砸地后的过热虚弱时长（胸口熔核暴露，×2 惩罚窗口） */
const STUN_MS = 1100;
/** 巨躯横向活动边距：同机体冲撞钳制原则，贴墙玩家留脱身空间 */
const WALK_MARGIN = 130;

/**
 * 第二关 Boss 熔岩巨人「炉心」：远古岩浆守卫，与马克机体系不同源。
 * 缓慢逼近 + 大开大合的熔岩系招式（重拳/抛射/震地/喷发/吐息/熔火之雨）；
 * 重拳砸地后躯干过热虚弱 1.1s——胸口熔核暴露，命中 ×2。
 * 公共框架（出场/阶段机/选招/死亡/掉核心）在 BossBase。
 */
export class LavaGiant extends BossBase<LavaGiant> {
  private readonly embers: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef) {
    super(scene, x, y, def, LAVA_GIANT_PHASES);
    // 周身余烬：熔岩巨躯持续飘散火星（跟随本体，视觉层）
    this.embers = scene.add
      .particles(0, 0, "px", {
        follow: this,
        speedY: { min: -70, max: -30 },
        speedX: { min: -14, max: 14 },
        lifespan: { min: 600, max: 1100 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: [0xff6b2e, 0xff9f1a, 0xffd23e],
        frequency: 240,
        quantity: 1,
      })
      .setDepth(DEPTH.fx);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.embers.destroy());
  }

  protected get coreSpec() {
    return { offsetX: 18, offsetY: 4, hitWindow: 40, label: "熔核!" };
  }

  protected get halfHeight(): number {
    return 60;
  }

  protected get p3Tint(): number {
    return 0xffb08a;
  }

  protected get deathBurstColor(): number {
    return 0xff6b2e;
  }

  protected doTickActive(player: Player, time: number, delta: number): void {
    // 缓慢逼近：巨躯一步一步压过来（P3 更快），钳制房间边界给角落玩家留空间
    const dx = player.x - this.x;
    const speed = this.machine.phaseIndex === 2 ? 60 : 42;
    if (Math.abs(dx) > 280 && time >= this.nextPickAt) {
      const minX = this.def.room.x0 + WALK_MARGIN;
      const maxX = this.def.room.x1 - WALK_MARGIN;
      this.x = Phaser.Math.Clamp(this.x + Math.sign(dx) * speed * (delta / 1000), minX, maxX);
    }
    if (time >= this.nextPickAt) this.pickMove(player, time);
  }

  /** 死亡额外演出：岩浆核心爆裂 */
  protected deathExtraFx(): void {
    explosion(this.scene, this.x, this.y, {
      tints: [0xff6b2e, 0xffd23e, 0xffffff],
      count: 22,
      speed: [80, 240],
      life: [500, 900],
      gravityY: 500,
    });
  }

  // ---------- 招式实现（LAVA_GIANT_PHASES 调度，返回占用时长） ----------

  /** 熔岩重拳：蓄力砸地（前方矩形 24 伤）→ 躯干过热虚弱，胸口熔核暴露（×2 惩罚窗口） */
  slam(player: Player): number {
    void player;
    const dir = this.facingDir();
    flashTint(this, 0xff6b5e, 240);
    this.scene.tweens.add({
      targets: this,
      y: this.def.y - 12,
      duration: 170,
      yoyo: true,
      ease: "Quad.In",
    });
    this.scene.time.delayedCall(330, () => {
      if (!this.guard()) return;
      const scene = this.scene;
      const groundY = this.def.y + this.halfHeight;
      const fistX = this.x + dir * 84;
      const rect = new Phaser.Geom.Rectangle(
        dir > 0 ? this.x + 16 : this.x - 156,
        this.def.y - 70,
        140,
        124,
      );
      if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
        this.playerRef.damage(24, this.x);
      }
      scene.cameras.main.shake(200, 0.011);
      shockRing(scene, fistX, groundY - 10, {
        color: 0xff9f1a,
        from: 12,
        to: 96,
        lineWidth: 5,
        duration: 320,
      });
      dustLand(scene, fistX, groundY);
      explosion(scene, fistX, groundY - 12, {
        tints: [0xff6b2e, 0xff9f1a, 0x9a8a72],
        count: 12,
        speed: [60, 190],
        life: [300, 560],
      });
      Sfx.land();
      if (this.mode === "active") {
        // 过热虚弱：熔核暴露，惩罚窗口
        this.mode = "stunned";
        this.coreExposed = true;
        this.stunUntil = scene.time.now + STUN_MS;
        floatText(scene, this.coreX(), this.y - 78, "过热!", { color: "#ffd23e", size: 14 });
      }
    });
    return 1500;
  }

  /** 熔岩抛射：抛出大团岩浆（重力弧线飞向玩家），落点迸溅 */
  lob(player: Player): number {
    const vy = -560;
    // 出手高度到落地 ≈0.75s，按水平距离解算初速（钳制避免全屏狙击）
    const vx = Phaser.Math.Clamp((player.x - this.x) / 0.75, -460, 460);
    const bomb = new Projectile(
      this.scene,
      this.x + this.facingDir() * 44,
      this.y - 34,
      "lava-bomb",
      vx,
      vy,
      { damage: 16, fromPlayer: false, gravityY: 900, ttlMs: 760 },
    );
    const scene = this.scene;
    bomb.once(Phaser.GameObjects.Events.DESTROY, () => {
      // 落点迸溅
      explosion(scene, bomb.x, bomb.y, {
        tints: [0xff6b2e, 0xff9f1a, 0xffd23e],
        count: 10,
        speed: [50, 150],
        life: [280, 520],
        gravityY: 500,
      });
      shockRing(scene, bomb.x, bomb.y, {
        color: 0xff9f1a,
        from: 8,
        to: 60,
        lineWidth: 3,
        duration: 260,
      });
    });
    burst(this.scene, this.x + this.facingDir() * 44, this.y - 34, {
      color: 0xff9f1a,
      count: 3,
      size: 4,
      grow: 10,
      duration: 180,
      spreadX: 4,
      spreadY: 4,
    });
    return 800;
  }

  /** 震地踏：跃起踏地，左右放出岩屑尖浪（跳起可躲） */
  stomp(): number {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 30,
      duration: 160,
      yoyo: true,
      ease: "Quad.InOut",
    });
    this.scene.time.delayedCall(320, () => {
      if (!this.guard()) return;
      const scene = this.scene;
      const groundY = this.def.y + this.halfHeight;
      scene.cameras.main.shake(190, 0.01);
      shockRing(scene, this.x, groundY, {
        color: 0xff9f1a,
        from: 14,
        to: 110,
        lineWidth: 5,
        duration: 320,
      });
      dustLand(scene, this.x, groundY);
      Sfx.land();
      for (const dir of [-1, 1]) {
        const wave = new Projectile(
          scene,
          this.x + dir * 64,
          groundY - 8,
          "shock-wave",
          dir * 380,
          0,
          {
            damage: 14,
            fromPlayer: false,
            ttlMs: 2100,
          },
        );
        // 尖浪始终底边贴地、仅水平镜像（弹体默认速度向旋转会倒置）
        wave.setRotation(0);
      }
    });
    return 950;
  }

  /** 火山喷发：地面警示圈 → 岩浆柱依次喷出（P3 四柱），柱内受伤，跳出柱位可躲 */
  eruption(player: Player): number {
    const scene = this.scene;
    const groundY = this.def.y + this.halfHeight;
    const n = this.machine.phaseIndex === 2 ? 4 : 3;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const off = i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * (70 + Math.random() * 120);
      xs.push(Phaser.Math.Clamp(player.x + off, this.def.room.x0 + 40, this.def.room.x1 - 40));
    }
    xs.forEach((x, i) => {
      const warn = scene.add.circle(x, groundY - 4, 24).setStrokeStyle(3, 0xffd23e, 0.75);
      scene.tweens.add({ targets: warn, alpha: 0.25, duration: 130, yoyo: true, repeat: 3 });
      scene.time.delayedCall(700 + i * 190, () => {
        warn.destroy();
        if (!this.guard()) return;
        const col = scene.add.image(x, groundY, "lava-geyser").setOrigin(0.5, 1).setDepth(DEPTH.fx);
        scene.tweens.add({
          targets: col,
          scaleY: { from: 0.2, to: 1.15 },
          duration: 110,
          ease: "Back.Out",
        });
        scene.tweens.add({
          targets: col,
          alpha: 0,
          delay: 300,
          duration: 260,
          onComplete: () => col.destroy(),
        });
        explosion(scene, x, groundY - 20, {
          tints: [0xff6b2e, 0xffd23e],
          count: 8,
          speed: [40, 130],
          angle: [250, 290],
          life: [280, 520],
          gravityY: 220,
        });
        scene.cameras.main.shake(90, 0.004);
        const rect = new Phaser.Geom.Rectangle(x - 17, groundY - 140, 34, 140);
        if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
          this.playerRef.damage(16, x);
        }
      });
    });
    return 1400 + n * 190;
  }

  /** 熔岩吐息：吸气蓄力后连续 5 波灼热火球（走位/腾空可躲） */
  breath(player: Player): number {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.06,
      scaleY: 0.94,
      duration: 200,
      yoyo: true,
    });
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(380 + i * 190, () => {
        if (!this.guard() || !player.active) return;
        const dx = player.x - this.x;
        const dy = player.y - 16 - (this.y - 26);
        const a = Math.atan2(dy, dx) + Phaser.Math.FloatBetween(-0.07, 0.07);
        new Projectile(
          this.scene,
          this.x + Math.cos(a) * 58,
          this.y - 26 + Math.sin(a) * 40,
          "fireball",
          Math.cos(a) * 340,
          Math.sin(a) * 200,
          { damage: 8, fromPlayer: false, ttlMs: 1400 },
        );
        burst(this.scene, this.x + this.facingDir() * 52, this.y - 26, {
          color: 0xff6b2e,
          count: 2,
          size: 4,
          grow: 10,
          duration: 160,
          spreadX: 6,
          spreadY: 6,
        });
      });
    }
    return 1500;
  }

  /** 熔火之雨：天降 7 枚熔岩陨石，落点警示圈先行（P3 终局技） */
  rain(player: Player): number {
    const scene = this.scene;
    const groundY = this.def.y + this.halfHeight;
    for (let i = 0; i < 7; i++) {
      const x = Phaser.Math.Clamp(
        player.x + Phaser.Math.Between(-260, 260),
        this.def.room.x0 + 40,
        this.def.room.x1 - 40,
      );
      const warn = scene.add.circle(x, groundY - 4, 22).setStrokeStyle(3, 0xff5544, 0.7);
      scene.tweens.add({ targets: warn, alpha: 0.2, duration: 120, yoyo: true, repeat: 3 });
      scene.time.delayedCall(560 + i * 240, () => {
        warn.destroy();
        if (!this.guard()) return;
        const bomb = new Projectile(scene, x, -30, "lava-bomb", 0, 250, {
          damage: 14,
          fromPlayer: false,
          gravityY: 900,
          ttlMs: 640,
        });
        bomb.once(Phaser.GameObjects.Events.DESTROY, () => {
          explosion(scene, x, groundY - 10, {
            tints: [0xff6b2e, 0xff9f1a, 0xffd23e],
            count: 9,
            speed: [40, 140],
            life: [280, 500],
            gravityY: 420,
          });
          shockRing(scene, x, groundY - 8, {
            color: 0xff9f1a,
            from: 8,
            to: 66,
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
