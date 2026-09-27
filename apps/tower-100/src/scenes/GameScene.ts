/** 主游戏场景：自动弹跳爬楼、屏幕上移、五种平台、飞刀与爱心。 */

import Phaser from "phaser";
import {
  BOUNCE_VELOCITY,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_HP,
  MOVE_SPEED,
  PLATFORM_TYPE,
  SCROLL_SPEED_MAX,
  SCROLL_SPEED_MIN,
  SPRING_VELOCITY,
  WIN_FLOOR,
  platformWeights,
  type PlatformType,
} from "../config";
import { TEX } from "../textures";
import { FONT, loadBest, saveBest } from "../util";

type DeathReason = "fall" | "spike" | "knife";

/** Phaser 4 物理回调的参数联合类型 */
type PhysObject =
  | Phaser.Types.Physics.Arcade.GameObjectWithBody
  | Phaser.Physics.Arcade.Body
  | Phaser.Physics.Arcade.StaticBody
  | Phaser.Tilemaps.Tile;

interface Plat {
  sprite: Phaser.Physics.Arcade.Sprite;
  /** 传送带的履带贴图（仅 conveyor 有） */
  belt: Phaser.GameObjects.TileSprite | null;
  type: PlatformType;
  floor: number;
  /** 传送带方向：1 向右，-1 向左 */
  dir: number;
  speed: number;
  broken: boolean;
}

interface Hazard {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: "knife" | "heart";
}

type ResultData = {
  win: boolean;
  floor: number;
  reason: DeathReason;
  isNewBest: boolean;
};

function bodyOf(obj: Phaser.GameObjects.GameObject): Phaser.Physics.Arcade.Body {
  return (obj as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
}

function pickType(floor: number): PlatformType {
  const weights = platformWeights(floor);
  const entries = Object.entries(weights) as [PlatformType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [type, w] of entries) {
    roll -= w;
    if (roll <= 0) return type;
  }
  return PLATFORM_TYPE.Normal;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.Group;
  private hazardsGroup!: Phaser.Physics.Arcade.Group;
  private plats: Plat[] = [];
  private hazards: Hazard[] = [];

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private readonly pointers = new Map<number, number>();

  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private floorText: Phaser.GameObjects.Text | null = null;
  private heartImages: Phaser.GameObjects.Image[] = [];

  private state: "play" | "dead" | "won" = "play";
  private hp = MAX_HP;
  private floor = 1;
  private invulnUntil = 0;
  private hazardTimer = 2.6;

  private topY = 0;
  private genFloor = 1;
  private lastX = GAME_WIDTH / 2;

  constructor() {
    super("game");
  }

  create(): void {
    // —— 每次进入都重置局面（场景实例会被复用）——
    this.plats = [];
    this.hazards = [];
    this.heartImages = [];
    this.state = "play";
    this.hp = MAX_HP;
    this.floor = 1;
    this.invulnUntil = 0;
    this.hazardTimer = 2.6;
    this.genFloor = 1;
    this.lastX = GAME_WIDTH / 2;

    this.cursors = this.input.keyboard?.createCursorKeys() ?? null;
    this.keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A) ?? null;
    this.keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D) ?? null;

    // —— 地面（第 1 层）——
    const groundY = GAME_HEIGHT - 18;
    this.topY = GAME_HEIGHT - 36;
    const ground = this.physics.add.sprite(GAME_WIDTH / 2, groundY, TEX.ground);
    this.platforms = this.physics.add.group();
    this.platforms.add(ground);
    const gBody = bodyOf(ground);
    gBody.immovable = true;
    gBody.allowGravity = false;
    gBody.checkCollision.down = false;
    gBody.checkCollision.left = false;
    gBody.checkCollision.right = false;
    const groundPlat: Plat = {
      sprite: ground,
      belt: null,
      type: PLATFORM_TYPE.Normal,
      floor: 1,
      dir: 0,
      speed: 0,
      broken: false,
    };
    ground.setData("plat", groundPlat);
    this.plats.push(groundPlat);

    // —— 玩家 ——
    this.player = this.physics.add.sprite(GAME_WIDTH / 2, this.topY - 18, TEX.hero);
    this.player.setDepth(10);
    const pBody = bodyOf(this.player);
    pBody.setSize(20, 34, true);

    this.physics.add.collider(this.player, this.platforms, this.onLand, undefined, this);

    // 掉落物组（刀 / 心）
    this.hazardsGroup = this.physics.add.group();
    this.physics.add.overlap(this.player, this.hazardsGroup, this.onHazard, undefined, this);

    // —— 尘土粒子 ——
    this.dustEmitter = this.add
      .particles(0, 0, TEX.dust, {
        speed: { min: 30, max: 85 },
        angle: { min: 210, max: 330 },
        gravityY: 350,
        lifespan: 350,
        scale: { start: 1, end: 0 },
        emitting: false,
      })
      .setDepth(5);

    // —— HUD ——
    this.floorText = this.add
      .text(GAME_WIDTH / 2, 32, "第 1 层", {
        fontFamily: FONT,
        fontSize: "30px",
        color: "#ffffff",
        stroke: "#2f3640",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
    for (let i = 0; i < MAX_HP; i++) {
      const img = this.add
        .image(26 + i * 30, 26, TEX.heart)
        .setScrollFactor(0)
        .setDepth(100);
      this.heartImages.push(img);
    }
    this.add
      .text(GAME_WIDTH - 12, 14, `最高 ${loadBest()} 层`, {
        fontFamily: FONT,
        fontSize: "16px",
        color: "#9dd6ff",
        stroke: "#1b3a55",
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // —— 触屏 / 鼠标按住左右半屏移动 ——
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.pointers.set(p.id, p.x));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.pointers.set(p.id, p.x);
    });
    const release = (p: Phaser.Input.Pointer) => this.pointers.delete(p.id);
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
    this.input.on("gameout", () => this.pointers.clear());

    // —— 镜头初始对齐，并预生成下方一屏的平台 ——
    this.cameras.main.scrollY = this.player.y - GAME_HEIGHT * 0.62;
    this.fillPlatforms();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const cam = this.cameras.main;

    if (this.state === "play") {
      this.applyMove();
      this.applyConveyor(dt);
      // 限制在屏幕左右边界内
      this.player.x = Phaser.Math.Clamp(this.player.x, 14, GAME_WIDTH - 14);

      // 屏幕持续上移，逼迫玩家爬楼
      const creep = Phaser.Math.Clamp(
        SCROLL_SPEED_MIN + this.floor * 0.85,
        SCROLL_SPEED_MIN,
        SCROLL_SPEED_MAX,
      );
      cam.scrollY -= creep * dt;

      // 掉落物生成节奏
      this.hazardTimer -= dt;
      if (this.hazardTimer <= 0) {
        this.spawnHazard();
        this.hazardTimer = Math.max(1.1, 3.4 - this.floor * 0.024);
      }

      if (this.player.y - 18 > cam.scrollY + GAME_HEIGHT + 40) {
        this.die("fall");
      }
    }

    // 跟随玩家向上（只升不降）
    const desired = this.player.y - GAME_HEIGHT * 0.62;
    if (desired < cam.scrollY) {
      const k = 1 - Math.exp(-9 * dt);
      cam.scrollY += (desired - cam.scrollY) * k;
    }

    this.fillPlatforms();
    this.cleanupOffscreen();
  }

  private applyMove(): void {
    const left = (this.cursors?.left.isDown ?? false) || (this.keyA?.isDown ?? false);
    const right = (this.cursors?.right.isDown ?? false) || (this.keyD?.isDown ?? false);
    let dir = (left ? -1 : 0) + (right ? 1 : 0);
    for (const x of this.pointers.values()) {
      dir += x < GAME_WIDTH / 2 ? -1 : 1;
    }
    dir = Phaser.Math.Clamp(dir, -1, 1);
    const pBody = bodyOf(this.player);
    pBody.setVelocityX(dir * MOVE_SPEED);
    if (dir !== 0) this.player.setFlipX(dir < 0);
  }

  private applyConveyor(dt: number): void {
    const pBody = bodyOf(this.player);
    for (const plat of this.plats) {
      if (plat.type !== PLATFORM_TYPE.Conveyor || plat.broken || !plat.belt) continue;
      plat.belt.tilePositionX += plat.dir * plat.speed * dt;
      const bBody = bodyOf(plat.sprite);
      if (
        pBody.blocked.down &&
        Math.abs(pBody.bottom - bBody.top) < 4 &&
        Math.abs(this.player.x - plat.sprite.x) < 58
      ) {
        this.player.x += plat.dir * plat.speed * dt;
      }
    }
  }

  /** 持续生成屏幕上方的平台 */
  private fillPlatforms(): void {
    while (this.topY > this.cameras.main.scrollY - 80) {
      const floorNum = this.genFloor + 1;
      const gap = Math.min(88 + Math.random() * 40 + floorNum * 0.3, 145);
      const type = pickType(floorNum);
      const w = type === PLATFORM_TYPE.Spring ? 64 : 96;
      const x = Phaser.Math.Clamp(
        this.lastX + Phaser.Math.Between(-190, 190),
        w / 2 + 10,
        GAME_WIDTH - w / 2 - 10,
      );
      this.lastX = x;
      const y = this.topY - gap;

      const tex =
        type === PLATFORM_TYPE.Fragile
          ? TEX.platFragile
          : type === PLATFORM_TYPE.Spring
            ? TEX.platSpring
            : type === PLATFORM_TYPE.Spike
              ? TEX.platSpike
              : type === PLATFORM_TYPE.Conveyor
                ? TEX.platBoard
                : TEX.platNormal;
      const sprite = this.physics.add.sprite(x, y, tex);
      sprite.setDepth(3);
      this.platforms.add(sprite);
      const b = bodyOf(sprite);
      b.immovable = true;
      b.allowGravity = false;
      b.checkCollision.down = false;
      b.checkCollision.left = false;
      b.checkCollision.right = false;

      const plat: Plat = {
        sprite,
        belt: null,
        type,
        floor: floorNum,
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: Phaser.Math.Between(60, 100),
        broken: false,
      };
      sprite.setData("plat", plat);
      if (type === PLATFORM_TYPE.Conveyor) {
        const belt = this.add.tileSprite(x, y - 10, 96, 8, TEX.belt);
        belt.setDepth(4);
        belt.setFlipX(plat.dir < 0);
        plat.belt = belt;
      }
      this.plats.push(plat);

      this.topY = y;
      this.genFloor = floorNum;
    }
  }

  private onLand = (_player: PhysObject, obj: PhysObject): void => {
    if (this.state !== "play") return;
    const plat = (obj as Phaser.Physics.Arcade.Sprite).getData("plat") as Plat | undefined;
    if (!plat || plat.broken) return;
    const pBody = bodyOf(this.player);
    if (!pBody.touching.down) return;

    if (plat.type === PLATFORM_TYPE.Spike) {
      this.die("spike");
      return;
    }

    if (plat.type === PLATFORM_TYPE.Spring) {
      pBody.setVelocityY(SPRING_VELOCITY);
      this.tweens.add({
        targets: plat.sprite,
        scaleY: 0.55,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    } else {
      pBody.setVelocityY(BOUNCE_VELOCITY);
    }

    this.squashPlayer();
    this.dustEmitter?.explode(7, this.player.x, pBody.bottom);

    if (plat.floor > this.floor) {
      this.floor = plat.floor;
      this.refreshHud();
      if (this.floor >= WIN_FLOOR) {
        this.win();
        return;
      }
    }

    if (plat.type === PLATFORM_TYPE.Fragile && !plat.broken) {
      this.breakPlat(plat);
    }
  };

  private squashPlayer(): void {
    this.tweens.add({
      targets: this.player,
      scaleY: 0.65,
      scaleX: 1.25,
      duration: 70,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  private breakPlat(plat: Plat): void {
    plat.broken = true;
    this.plats = this.plats.filter((p) => p !== plat);
    bodyOf(plat.sprite).enable = false;
    if (plat.belt) plat.belt.setVisible(false);
    this.tweens.add({
      targets: plat.sprite,
      y: "+=260",
      angle: Phaser.Math.Between(-80, 80),
      alpha: 0.3,
      duration: 700,
      ease: "Quad.easeIn",
      onComplete: () => plat.sprite.destroy(),
    });
  }

  private spawnHazard(): void {
    const isKnife = Math.random() < 0.78;
    const sprite = this.physics.add.sprite(
      Phaser.Math.Between(30, GAME_WIDTH - 30),
      this.cameras.main.scrollY - 40,
      isKnife ? TEX.knife : TEX.heart,
    );
    sprite.setDepth(8);
    const b = bodyOf(sprite);
    b.allowGravity = false;
    b.setVelocityY(150 + this.floor * 0.8 + Math.random() * 60);
    if (isKnife) b.setAngularVelocity(Phaser.Math.Between(-160, 160));
    const hazard: Hazard = { sprite, kind: isKnife ? "knife" : "heart" };
    sprite.setData("hazard", hazard);
    this.hazards.push(hazard);
  }

  private onHazard = (_player: PhysObject, obj: PhysObject): void => {
    const hazard = (obj as Phaser.Physics.Arcade.Sprite).getData("hazard") as Hazard | undefined;
    if (!hazard) return;
    this.removeHazard(hazard);

    if (this.state !== "play") return;

    if (hazard.kind === "heart") {
      this.hp = Math.min(this.hp + 1, MAX_HP);
      this.refreshHud();
      this.dustEmitter?.explode(8, this.player.x, this.player.y - 20);
      const tip = this.add
        .text(this.player.x, this.player.y - 30, "+1", {
          fontFamily: FONT,
          fontSize: "18px",
          color: "#2ed573",
          stroke: "#103d20",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(20);
      this.tweens.add({
        targets: tip,
        y: tip.y - 40,
        alpha: 0,
        duration: 600,
        onComplete: () => tip.destroy(),
      });
      return;
    }

    // 飞刀
    if (this.time.now < this.invulnUntil) return;
    this.hp -= 1;
    this.refreshHud();
    this.invulnUntil = this.time.now + 1200;
    this.cameras.main.shake(150, 0.008);
    this.cameras.main.flash(120, 255, 70, 70);
    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 120,
      yoyo: true,
      repeat: 4,
      onComplete: () => this.player.setAlpha(1),
    });
    if (this.hp <= 0) this.die("knife");
  };

  private removeHazard(hazard: Hazard): void {
    this.hazards = this.hazards.filter((h) => h !== hazard);
    hazard.sprite.destroy();
  }

  private refreshHud(): void {
    this.floorText?.setText(`第 ${this.floor} 层`);
    if (this.floorText && this.floor > 1) {
      this.tweens.add({
        targets: this.floorText,
        scale: 1.25,
        duration: 90,
        yoyo: true,
      });
    }
    this.heartImages.forEach((img, i) => img.setVisible(i < this.hp));
  }

  private cleanupOffscreen(): void {
    const limit = this.cameras.main.scrollY + GAME_HEIGHT + 90;
    this.hazards = this.hazards.filter((h) => {
      if (h.sprite.y > limit || !h.sprite.active) {
        h.sprite.destroy();
        return false;
      }
      return true;
    });
    this.plats = this.plats.filter((p) => {
      if (!p.sprite.active || p.sprite.y > limit) {
        p.belt?.destroy();
        if (p.sprite.active) p.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  private die(reason: DeathReason): void {
    if (this.state !== "play") return;
    this.state = "dead";
    const prevBest = loadBest();
    saveBest(this.floor);

    const pBody = bodyOf(this.player);
    pBody.setVelocityX(0);
    pBody.setVelocityY(Math.min(pBody.velocity.y, -280));
    pBody.checkCollision.none = true;
    this.player.setTint(0xff6b6b);
    this.tweens.add({
      targets: this.player,
      angle: 220,
      duration: 800,
      ease: "Linear",
    });
    this.cameras.main.shake(250, 0.012);

    this.time.delayedCall(750, () => {
      const data: ResultData = {
        win: false,
        floor: this.floor,
        reason,
        isNewBest: this.floor > prevBest,
      };
      this.scene.launch("result", data);
      this.scene.pause("game");
    });
  }

  private win(): void {
    if (this.state !== "play") return;
    this.state = "won";
    const prevBest = loadBest();
    saveBest(this.floor);

    const pBody = bodyOf(this.player);
    pBody.setVelocityY(-560);
    this.dustEmitter?.explode(30, this.player.x, this.player.y + 20);
    this.add
      .particles(0, 0, TEX.star, {
        speed: { min: 120, max: 300 },
        angle: { min: 230, max: 310 },
        gravityY: 420,
        lifespan: 1300,
        scale: { start: 1.6, end: 0.2 },
        rotate: { min: 0, max: 360 },
        emitting: false,
      })
      .setDepth(30)
      .explode(36, this.player.x, this.player.y);

    this.time.delayedCall(900, () => {
      const data: ResultData = {
        win: true,
        floor: this.floor,
        reason: "fall",
        isNewBest: this.floor > prevBest,
      };
      this.scene.launch("result", data);
      this.scene.pause("game");
    });
  }
}
