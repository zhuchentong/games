import Phaser from "phaser";
import { BOSS, type BossDef } from "../data/boss";
import { CombatSystem } from "../systems/CombatSystem";
import { Sfx } from "../systems/Sfx";
import { afterimage, burst, flashTint, shockRing } from "../systems/Fx";
import { DEPTH } from "../types";
import { BossBase } from "./BossBase";
import { Enemy } from "./Enemy";
import { GearBug } from "./GearBug";
import { Projectile } from "./Projectile";
import { ScoutDrone } from "./ScoutDrone";
import type { Player } from "./Player";

const DASH_TELEGRAPH_MS = 380;
const DASH_SPEED = 620;
const DASH_MS = 650;
const DASH_DAMAGE = 22;
const STUN_MS = 1300;
/** 场上小怪上限（含召唤物），防召唤堆积过载 */
const MINION_CAP = 4;

/**
 * 马克系列机体 Boss：配置驱动的招式行为库 + 状态流转在 BossBase，
 * 机体差异（血量/招式间隔/文案/纹理）由 BossDef 配置。
 * 背部核心弱点：露背（冲撞落空硬直）或 P3 期间命中核心位置伤害 ×2。
 */
export class BossMK1 extends BossBase<BossMK1> {
  private dashing = false;
  private dashUntil = 0;
  private dashVX = 0;
  private dashHitPlayer = false;
  /** 冲刺残影间隔计时 */
  private dashTrailAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef = BOSS) {
    super(scene, x, y, def, def.phases ?? []);
  }

  protected get coreSpec() {
    return { offsetX: 62, offsetY: 6, hitWindow: 36, label: "弱点!" };
  }

  protected get halfHeight(): number {
    return 56;
  }

  protected get p3Tint(): number {
    return 0xff9d9d;
  }

  protected get deathBurstColor(): number {
    return 0xff9f1a;
  }

  protected doTickActive(player: Player, time: number, delta: number): void {
    if (this.dashing) {
      // 冲刺残影：高速位移的红色幽灵像
      if (time - this.dashTrailAt >= 45) {
        this.dashTrailAt = time;
        afterimage(this.scene, this, { tint: 0xff6b5e, alpha: 0.35, duration: 180 });
      }
      const minX = this.def.room.x0 + 130;
      const maxX = this.def.room.x1 - 130;
      const nx = Phaser.Math.Clamp(this.x + this.dashVX * delta * 0.001, minX, maxX);
      const hitWall = nx === minX || nx === maxX;
      this.x = nx;
      if (!this.dashHitPlayer && Phaser.Geom.Rectangle.Overlaps(this.bounds(), player.bounds())) {
        this.dashHitPlayer = true;
        player.damage(DASH_DAMAGE, this.x);
      }
      if (time >= this.dashUntil || hitWall) this.endDash(time, hitWall);
      return;
    }
    if (time >= this.nextPickAt) this.pickMove(player, time);
  }

  // ---------- 招式实现（由 data/boss.ts 招式表调度，返回占用时长） ----------

  /** 横扫：面前大范围爪击（红色预警弧影闪烁 → 橙红双层月牙扫斩；判定矩形与时序不变） */
  sweep(): number {
    const dir = this.facingDir();
    const warn = this.scene.add
      .image(this.x + dir * 105, this.y + 12, "fx-slash")
      .setOrigin(0.5)
      .setFlipX(dir < 0)
      .setTint(0xff3b30)
      .setRotation(-0.5 * dir)
      .setScale(2.2)
      .setAlpha(0.22)
      .setDepth(DEPTH.fx);
    this.scene.tweens.add({ targets: warn, alpha: 0.42, duration: 90, yoyo: true, repeat: 1 });
    this.scene.time.delayedCall(180, () => {
      warn.destroy();
      if (!this.guard()) return;
      const slash = (tint: number, s: number, delay: number): void => {
        const arc = this.scene.add
          .image(this.x + dir * 105, this.y + 12, "fx-slash")
          .setOrigin(0.5)
          .setFlipX(dir < 0)
          .setTint(tint)
          .setRotation(-0.9 * dir)
          .setScale(0.8 * s)
          .setAlpha(0.95)
          .setDepth(DEPTH.fx);
        this.scene.tweens.add({
          targets: arc,
          rotation: 0.55 * dir,
          scale: 2.3 * s,
          delay,
          duration: 200,
          ease: "Cubic.Out",
        });
        this.scene.tweens.add({
          targets: arc,
          alpha: 0,
          delay: delay + 90,
          duration: 160,
          onComplete: () => arc.destroy(),
        });
      };
      slash(0xff8a5e, 1, 0);
      slash(0xff3b30, 0.7, 50);
      const rect = new Phaser.Geom.Rectangle(
        dir > 0 ? this.x + 30 : this.x - 190,
        this.y - 66,
        160,
        130,
      );
      if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
        this.playerRef.damage(22, this.x);
      }
    });
    return 520;
  }

  /** 冲撞：前摇后向玩家方向突进（地面冲行预警条 + 红色残影）；落空则硬直露背 */
  dash(player: Player): number {
    const dir = player.x >= this.x ? 1 : -1;
    this.scene.tweens.add({ targets: this, y: this.y + 10, duration: 170, yoyo: true });
    flashTint(this, 0xff6b5e, DASH_TELEGRAPH_MS - 40);
    // 地面预警条：冲行路径红光急闪，出脚即消
    const warn = this.scene.add
      .rectangle(this.x + dir * 150, this.def.y + 41, 300, 8, 0xff3b30, 0.22)
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
    this.scene.tweens.add({ targets: warn, alpha: 0.45, duration: 95, yoyo: true, repeat: 3 });
    this.scene.time.delayedCall(DASH_TELEGRAPH_MS, () => {
      warn.destroy();
      if (!this.guard()) return;
      this.dashing = true;
      this.dashHitPlayer = false;
      this.dashVX = dir * DASH_SPEED;
      this.dashUntil = this.scene.time.now + DASH_MS;
    });
    return DASH_TELEGRAPH_MS + DASH_MS + 100;
  }

  /** 齿轮弹：三连扇形小散射（炮口闪光 + 齿轮自旋） */
  gearShot(player: Player): number {
    this.muzzleFlash();
    for (const off of [-0.16, 0, 0.16]) this.spin(this.fireAimed(player, off, 300, "gear-shot", 9));
    return 550;
  }

  /** 召唤：两架侦察机（场上小怪 ≥4 时跳过，防过载） */
  summonDrones(): number {
    if (this.aliveMinions() >= MINION_CAP) return 500;
    for (const sx of [-110, 110]) {
      this.spawnMinion(
        new ScoutDrone(this.scene, {
          x: this.x + sx,
          y: this.y - 140,
          hp: 24,
          touchDamage: 10,
        }),
      );
    }
    return 600;
  }

  /** 召唤（P3）：两只齿轮虫落地夹击，同样受小怪上限约束 */
  summonSwarm(): number {
    if (this.aliveMinions() >= MINION_CAP) return 500;
    for (const sx of [-120, 120]) {
      this.spawnMinion(
        new GearBug(this.scene, {
          x1: this.x + sx - 70,
          x2: this.x + sx + 70,
          y: 489,
          hp: 30,
          touchDamage: 12,
          speed: 100,
        }),
      );
    }
    return 600;
  }

  /** 激光：红线预警 + 炮口蓄能 → 外晕/主体/白芯三层光束（跳起可躲） */
  laser(player: Player): number {
    const dir = this.facingDir();
    const yL = player.y - 14;
    Sfx.laserCharge();
    const x0 = dir > 0 ? this.x + 40 : this.def.room.x0 + 10;
    const x1 = dir > 0 ? this.def.room.x1 - 10 : this.x - 40;
    const w = Math.abs(x1 - x0);
    const cx = Math.min(x0, x1) + w / 2;
    const tele = this.scene.add.rectangle(cx, yL, w, 6, 0xff3b30, 0.35);
    this.scene.tweens.add({
      targets: tele,
      alpha: 0.65,
      duration: 140,
      yoyo: true,
      repeat: 4,
    });
    // 炮口蓄能光点：臂部高频缩放脉冲
    const muzzle = this.scene.add
      .circle(this.x + dir * 44, this.y - 10, 5, 0xffd23e, 0.9)
      .setDepth(DEPTH.fx);
    this.scene.tweens.add({ targets: muzzle, scale: 0.4, duration: 90, yoyo: true, repeat: 6 });
    this.scene.time.delayedCall(700, () => {
      muzzle.destroy();
      tele.destroy();
      if (!this.guard()) return;
      const beamOuter = this.scene.add.rectangle(cx, yL, w, 26, 0xff5544, 0.3);
      const beam = this.scene.add.rectangle(cx, yL, w, 16, 0xff5544, 0.95);
      const core = this.scene.add.rectangle(cx, yL, w, 5, 0xffffff, 0.9);
      this.scene.tweens.add({
        targets: beamOuter,
        alpha: { from: 0.45, to: 0.15 },
        duration: 60,
        yoyo: true,
        repeat: 1,
      });
      this.scene.cameras.main.shake(110, 0.004);
      for (const ex of [Math.min(x0, x1) + 6, Math.max(x0, x1) - 6]) {
        burst(this.scene, ex, yL, {
          color: 0xffd23e,
          count: 3,
          size: 3,
          grow: 10,
          duration: 220,
          spreadX: 2,
          spreadY: 8,
        });
      }
      this.scene.tweens.add({
        targets: [beamOuter, beam, core],
        alpha: 0,
        delay: 240,
        duration: 320,
        onComplete: () => {
          beamOuter.destroy();
          beam.destroy();
          core.destroy();
        },
      });
      const rect = new Phaser.Geom.Rectangle(Math.min(x0, x1), yL - 8, w, 16);
      if (this.playerRef && Phaser.Geom.Rectangle.Overlaps(rect, this.playerRef.bounds())) {
        this.playerRef.damage(18, this.x);
      }
    });
    return 1150;
  }

  /** 震地冲击波：跃起砸地（冲击环 + 尘土迸溅），向两侧放出岩屑尖浪（跳起可躲） */
  shockwave(): number {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 36,
      duration: 170,
      yoyo: true,
      ease: "Quad.InOut",
    });
    this.scene.time.delayedCall(340, () => {
      if (!this.guard()) return;
      this.scene.cameras.main.shake(160, 0.008);
      shockRing(this.scene, this.x, this.def.y + 41, {
        color: 0xff9f1a,
        from: 16,
        to: 120,
        lineWidth: 5,
        duration: 340,
      });
      burst(this.scene, this.x, this.def.y + 41, {
        color: 0x9a8a72,
        count: 8,
        size: 3,
        grow: 14,
        duration: 300,
        spreadX: 30,
        spreadY: 4,
      });
      for (const dir of [-1, 1]) {
        const wave = new Projectile(
          this.scene,
          this.x + dir * 60,
          this.def.y + 41,
          "shock-wave",
          dir * 320,
          0,
          { damage: 15, fromPlayer: false, ttlMs: 2200 },
        );
        // 弹体默认按速度方向旋转（向左会倒置尖浪），尖浪始终底边贴地、仅水平镜像
        wave.setRotation(0);
      }
    });
    return 750;
  }

  /** 扇形弹幕：七向齿轮弹 */
  fanSpread(player: Player): number {
    this.muzzleFlash();
    for (let i = 0; i < 7; i++) {
      this.spin(this.fireAimed(player, -0.6 + i * 0.2, 270, "gear-shot", 8));
    }
    return 650;
  }

  /** 环形弹幕：全方位十向齿轮弹（跳/翻滚穿缝可躲，终焉机体专属） */
  ringShot(): number {
    this.muzzleFlash();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new Projectile(
        this.scene,
        this.x + Math.cos(a) * 50,
        this.y + 24 + Math.sin(a) * 30,
        "gear-shot",
        Math.cos(a) * 240,
        Math.sin(a) * 240,
        { damage: 9, fromPlayer: false, ttlMs: 2400 },
      );
      this.spin(p);
    }
    return 650;
  }

  // ---------- 内部 ----------

  /** 场上存活小怪数（不含 Boss 自身） */
  private aliveMinions(): number {
    return CombatSystem.get(this.scene)?.enemies.filter((e) => !e.dead && e !== this).length ?? 0;
  }

  /** 召唤物入场：注册进战斗系统 + 红色落地脉冲（上限判断由调用方负责） */
  private spawnMinion(enemy: Enemy): void {
    CombatSystem.get(this.scene)?.addEnemy(enemy);
  }

  private fireAimed(
    player: Player,
    angleOffset: number,
    speed: number,
    texture: string,
    damage: number,
  ): Projectile {
    const dx = player.x - this.x;
    const dy = player.y - 18 - (this.y + 24);
    const a = Math.atan2(dy, dx) + angleOffset;
    return new Projectile(
      this.scene,
      this.x + Math.cos(a) * 50,
      this.y + 24 + Math.sin(a) * 30,
      texture,
      Math.cos(a) * speed,
      Math.sin(a) * speed,
      { damage, fromPlayer: false, ttlMs: 2600 },
    );
  }

  /** 齐射炮口闪光：臂部单次金色爆闪（整轮一次，不逐弹刷屏） */
  private muzzleFlash(): void {
    burst(this.scene, this.x + this.facingDir() * 44, this.y - 8, {
      color: 0xffd23e,
      count: 1,
      size: 9,
      grow: 30,
      duration: 200,
      spreadX: 0,
      spreadY: 0,
      alpha: 0.85,
    });
  }

  /** 弹体自旋：齿轮纹理带角速度飞行（判定框为 AABB，不受旋转影响） */
  private spin(p: Projectile): void {
    (p.body as Phaser.Physics.Arcade.Body).setAngularVelocity(Math.random() < 0.5 ? -260 : 260);
  }

  private endDash(time: number, hitWall: boolean): void {
    this.dashing = false;
    if (hitWall) {
      // 撞墙收势：朝墙侧尘土迸溅 + 短震
      const mid = (this.def.room.x0 + this.def.room.x1) / 2;
      const wallX = this.x >= mid ? this.def.room.x1 - 16 : this.def.room.x0 + 16;
      burst(this.scene, wallX, this.y + 20, {
        color: 0x9a8a72,
        count: 6,
        size: 3,
        grow: 12,
        duration: 240,
        spreadX: 6,
        spreadY: 10,
      });
      this.scene.cameras.main.shake(90, 0.005);
    }
    if (!this.dashHitPlayer) {
      // 冲撞落空：硬直露背
      this.mode = "stunned";
      this.coreExposed = true;
      this.stunUntil = time + STUN_MS;
      this.scene.cameras.main.shake(120, 0.006);
    } else {
      this.mode = "active";
      this.nextPickAt = time + 500;
    }
  }
}
