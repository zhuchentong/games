import Phaser from "phaser";
import { UPGRADE_TRACKS } from "../data/upgrades";
import { Sfx } from "../systems/Sfx";
import { fadeIn } from "../systems/Transitions";
import { FONT, GAME } from "../types";
import { formatClock } from "../utils/math";
import type { BaseLevelScene } from "./BaseLevelScene";
import { DialogueBox } from "./DialogueBox";
import { LEVEL_SCENE_KEYS } from "./levelKeys";

/** 战斗 HUD：与关卡场景并行运行，每帧轮询其公开状态（比事件流简单且天然抗场景重置）。
 * 三关共用：轮询各关场景键（见 levelKeys，勿值导入场景类），关卡切换（L1 通关进 L2）时自动重绑 */
export class UIScene extends Phaser.Scene {
  static readonly KEY = "UIScene";

  /** 商店面板可见性（关卡场景 openShop/closeShop 驱动；E2E 断言用） */
  shopOpen = false;

  private level: BaseLevelScene | null = null;
  private avatar!: Phaser.GameObjects.Image;
  private charText!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private skillFill!: Phaser.GameObjects.Rectangle;
  private skillText!: Phaser.GameObjects.Text;
  private rollFill!: Phaser.GameObjects.Rectangle;
  private coinText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Container;
  private bossName!: Phaser.GameObjects.Text;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private redOverlay!: Phaser.GameObjects.Rectangle;
  private merchantPrompt!: Phaser.GameObjects.Text;
  private shopContainer!: Phaser.GameObjects.Container;
  private shopHighlight!: Phaser.GameObjects.Rectangle;
  private shopCoinsText!: Phaser.GameObjects.Text;
  private shopRowTexts!: Array<{
    name: Phaser.GameObjects.Text;
    desc: Phaser.GameObjects.Text;
    dots: Phaser.GameObjects.Text;
    price: Phaser.GameObjects.Text;
  }>;
  /** Boss 入场对话面板（create 末尾构建，保持最上层；场景重启时随 create 重建） */
  dialogue!: DialogueBox;
  private pauseContainer!: Phaser.GameObjects.Container;
  private lowHpOverlay!: Phaser.GameObjects.Rectangle;
  private lowHpWarned = false;
  /** 关卡进度条（换关重建）：检查点绿/商人金/Boss 门红刻度 + 玩家金点 */
  private progressContainer: Phaser.GameObjects.Container | null = null;
  private progressDot!: Phaser.GameObjects.Arc;
  private stripLevel: BaseLevelScene | null = null;

  constructor() {
    super(UIScene.KEY);
  }

  create(): void {
    // 角色名与操作提示（原属 Level1Scene：zoom 像素化后会随世界相机缩放错位，迁入不 zoom 的 HUD 层；
    // 先于 HUD 元素创建保持原渲染层级）
    // 顶部三行排布：角色名 → 操作提示 → 头像+血条（混排会互相叠压）；Boss 血条再往下避让
    this.charText = this.add.text(16, 10, "", {
      fontFamily: FONT,
      fontSize: "15px",
      color: "#ffe08a",
    });
    this.add.text(
      16,
      31,
      "←→/AD 移动 · 空格/W/↑ 跳 · J 普攻 · K 技能 · Shift 翻滚 · P 暂停 · M 静音 · -/= 音量 · ESC 清档回标题（坠落回检查点）",
      {
        fontFamily: FONT,
        fontSize: "12px",
        color: "#8a93a5",
      },
    );

    const hpBarX = 84;
    const hpBarY = 56;

    this.avatar = this.add.image(34, 64, "char-tiger").setScale(1.4);
    this.add.rectangle(hpBarX, hpBarY, 154, 18, 0x1a1d24).setOrigin(0);
    this.hpFill = this.add.rectangle(hpBarX + 2, hpBarY + 2, 150, 14, 0x67e26a).setOrigin(0);
    this.hpText = this.add.text(hpBarX + 154, hpBarY + 1, "", {
      fontFamily: FONT,
      fontSize: "13px",
      color: "#ffffff",
    });

    // 技能冷却条（血条正下方同宽对齐）：就绪 = 金色满条；冷却 = 灰色按恢复比例从左往右填充 + 剩余秒数
    this.add.rectangle(hpBarX, 84, 154, 10, 0x1a1d24).setOrigin(0);
    this.skillFill = this.add.rectangle(hpBarX + 2, 86, 150, 6, 0xffd23e).setOrigin(0);
    this.skillText = this.add.text(hpBarX + 158, 79, "", {
      fontFamily: FONT,
      fontSize: "11px",
      color: "#ffd23e",
    });

    // 翻滚冷却条（更细一行，无文字；就绪绿条 / 冷却灰色按比例恢复）
    this.add.rectangle(hpBarX, 96, 154, 8, 0x1a1d24).setOrigin(0);
    this.rollFill = this.add.rectangle(hpBarX + 2, 98, 150, 4, 0x8fdcb5).setOrigin(0);

    this.coinText = this.add
      .text(GAME.width - 16, 16, "", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#ffd23e",
        fontStyle: "bold",
      })
      .setOrigin(1, 0);
    this.add.image(GAME.width - 96, 26, "coin").setScale(1.4);

    this.timerText = this.add
      .text(GAME.width / 2, 12, "00:00", {
        fontFamily: FONT,
        fontSize: "20px",
        color: "#c8d2e0",
      })
      .setOrigin(0.5, 0);

    // Boss 血条（Boss 出场前隐藏；y=106 避让顶部三行 HUD + 技能冷却条）
    const barW = 420;
    this.bossName = this.add
      .text(0, -22, "", {
        fontFamily: FONT,
        fontSize: "15px",
        color: "#ff8a80",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.bossBar = this.add.container(GAME.width / 2, 106, [
      this.bossName,
      this.add.rectangle(0, 0, barW + 4, 16, 0x1a1d24),
      (this.bossFill = this.add.rectangle(-barW / 2, 0, barW, 12, 0xff5544).setOrigin(0, 0.5)),
    ]);
    this.bossBar.setVisible(false);

    // 受击红闪（无敌帧期间淡红边）
    this.redOverlay = this.add
      .rectangle(GAME.width / 2, GAME.height / 2, GAME.width, GAME.height, 0xff2222)
      .setAlpha(0);

    // 低血量警示（hp ≤ 25% 常驻红晕脉冲；跨阈值鸣警报一次）
    this.lowHpOverlay = this.add
      .rectangle(GAME.width / 2, GAME.height / 2, GAME.width, GAME.height, 0xff2222)
      .setAlpha(0);

    // 补给机交互提示（靠近商人时底部居中显示）
    this.merchantPrompt = this.add
      .text(GAME.width / 2, GAME.height - 36, "E · 使用补给机", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#ffd23e",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.buildShopPanel();
    this.dialogue = new DialogueBox(this);
    this.buildPausePanel();
    fadeIn(this);
  }

  /** 暂停面板（最上层）：P 继续 / T 回标题保留存档 / ESC 清档回标题 */
  private buildPausePanel(): void {
    const cx = GAME.width / 2;
    const cy = GAME.height / 2;
    this.pauseContainer = this.add.container(0, 0).setVisible(false).setDepth(40);
    this.pauseContainer.add(this.add.rectangle(cx, cy, GAME.width, GAME.height, 0x05070a, 0.6));
    this.pauseContainer.add(
      this.add.rectangle(cx, cy, 420, 196, 0x1d2b3a).setStrokeStyle(2, 0xffd23e),
    );
    this.pauseContainer.add(
      this.add
        .text(cx, cy - 58, "已 暂 停", {
          fontFamily: FONT,
          fontSize: "22px",
          color: "#ffe08a",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    const line = (y: number, text: string, color: string): void => {
      this.pauseContainer.add(
        this.add.text(cx, y, text, { fontFamily: FONT, fontSize: "13px", color }).setOrigin(0.5),
      );
    };
    line(cy - 12, "P · 继续游戏", "#ffffff");
    line(cy + 16, "T · 回标题（保留存档）", "#8fdcb5");
    line(cy + 44, "ESC · 清空存档并回标题", "#ff8a80");
    line(cy + 76, "暂停期间计时停止", "#8a93a5");
  }

  /** 场景驱动：开关暂停面板（E2E 经 pauseOpen getter 断言） */
  showPause(open: boolean): void {
    this.pauseContainer.setVisible(open);
  }

  /** 是否处于暂停面板（关卡场景 pauseOpen 同步） */
  get pauseOpen(): boolean {
    return this.pauseContainer.visible;
  }

  /** 商店面板（zoom 1 清晰层）：暗幕 + 三行升级轨 + 选择高亮，refreshShop 由场景驱动 */
  private buildShopPanel(): void {
    const w = 540;
    const h = 320;
    const cx = GAME.width / 2;
    const cy = GAME.height / 2;
    this.shopContainer = this.add.container(cx, cy).setVisible(false);

    this.shopContainer.add(this.add.rectangle(0, 0, GAME.width, GAME.height, 0x05070a, 0.62));
    this.shopContainer.add(this.add.rectangle(0, 0, w, h, 0x1d2b3a).setStrokeStyle(2, 0xffd23e));
    this.shopContainer.add(
      this.add
        .text(0, -h / 2 + 32, "补 给 商 店", {
          fontFamily: FONT,
          fontSize: "20px",
          color: "#ffe08a",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    this.shopCoinsText = this.add
      .text(0, -h / 2 + 62, "", {
        fontFamily: FONT,
        fontSize: "14px",
        color: "#ffd23e",
      })
      .setOrigin(0.5);
    this.shopContainer.add(this.shopCoinsText);

    const rowYs = [-46, 26, 98];
    this.shopHighlight = this.add
      .rectangle(0, rowYs[0], w - 56, 64, 0x27394e)
      .setStrokeStyle(2, 0xffd23e);
    this.shopContainer.add(this.shopHighlight);

    this.shopRowTexts = UPGRADE_TRACKS.map((track, i) => {
      const y = rowYs[i];
      const name = this.add
        .text(-w / 2 + 44, y - 20, track.name, {
          fontFamily: FONT,
          fontSize: "15px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0, 0);
      const desc = this.add
        .text(-w / 2 + 44, y + 6, track.desc, {
          fontFamily: FONT,
          fontSize: "12px",
          color: "#8a93a5",
        })
        .setOrigin(0, 0);
      const dots = this.add
        .text(w / 2 - 168, y - 20, "", {
          fontFamily: FONT,
          fontSize: "14px",
          color: "#8fdcb5",
        })
        .setOrigin(0, 0);
      const price = this.add
        .text(w / 2 - 44, y - 20, "", {
          fontFamily: FONT,
          fontSize: "14px",
          color: "#ffd23e",
        })
        .setOrigin(1, 0);
      this.shopContainer.add([name, desc, dots, price]);
      return { name, desc, dots, price };
    });

    this.shopContainer.add(
      this.add
        .text(0, h / 2 - 26, "W/S 选择 · E 购买 · Q/ESC 关闭（ESC 不会清档）", {
          fontFamily: FONT,
          fontSize: "12px",
          color: "#8a93a5",
        })
        .setOrigin(0.5),
    );
  }

  /** 场景驱动：开关面板 */
  showShop(open: boolean): void {
    this.shopOpen = open;
    this.shopContainer.setVisible(open);
  }

  /** 场景驱动：刷新钱包/选中行/等级与价格 */
  refreshShop(data: { coins: number; index: number; levels: Record<string, number> }): void {
    this.shopCoinsText.setText(`齿轮币：${data.coins}`);
    this.shopHighlight.setY([-46, 26, 98][data.index]);
    UPGRADE_TRACKS.forEach((track, i) => {
      const lvl = data.levels[track.id] ?? 0;
      const row = this.shopRowTexts[i];
      const maxed = lvl >= track.costs.length;
      const selected = i === data.index;
      row.name.setColor(selected ? "#ffe08a" : "#ffffff");
      row.dots.setText("●".repeat(lvl) + "○".repeat(track.costs.length - lvl));
      row.price.setText(maxed ? "已满级" : `${track.costs[lvl]} 币`);
      row.price.setColor(maxed ? "#8a93a5" : selected ? "#ffd23e" : "#c8d2e0");
    });
  }

  /** 是否正在播放 Boss 入场对话（E2E 断言用，与关卡场景 dialogueOpen 同步） */
  get dialogueActive(): boolean {
    return this.dialogue.active;
  }

  /** 技能冷却恢复比例 0..1（1 = 就绪；E2E 断言用，level 未就绪时返回 1） */
  get skillCdRatio(): number {
    const player = this.level?.player;
    if (!player) return 1;
    const left = player.skillCooldownLeft();
    if (left <= 0) return 1;
    return Math.max(0, 1 - left / player.config.skill.cooldownMs);
  }

  /** 翻滚冷却恢复比例 0..1（1 = 就绪；E2E 断言用） */
  get rollCdRatio(): number {
    const player = this.level?.player;
    if (!player) return 1;
    const left = player.rollCooldownLeft();
    if (left <= 0) return 1;
    return Math.max(0, 1 - left / player.rollCooldownMs);
  }

  update(time: number, delta: number): void {
    // 当前关卡失效（首帧/通关切换到另一关）时在各关场景键间重新解析绑定
    if (this.level && !this.level.sys.isActive()) {
      this.level = null;
      this.dialogue.hide();
    }
    if (!this.level) {
      const lv = LEVEL_SCENE_KEYS.map((k) => this.scene.get(k) as BaseLevelScene | undefined).find(
        (s) => s?.player && s.sys.isActive(),
      );
      if (!lv) return;
      this.level = lv;
      this.avatar.setTexture(lv.player.config.texture);
      this.charText.setText(`当前角色：${lv.player.config.name}｜第 ${lv.levelId} 关`);
      this.bossName.setText(lv.L.boss.name);
    }
    const level = this.level;
    if (!level.sys.isActive()) return;
    const player = level.player;

    // 血条
    const ratio = Math.max(0, Math.min(1, player.hp / player.config.hp));
    this.hpFill.setScale(ratio, 1);
    this.hpFill.setFillStyle(ratio > 0.35 ? 0x67e26a : 0xff6b5e);
    this.hpText.setText(`${player.hp}/${player.config.hp}`);

    // 技能冷却条
    const cd = this.skillCdRatio;
    if (cd >= 1) {
      this.skillFill.setScale(1, 1);
      this.skillFill.setFillStyle(0xffd23e);
      this.skillText.setText("K 技能 就绪").setColor("#ffd23e");
    } else {
      this.skillFill.setScale(cd, 1);
      this.skillFill.setFillStyle(0x8a93a5);
      const leftS = (player.skillCooldownLeft() / 1000).toFixed(1);
      this.skillText.setText(`K 技能 ${leftS}s`).setColor("#8a93a5");
    }

    // 翻滚冷却条
    const rd = this.rollCdRatio;
    if (rd >= 1) {
      this.rollFill.setScale(1, 1);
      this.rollFill.setFillStyle(0x8fdcb5);
    } else {
      this.rollFill.setScale(rd, 1);
      this.rollFill.setFillStyle(0x8a93a5);
    }

    this.coinText.setText(`${level.coins}`);
    this.timerText.setText(formatClock(level.elapsedMs));

    // Boss 血条
    const boss = level.boss;
    const showBoss = boss !== null && boss.engaged && boss.hp > 0;
    this.bossBar.setVisible(showBoss);
    if (boss && showBoss) {
      this.bossFill.setScale(Math.max(0, boss.hp / boss.maxHp), 1);
    }

    // 受击红闪
    const target = player.invulnerable ? 0.16 : 0;
    this.redOverlay.setAlpha(this.redOverlay.alpha + (target - this.redOverlay.alpha) * 0.18);

    // 补给机交互提示：靠近且商店未开时显示
    this.merchantPrompt.setVisible(!this.shopOpen && level.nearMerchant());

    // 低血量警示：≤25% 红晕脉冲，跨阈值鸣警报一次（回升复位，可重复警示）
    const lowHp = player.hp > 0 && player.hp / player.config.hp <= 0.25;
    if (lowHp && !this.lowHpWarned) {
      this.lowHpWarned = true;
      Sfx.lowHp();
    } else if (!lowHp) {
      this.lowHpWarned = false;
    }
    const vignette = lowHp ? 0.14 + Math.sin(time / 180) * 0.06 : 0;
    this.lowHpOverlay.setAlpha(
      this.lowHpOverlay.alpha + (vignette - this.lowHpOverlay.alpha) * 0.15,
    );

    // 关卡进度条：换关重建刻度，玩家金点逐帧跟随
    if (this.stripLevel !== level) {
      this.buildProgressStrip(level);
      this.stripLevel = level;
    }
    this.progressDot.x = 320 * Math.max(0, Math.min(1, player.x / level.L.worldWidth));

    // Boss 入场对话打字机
    this.dialogue.update(delta);
  }

  /** 进度条刻度（世界坐标 → 320px 条带）：检查点绿 / 商人金 / Boss 门红，末点为玩家金点。
   * y=56：顶部操作提示行（~43 止）与 Boss 血条名（~73 起）之间的空带，避免文字叠压 */
  private buildProgressStrip(level: BaseLevelScene): void {
    this.progressContainer?.destroy();
    const L = level.L;
    const W = 320;
    this.progressContainer = this.add.container(GAME.width / 2 - W / 2, 56);
    const mark = (x: number, w: number, h: number, color: number): void => {
      this.progressContainer?.add(this.add.rectangle(x, 0, w, h, color).setOrigin(0, 0.5));
    };
    mark(0, W, 4, 0x1a1d24);
    for (const cp of L.checkpoints) mark((W * cp.x) / L.worldWidth - 1.5, 3, 9, 0x67e26a);
    for (const m of L.merchants) mark((W * m.x) / L.worldWidth - 1.5, 3, 9, 0xffd23e);
    mark((W * L.doorX) / L.worldWidth - 2, 4, 11, 0xff5544);
    this.progressDot = this.add.circle(0, 0, 4, 0xffe08a).setStrokeStyle(1, 0x1a1d24);
    this.progressContainer.add(this.progressDot);
  }
}
