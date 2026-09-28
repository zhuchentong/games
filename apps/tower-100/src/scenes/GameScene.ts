/** 主游戏场景：自动弹跳爬楼、屏幕上移、五种平台、飞刀与爱心道具掉落。 */

import Phaser from "phaser";
import {
  BOUNCE_BOOST_MS,
  BOUNCE_BOOST_MULTIPLIER,
  BOUNCE_VELOCITY,
  DROP_KIND,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_HP,
  MAX_HP_CAP,
  MOVE_SPEED,
  PLATFORM_TYPE,
  SCROLL_SPEED_MAX,
  SCROLL_SPEED_MIN,
  SCROLL_SPEED_PER_FLOOR,
  SLOW_FACTOR,
  SLOW_MS,
  SPRING_VELOCITY,
  WIN_FLOOR,
  dropWeights,
  platformWeights,
  type DropKind,
  type PlatformType,
} from "../config";
import {
  isMuted,
  sfxBounce,
  sfxBreak,
  sfxDie,
  sfxHeart,
  sfxKnife,
  sfxPowerup,
  sfxShield,
  sfxShieldBreak,
  sfxSpike,
  sfxSpring,
  sfxWin,
  startBgm,
  stopBgm,
  toggleMuted,
} from "../audio";
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

interface Drop {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: DropKind;
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

/** 按权重随机挑选一个键 */
function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[0][0];
}

function pickType(floor: number): PlatformType {
  return pickWeighted(platformWeights(floor));
}

const TEX_BY_KIND: Record<DropKind, string> = {
  knife: TEX.knife,
  heart: TEX.heart,
  maxhp: TEX.heartMax,
  bounce: TEX.iconBounce,
  shield: TEX.iconShield,
  slow: TEX.iconSlow,
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.Group;
  private dropGroup!: Phaser.Physics.Arcade.Group;
  private plats: Plat[] = [];
  private drops: Drop[] = [];

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private readonly pointers = new Map<number, number>();

  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private floorText: Phaser.GameObjects.Text | null = null;
  private heartImages: Phaser.GameObjects.Image[] = [];
  private muteText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private shieldBubble: Phaser.GameObjects.Image | null = null;

  private state: "play" | "dead" | "won" = "play";
  private hp = MAX_HP;
  private maxHp = MAX_HP;
  private floor = 1;
  private invulnUntil = 0;
  private hazardTimer = 2.6;
  private bounceBoostUntil = 0;
  private slowUntil = 0;
  private shieldOn = false;
  /** 弹离传送带后的短程携带效果（自动弹跳下玩家无法站住，改为弹起后带出一段距离） */
  private conveyorPush: { dir: number; speed: number; until: number } | null = null;

  private topY = 0;
  private genFloor = 1;
  private lastX = GAME_WIDTH / 2;

  constructor() {
    super("game");
  }

  create(): void {
    // —— 每次进入都重置局面（场景实例会被复用）——
    this.plats = [];
    this.drops = [];
    this.heartImages = [];
    this.state = "play";
    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.floor = 1;
    this.invulnUntil = 0;
    this.hazardTimer = 2.6;
    this.bounceBoostUntil = 0;
    this.slowUntil = 0;
    this.shieldOn = false;
    this.conveyorPush = null;
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

    // 掉落物组（飞刀 / 爱心 / 道具）
    this.dropGroup = this.physics.add.group();
    this.physics.add.overlap(this.player, this.dropGroup, this.onDrop, undefined, this);

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
    for (let i = 0; i < MAX_HP_CAP; i++) {
      const img = this.add
        .image(26 + i * 30, 26, i < MAX_HP ? TEX.heart : TEX.heartEmpty)
        .setScrollFactor(0)
        .setDepth(100);
      this.heartImages.push(img);
    }
    // 激活中的道具效果（弹跳/减速/护盾）
    this.statusText = this.add
      .text(14, 52, "", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#dfe6e9",
        stroke: "#1b3a55",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
    // 护盾气泡（跟随玩家）
    this.shieldBubble = this.add.image(0, 0, TEX.shieldBubble).setDepth(9).setVisible(false);
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

    // —— 音乐开关（右上角 ♪，点击或按 M 切换）——
    this.muteText = this.add
      .text(GAME_WIDTH - 12, 40, isMuted() ? "♪ 已静音" : "♪ 音乐开", {
        fontFamily: FONT,
        fontSize: "13px",
        color: isMuted() ? "#77848f" : "#f5f6fa",
        stroke: "#1b3a55",
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });
    this.muteText.on(
      "pointerdown",
      (_p: Phaser.Input.Pointer, _x: number, _y: number, event: unknown) => {
        (event as { stopPropagation: () => void }).stopPropagation();
        this.toggleMute();
      },
    );
    this.input.keyboard?.on("keydown-M", () => this.toggleMute());
    this.events.once("shutdown", () => stopBgm());
    startBgm();

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
      this.refreshEffects();
      // 限制在屏幕左右边界内
      this.player.x = Phaser.Math.Clamp(this.player.x, 14, GAME_WIDTH - 14);

      // 屏幕持续上移，逼迫玩家爬楼；层数越高越快
      const creep = Phaser.Math.Clamp(
        SCROLL_SPEED_MIN + this.floor * SCROLL_SPEED_PER_FLOOR,
        SCROLL_SPEED_MIN,
        SCROLL_SPEED_MAX,
      );
      const slow = this.time.now < this.slowUntil ? SLOW_FACTOR : 1;
      cam.scrollY -= creep * slow * dt;

      // 掉落物生成节奏
      this.hazardTimer -= dt;
      if (this.hazardTimer <= 0) {
        this.spawnDrop();
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
    for (const plat of this.plats) {
      if (plat.type !== PLATFORM_TYPE.Conveyor || plat.broken || !plat.belt) continue;
      plat.belt.tilePositionX += plat.dir * plat.speed * dt;
    }
    // 弹离传送带后的短时间内被履带带出去一段距离
    const push = this.conveyorPush;
    if (!push) return;
    if (this.time.now >= push.until) {
      this.conveyorPush = null;
      return;
    }
    this.player.x += push.dir * push.speed * dt;
  }

  /** 当前弹跳初速度（弹跳强化道具生效时更高） */
  private bounceVelocity(): number {
    const boost = this.time.now < this.bounceBoostUntil ? BOUNCE_BOOST_MULTIPLIER : 1;
    return BOUNCE_VELOCITY * boost;
  }

  /** 刷新护盾气泡与激活中的效果提示。 */
  private refreshEffects(): void {
    if (this.shieldBubble) {
      this.shieldBubble.setPosition(this.player.x, this.player.y);
      this.shieldBubble.setVisible(this.shieldOn);
      if (this.shieldOn) {
        this.shieldBubble.setAlpha(0.55 + 0.2 * Math.sin(this.time.now / 120));
      }
    }
    if (!this.statusText) return;
    const parts: string[] = [];
    if (this.time.now < this.bounceBoostUntil) {
      parts.push(`弹跳↑ ${Math.ceil((this.bounceBoostUntil - this.time.now) / 1000)}s`);
    }
    if (this.time.now < this.slowUntil) {
      parts.push(`时间慢 ${Math.ceil((this.slowUntil - this.time.now) / 1000)}s`);
    }
    if (this.shieldOn) {
      parts.push("护盾");
    }
    this.statusText.setText(parts.join("   "));
    this.statusText.setVisible(parts.length > 0);
  }

  /** 拾取提示文字（上飘淡出）。 */
  private pickupTip(text: string, color: string): void {
    const tip = this.add
      .text(this.player.x, this.player.y - 30, text, {
        fontFamily: FONT,
        fontSize: "17px",
        color,
        stroke: "#1b2735",
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
      // 踩到钉板：弹起并掉血（受无敌帧保护），血尽才死
      pBody.setVelocityY(this.bounceVelocity());
      this.reachFloor(plat);
      if (this.damage("spike")) sfxSpike();
      return;
    }

    if (plat.type === PLATFORM_TYPE.Spring) {
      pBody.setVelocityY(SPRING_VELOCITY);
      sfxSpring();
      this.tweens.add({
        targets: plat.sprite,
        scaleY: 0.55,
        duration: 90,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    } else if (plat.type === PLATFORM_TYPE.Fragile) {
      pBody.setVelocityY(this.bounceVelocity());
      sfxBreak();
    } else {
      pBody.setVelocityY(this.bounceVelocity());
      sfxBounce();
    }

    this.squashPlayer();
    this.dustEmitter?.explode(7, this.player.x, pBody.bottom);

    if (plat.type === PLATFORM_TYPE.Conveyor) {
      // 传送带把玩家“甩”出去：弹起后约半秒内持续被带向履带方向
      this.conveyorPush = { dir: plat.dir, speed: plat.speed, until: this.time.now + 500 };
      this.dustEmitter?.explode(4, this.player.x, pBody.bottom);
    }

    this.reachFloor(plat);

    if (plat.type === PLATFORM_TYPE.Fragile && !plat.broken) {
      this.breakPlat(plat);
    }
  };

  /** 推进层数并在到达顶层数时判胜。 */
  private reachFloor(plat: Plat): void {
    if (this.state !== "play") return;
    if (plat.floor > this.floor) {
      this.floor = plat.floor;
      this.refreshHud();
      if (this.floor >= WIN_FLOOR) {
        this.win();
      }
    }
  }

  /** 扣 1 血：飞刀与钉板共用，共享无敌帧，血量归零按原因死亡。返回是否实际扣血。 */
  private damage(reason: DeathReason): boolean {
    if (this.state !== "play") return false;
    if (this.time.now < this.invulnUntil) return false;
    // 护盾抵消这次伤害
    if (this.shieldOn) {
      this.shieldOn = false;
      this.invulnUntil = this.time.now + 1200;
      sfxShieldBreak();
      this.cameras.main.shake(100, 0.004);
      this.refreshEffects();
      return false;
    }
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
    if (this.hp <= 0) this.die(reason);
    return true;
  }

  /** 切换音乐开关并刷新右上角指示。 */
  private toggleMute(): void {
    const muted = toggleMuted();
    this.muteText?.setText(muted ? "♪ 已静音" : "♪ 音乐开");
    this.muteText?.setColor(muted ? "#77848f" : "#f5f6fa");
  }

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

  private spawnDrop(force?: DropKind): void {
    const kind = force ?? pickWeighted(dropWeights(this.floor));
    const sprite = this.physics.add.sprite(
      Phaser.Math.Between(30, GAME_WIDTH - 30),
      this.cameras.main.scrollY - 40,
      TEX_BY_KIND[kind],
    );
    // 必须加入掉落物组，否则与玩家的 overlap 不会触发
    this.dropGroup.add(sprite);
    sprite.setDepth(8);
    const b = bodyOf(sprite);
    b.allowGravity = false;
    // 道具比飞刀落得慢，更容易接住
    const speed = 150 + this.floor * 0.8 + Math.random() * 60;
    b.setVelocityY(kind === DROP_KIND.Knife ? speed : speed * 0.75);
    if (kind === DROP_KIND.Knife) b.setAngularVelocity(Phaser.Math.Between(-160, 160));
    const drop: Drop = { sprite, kind };
    sprite.setData("drop", drop);
    this.drops.push(drop);
  }

  private onDrop = (_player: PhysObject, obj: PhysObject): void => {
    const drop = (obj as Phaser.Physics.Arcade.Sprite).getData("drop") as Drop | undefined;
    if (!drop) return;
    this.removeDrop(drop);

    if (this.state !== "play") return;

    switch (drop.kind) {
      case DROP_KIND.Heart: {
        if (this.hp >= this.maxHp) return;
        this.hp = Math.min(this.hp + 1, this.maxHp);
        sfxHeart();
        this.refreshHud();
        this.pickupTip("+1", "#2ed573");
        this.dustEmitter?.explode(8, this.player.x, this.player.y - 20);
        return;
      }
      case DROP_KIND.MaxHp: {
        if (this.maxHp < MAX_HP_CAP) {
          this.maxHp += 1;
          this.hp = Math.min(this.hp + 1, this.maxHp);
          sfxHeart();
          this.pickupTip("生命上限+1", "#f9ca24");
        } else if (this.hp < this.maxHp) {
          this.hp += 1;
          sfxHeart();
          this.pickupTip("+1", "#2ed573");
        } else {
          this.pickupTip("生命已满", "#95a5a6");
        }
        this.refreshHud();
        return;
      }
      case DROP_KIND.Bounce: {
        this.bounceBoostUntil = this.time.now + BOUNCE_BOOST_MS;
        sfxPowerup();
        this.pickupTip("弹跳强化!", "#2ed573");
        return;
      }
      case DROP_KIND.Shield: {
        this.shieldOn = true;
        sfxShield();
        this.pickupTip("护盾!", "#74b9ff");
        return;
      }
      case DROP_KIND.Slow: {
        this.slowUntil = this.time.now + SLOW_MS;
        sfxPowerup();
        this.pickupTip("时间减缓!", "#a29bfe");
        return;
      }
      case DROP_KIND.Knife: {
        if (this.damage("knife")) sfxKnife();
        return;
      }
    }
  };

  private removeDrop(drop: Drop): void {
    this.drops = this.drops.filter((d) => d !== drop);
    drop.sprite.destroy();
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
    // 动态生命上限：已扣的血显示为空心
    this.heartImages.forEach((img, i) => {
      img.setVisible(i < this.maxHp);
      img.setTexture(i < this.hp ? TEX.heart : TEX.heartEmpty);
    });
  }

  private cleanupOffscreen(): void {
    const limit = this.cameras.main.scrollY + GAME_HEIGHT + 90;
    this.drops = this.drops.filter((d) => {
      if (d.sprite.y > limit || !d.sprite.active) {
        d.sprite.destroy();
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
    stopBgm();
    sfxDie();
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
    stopBgm();
    sfxWin();
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
