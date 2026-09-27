import Phaser from "phaser";
import type { LevelConfig } from "../data/levels";
import { BreakPlank } from "../entities/BreakPlank";
import { Checkpoint } from "../entities/Checkpoint";
import { Conveyor } from "../entities/Conveyor";
import { Ember } from "../entities/Ember";
import { FadingPlatform } from "../entities/FadingPlatform";
import { GearBug } from "../entities/GearBug";
import { LavaPit } from "../entities/LavaPit";
import { LaserGate } from "../entities/LaserGate";
import { Merchant } from "../entities/Merchant";
import { MovPlatform } from "../entities/MovPlatform";
import { Saw } from "../entities/Saw";
import { ScoutDrone } from "../entities/ScoutDrone";
import { Snapflower } from "../entities/Snapflower";
import { Spitter } from "../entities/Spitter";
import { SporeMoth } from "../entities/SporeMoth";
import { Spring } from "../entities/Spring";
import { Thornbeetle } from "../entities/Thornbeetle";
import { Thornbur } from "../entities/Thornbur";
import { Turret } from "../entities/Turret";
import { Updraft } from "../entities/Updraft";
import type { EnemyDef } from "../data/enemies";
import { CombatSystem } from "../systems/CombatSystem";
import { blink, burst } from "../systems/Fx";
import { explosion } from "../systems/Particles";
import { DEPTH, FONT, GAME } from "../types";
import type { Player } from "../entities/Player";

/**
 * 关卡静态内容搭建（一/二/三关共用）：背景视差 / 地形 / 机关 / 装饰 / 金币 / 刷怪。
 * 只做"摆东西"，不持状态——计数器、检查点回调等仍由关卡场景所有。
 * create 的调用顺序即渲染与物理注册顺序，勿随意调整。
 */

/** 场景持有的机关集合（updrafts 需 update 每帧 tick；其余仅供 E2E 结构断言） */
export interface LevelRuntime {
  conveyors: Conveyor[];
  saws: Saw[];
  movers: MovPlatform[];
  lasers: LaserGate[];
  updrafts: Updraft[];
  fading: FadingPlatform[];
}

/** 分段底色 + 视差剪影层，返回 [远山, 近树]（场景每帧按相机 worldView 贴边并驱动 tilePositionX） */
export function buildBackdrop(
  scene: Phaser.Scene,
  L: LevelConfig,
): Phaser.GameObjects.TileSprite[] {
  for (const seg of L.segments) {
    scene.add
      .rectangle(seg.x0, 0, seg.x1 - seg.x0, GAME.height, seg.color)
      .setOrigin(0)
      .setDepth(DEPTH.bg);
    scene.add
      .text((seg.x0 + seg.x1) / 2, 330, seg.name, {
        fontFamily: FONT,
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0.22)
      .setDepth(DEPTH.bgLabel);
  }

  // 视差剪影：远山 0.25 / 近树 0.5。世界锚定（场景 update 里贴相机可视区），
  // zoom 像素化后可视世界为 width/zoom，1 世界单位呈 2×2 屏幕像素，屏占随之翻倍；
  // 熔火机厂（forge）染暗红调，黑暗森林（darkwood）染墨绿调
  const viewW = GAME.width / GAME.zoom;
  const mountains = scene.add
    .tileSprite(0, GAME.height - 240, viewW, 200, "bg-mountains")
    .setOrigin(0)
    .setAlpha(0.65)
    .setDepth(DEPTH.parallaxFar);
  const trees = scene.add
    .tileSprite(0, GAME.height - 150, viewW, 140, "bg-trees")
    .setOrigin(0)
    .setAlpha(0.6)
    .setDepth(DEPTH.parallaxNear);
  if (L.theme === "forge") {
    mountains.setTint(0x8a5a4a);
    trees.setTint(0x6e3f3a);
  } else if (L.theme === "darkwood") {
    mountains.setTint(0x2e4a38);
    trees.setTint(0x1f3628);
  }
  return [mountains, trees];
}

function makeStatic(scene: Phaser.Scene, player: Player, go: Phaser.GameObjects.GameObject): void {
  scene.physics.add.existing(go, true);
  scene.physics.add.collider(player, go);
}

/** tileSprite 铺视觉 + 静态体做碰撞（阶段 2 验证过的方法，配置驱动批量用） */
export function buildTerrain(scene: Phaser.Scene, player: Player, L: LevelConfig): void {
  const groundTop = L.groundTop;
  // 黑暗森林：地面/浮台整体染灰绿（湿润腐殖土调），浮台读作缠藤木板
  const murky = L.theme === "darkwood";
  for (const g of L.grounds) {
    const top = scene.add.tileSprite(g.x, groundTop, g.w, 9, "ground-top").setOrigin(0);
    const fill = scene.add.tileSprite(g.x, groundTop + 9, g.w, 31, "ground-fill").setOrigin(0);
    if (murky) {
      top.setTint(0xa0b898);
      fill.setTint(0x8fa08a);
    }
    makeStatic(scene, player, scene.add.zone(g.x, groundTop, g.w, 40).setOrigin(0));
  }
  for (const p of L.platforms) {
    const plate = scene.add.tileSprite(p.x, p.y, p.w, 16, "plate").setOrigin(0);
    if (murky) plate.setTint(0xb0a488);
    makeStatic(scene, player, plate);
  }
  // 世界左右墙（防止走出边界；坠落坑在底部由 FALL_Y 兜底）
  makeStatic(scene, player, scene.add.zone(-40, 0, 40, GAME.height).setOrigin(0));
  makeStatic(scene, player, scene.add.zone(L.worldWidth, 0, 40, GAME.height).setOrigin(0));
}

/** 传送带/锯片/断桥/熔岩坑/吊台/激光/检查点；可动机关经 runtime 由场景 update 驱动 */
export function buildMechanisms(
  scene: Phaser.Scene,
  player: Player,
  L: LevelConfig,
  rt: LevelRuntime,
  onCheckpoint: (x: number) => void,
): void {
  const groundTop = L.groundTop;
  for (const def of L.belts) rt.conveyors.push(new Conveyor(scene, groundTop, def));
  for (const def of L.saws) rt.saws.push(new Saw(scene, def));
  for (const def of L.springs) new Spring(scene, def.x, groundTop, player);
  for (const def of L.lavaPits ?? []) new LavaPit(scene, def, groundTop, player);
  for (const def of L.movers ?? []) rt.movers.push(new MovPlatform(scene, player, def));
  for (const def of L.laserGates ?? []) rt.lasers.push(new LaserGate(scene, def));
  for (const def of L.updrafts ?? []) rt.updrafts.push(new Updraft(scene, def, groundTop));
  for (const def of L.fadingPlatforms ?? []) {
    rt.fading.push(new FadingPlatform(scene, player, def));
  }

  if (L.bridge) {
    for (const plank of L.bridge.planks) {
      const breaker = new BreakPlank(scene, plank.x, L.bridge.y, plank.w, L.bridge.rebuildMs);
      scene.physics.add.collider(player, breaker.getVisual(), () => breaker.trigger(scene));
    }
  }

  for (const cp of L.checkpoints) {
    new Checkpoint(scene, cp.x, groundTop, player, onCheckpoint);
  }
}

/** 关卡主题装饰剪影 + Boss 房门 + 终点核心装饰；返回门顶警告文字（入场后销毁，null=无需） */
export function buildDecor(scene: Phaser.Scene, L: LevelConfig): Phaser.GameObjects.Text | null {
  if (L.theme === "forest") {
    // 锯木厂剪影：废齿轮 + 烟囱
    for (const [x, y, s] of [
      [2520, 452, 3],
      [2820, 470, 4],
      [3150, 458, 3],
    ] as const) {
      scene.add
        .image(x, y, "gear-shot")
        .setScale(s)
        .setTint(0x2c2a24)
        .setAlpha(0.85)
        .setDepth(DEPTH.decor);
    }
    scene.add.rectangle(2600, 360, 26, 140, 0x221d18).setOrigin(0).setDepth(DEPTH.decor);
    scene.add.rectangle(2618, 352, 40, 16, 0x221d18).setOrigin(0).setDepth(DEPTH.decor);
  } else if (L.theme === "forge") {
    // 熔火机厂剪影：熔炉塔 + 管道 + 炉口火光（塔身比各段底色更暗一档才读得出形状）
    for (const [x, w, h] of [
      [1700, 46, 150],
      [2250, 60, 190],
      [4300, 46, 150],
      [4560, 54, 170],
    ] as const) {
      scene.add
        .rectangle(x, 500 - h, w, h, 0x1c1310)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      scene.add
        .rectangle(x + 10, 500 - h + 24, w - 20, 16, 0xff5722, 0.42)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      scene.add
        .rectangle(x + w / 2 - 3, 500 - h - 34, 6, 34, 0x1c1310)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
    }
    scene.add.rectangle(1980, 420, 220, 8, 0x1c1310).setOrigin(0).setDepth(DEPTH.decor);
    scene.add.rectangle(4560, 400, 180, 8, 0x1c1310).setOrigin(0).setDepth(DEPTH.decor);
  } else if (L.theme === "darkwood") {
    // 黑暗森林剪影：扭曲巨树 + 枝杈 + 垂藤 + 荧光苔带（比各段底色更暗一档 + 荧光点缀）
    for (const [x, w, h] of [
      [900, 54, 180],
      [2080, 68, 220],
      [3350, 58, 190],
      [4460, 64, 210],
    ] as const) {
      scene.add
        .rectangle(x, 500 - h, w, h, 0x0a120c)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      // 两侧枝杈
      scene.add
        .rectangle(x - 18, 500 - h + 26, 18, 10, 0x0a120c)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      scene.add
        .rectangle(x + w, 500 - h + 44, 22, 10, 0x0a120c)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      // 荧光苔光带
      scene.add
        .rectangle(x + 8, 500 - h + 60, w - 16, 5, 0x9fe86a, 0.28)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      // 垂藤
      scene.add
        .rectangle(x + w / 2 - 2, 500 - h - 34, 4, 34, 0x0a120c)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
    }
    // 倒木横陈
    scene.add.rectangle(1500, 396, 300, 14, 0x0a120c).setOrigin(0).setDepth(DEPTH.decor);
    scene.add.rectangle(3700, 380, 240, 12, 0x0a120c).setOrigin(0).setDepth(DEPTH.decor);
    // 荧光蘑菇点缀（菌盖 + 菌柄 + 光晕）
    for (const [x, y] of [
      [1240, 486],
      [2470, 484],
      [3650, 486],
      [4980, 484],
    ] as const) {
      scene.add.circle(x, y, 9, 0x9fe86a, 0.16).setDepth(DEPTH.decor);
      scene.add
        .rectangle(x - 1, y, 3, 9, 0x0a120c)
        .setOrigin(0)
        .setDepth(DEPTH.decor);
      scene.add.circle(x, y - 2, 5, 0x9fe86a, 0.75).setDepth(DEPTH.decor);
      scene.add.circle(x - 1, y - 3, 2, 0xd4ff7a, 0.9).setDepth(DEPTH.decor);
    }
  }

  // Boss 房门（黑暗森林为巨木门 + 缠藤，其余为遗迹铁门）
  const doorFrame = L.theme === "darkwood" ? 0x2c2418 : 0x3a4150;
  const doorLeaf = L.theme === "darkwood" ? 0x1c160e : 0x22262e;
  scene.add.rectangle(L.doorX - 45, 360, 90, 140, doorFrame).setOrigin(0);
  scene.add.rectangle(L.doorX - 37, 368, 74, 126, doorLeaf).setOrigin(0);
  if (L.theme === "darkwood") {
    scene.add
      .rectangle(L.doorX - 37, 368, 74, 8, 0x3d5c2e, 0.8)
      .setOrigin(0)
      .setDepth(DEPTH.decor);
    scene.add
      .rectangle(L.doorX - 8, 368, 6, 126, 0x3d5c2e, 0.65)
      .setOrigin(0)
      .setDepth(DEPTH.decor);
  }
  scene.add
    .text(L.doorX, 340, "BOSS", {
      fontFamily: FONT,
      fontSize: "22px",
      color: "#ff6b5e",
      fontStyle: "bold",
    })
    .setOrigin(0.5);
  scene.add
    .text(L.doorX, 445, L.boss.doorNote, {
      fontFamily: FONT,
      fontSize: "12px",
      color: "#8a93a5",
    })
    .setOrigin(0.5);

  // 门顶警告闪烁（入场后移除）
  const doorWarn = scene.add
    .text(L.doorX, 296, "!", {
      fontFamily: FONT,
      fontSize: "30px",
      color: "#ff3b30",
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.overlay)
    .setName("door-warn");
  blink(scene, doorWarn, { alpha: 0.25, duration: 250 });

  // 终点装饰：核心拾取物（机器人核心/熔核/森林之心——黑暗森林染荧光绿）
  const coreItem = scene.add.image(L.coreX, L.groundTop, "core-item").setOrigin(0.5, 1);
  if (L.theme === "darkwood") coreItem.setTint(0x9fe86a);
  scene.add
    .text(L.coreX, L.groundTop - 46, L.coreLabel, {
      fontFamily: FONT,
      fontSize: "13px",
      color: "#ffd23e",
    })
    .setOrigin(0.5);

  return doorWarn;
}

/** 金币摆放与拾取视觉；计数与连击音效经 onCoin 回调归场景 */
export function buildCoins(
  scene: Phaser.Scene,
  player: Player,
  L: LevelConfig,
  onCoin: () => void,
): void {
  for (const c of L.coins) {
    const img = scene.add.image(c.x, c.y, "coin");
    scene.tweens.add({
      targets: img,
      y: c.y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    const zone = scene.add.zone(c.x, c.y, 34, 44);
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(player, zone, () => {
      if (!img.active) return;
      img.destroy();
      zone.destroy();
      burst(scene, c.x, c.y, {
        count: 1,
        size: 5,
        grow: 14,
        duration: 220,
        spreadX: 0,
        spreadY: 0,
      });
      explosion(scene, c.x, c.y, {
        tints: [0xffd23e, 0xffe9a0, 0xffffff],
        count: 9,
        speed: [40, 130],
        life: [300, 520],
        gravityY: 220,
        scale: 0.9,
      });
      onCoin();
    });
  }
}

/** 按关卡 spawns 点位表刷怪（首次创建与死亡重置共用同一入口） */
export function spawnEnemies(scene: Phaser.Scene, combat: CombatSystem, spawns: EnemyDef[]): void {
  for (const def of spawns) {
    switch (def.kind) {
      case "gearbug":
        combat.addEnemy(new GearBug(scene, def));
        break;
      case "drone":
        combat.addEnemy(new ScoutDrone(scene, def));
        break;
      case "turret":
        combat.addEnemy(new Turret(scene, def));
        break;
      case "spitter":
        combat.addEnemy(new Spitter(scene, def));
        break;
      case "ember":
        combat.addEnemy(new Ember(scene, def));
        break;
      case "beetle":
        combat.addEnemy(new Thornbeetle(scene, def));
        break;
      case "moth":
        combat.addEnemy(new SporeMoth(scene, def));
        break;
      case "snapflower":
        combat.addEnemy(new Snapflower(scene, def));
        break;
      case "thornbur":
        combat.addEnemy(new Thornbur(scene, def));
        break;
    }
  }
}

/** 补给机摆放（交互判定由场景按 x 距离驱动） */
export function buildMerchants(scene: Phaser.Scene, L: LevelConfig): Merchant[] {
  return L.merchants.map((m) => new Merchant(scene, m.x, L.groundTop));
}
