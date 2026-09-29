/** 小游戏集合：选择面板 + 猜方向 / 比大小 / 接星星 / 拍便便。奖励结算通过钩子交还 GameScene。 */

import Phaser from "phaser";
import {
  C,
  GAME_HEIGHT,
  GAME_WIDTH,
  GUESS_REVEAL_MS,
  GUESS_ROUNDS,
  GUESS_WIN_NEEDED,
  WHACK_HITS_TO_WIN,
  WHACK_POPS,
} from "../config";
import { sfxGuessRight, sfxGuessWrong } from "../audio";
import { TEX } from "../textures";
import { clamp, randInt, randRange } from "../util";
import { gameText, makeButton, setBtnEnabled } from "./widgets";

export interface MiniGamesHooks {
  /** 猜方向要转向/按压的宠物精灵 */
  petSprite: () => Phaser.GameObjects.Image | null;
  /** 宠物成长阶段 1-5:阶段越高小游戏越快、区域越窄 */
  stage: () => number;
  burst: (texture: string, x: number, y: number, count: number) => void;
  /** 公共结算：属性收益 / 亲密度 / 金币都在 GameScene */
  finish: (win: boolean, winLine: string, loseLine: string) => void;
  /** 底排按钮可用性刷新 */
  refresh: () => void;
}

export class MiniGames {
  private scene: Phaser.Scene;
  private hooks: MiniGamesHooks;
  private selPanel: Phaser.GameObjects.Container;
  private playing = false;

  // —— 猜方向 ——
  private guessPanel: Phaser.GameObjects.Container;
  private guessPips: Phaser.GameObjects.Image[] = [];
  private guessResult!: Phaser.GameObjects.Text;
  private guessArrowBtns: Phaser.GameObjects.Container[] = [];
  private guessRound = 0;
  private guessScore = 0;
  private guessPhase: "idle" | "choose" | "reveal" = "idle";

  // —— 比大小 ——
  private numPanel: Phaser.GameObjects.Container;
  private numValueText!: Phaser.GameObjects.Text;
  private numStatusText!: Phaser.GameObjects.Text;
  private numPips: Phaser.GameObjects.Image[] = [];
  private numRound = 0;
  private numScore = 0;
  private numCur = 0;
  private numResolving = false;

  // —— 接星星 ——
  private timePanel: Phaser.GameObjects.Container;
  private timeZone!: Phaser.GameObjects.Rectangle;
  private timeMarker!: Phaser.GameObjects.Image;
  private timeStatusText!: Phaser.GameObjects.Text;
  private timePips: Phaser.GameObjects.Image[] = [];
  private timeRound = 0;
  private timeScore = 0;
  private timeDir = 1;
  private timeSpeed = 160;
  private timeZoneCenter = 240;
  /** 亮区半宽,随阶段收窄 */
  private zoneHalf = 32;
  private timeResolving = false;
  private timeSwing = false;

  // —— 拍便便 ——
  private whackPanel: Phaser.GameObjects.Container;
  private whackStatusText!: Phaser.GameObjects.Text;
  private whackPips: Phaser.GameObjects.Image[] = [];
  private whackPoop!: Phaser.GameObjects.Image;
  private whackRunning = false;
  private whackUp = false;
  private whackAwaitSec = 0;
  private whackPopsLeft = 0;
  private whackHits = 0;
  private readonly whackSlots = [150, 240, 330] as const;

  constructor(scene: Phaser.Scene, hooks: MiniGamesHooks) {
    this.scene = scene;
    this.hooks = hooks;
    this.selPanel = this.buildSelect();
    this.guessPanel = this.buildGuess();
    this.numPanel = this.buildNum();
    this.timePanel = this.buildTiming();
    this.whackPanel = this.buildWhack();
  }

  isActive(): boolean {
    return this.playing;
  }

  openSelect(): void {
    this.selPanel.setVisible(true);
    this.playing = true;
    this.hooks.refresh();
  }

  closeAll(): void {
    this.selPanel.setVisible(false);
    this.guessPanel.setVisible(false);
    this.numPanel.setVisible(false);
    this.timePanel.setVisible(false);
    this.whackPanel.setVisible(false);
    this.playing = false;
    this.timeSwing = false;
    this.whackRunning = false;
    this.whackUp = false;
    this.whackPoop.setVisible(false);
  }

  update(dt: number): void {
    this.updateTiming(dt);
    this.updateWhack(dt);
  }

  /** 从选择面板进入某个玩法（公开供 E2E 驱动） */
  launch(start: () => void): void {
    this.selPanel.setVisible(false);
    this.playing = true;
    start();
    this.hooks.refresh();
  }

  startGuess(): void {
    this.launch(() => {
      this.guessRound = 0;
      this.guessScore = 0;
      this.guessPhase = "choose";
      for (const pip of this.guessPips) pip.setTexture(TEX.heartS0);
      this.guessResult.setText("");
      this.guessPanel.setVisible(true);
      this.hooks.petSprite()?.setFlipX(false);
    });
  }

  startNum(): void {
    this.launch(() => {
      this.numRound = 0;
      this.numScore = 0;
      this.numResolving = false;
      this.numCur = randInt(1, 99);
      this.resetPips(this.numPips);
      this.numValueText.setText(String(this.numCur)).setColor("#5b3a21");
      this.numStatusText.setText("下一张牌会更大吗？");
      this.numPanel.setVisible(true);
    });
  }

  startTiming(): void {
    this.launch(() => {
      this.timeRound = 0;
      this.timeScore = 0;
      this.timeResolving = false;
      this.timeSwing = true;
      this.timeDir = 1;
      // 难度分层:阶段越高起步越快、亮区越窄
      this.timeSpeed = 130 + this.hooks.stage() * 25;
      this.zoneHalf = Math.max(20, 36 - this.hooks.stage() * 3);
      this.timeZone.width = this.zoneHalf * 2;
      this.timeMarker.setPosition(240, 344);
      this.randomizeTimeZone();
      this.resetPips(this.timePips);
      this.timeStatusText.setText("让星星停进亮区里");
      this.timePanel.setVisible(true);
    });
  }

  startWhack(): void {
    this.launch(() => {
      this.whackRunning = true;
      this.whackUp = false;
      this.whackHits = 0;
      this.whackPopsLeft = WHACK_POPS;
      this.whackAwaitSec = 0.6;
      this.resetPips(this.whackPips);
      this.whackStatusText.setText(`便便冒头时点它 ${WHACK_HITS_TO_WIN} 次！`);
      this.whackPoop.setVisible(false);
      this.whackPanel.setVisible(true);
    });
  }

  onGuess(side: "left" | "right"): void {
    if (!this.playing || this.guessPhase !== "choose") return;
    this.guessPhase = "reveal";
    for (const btn of this.guessArrowBtns) setBtnEnabled(btn, false);
    const pet = this.hooks.petSprite();
    const answer = Math.random() < 0.5 ? "left" : "right";
    pet?.setFlipX(answer === "left");
    if (pet) {
      this.scene.tweens.add({ targets: pet, scaleY: 3 * 0.88, duration: 120, yoyo: true });
    }
    const correct = side === answer;
    if (correct) {
      this.guessScore++;
      sfxGuessRight();
      if (this.guessPips[this.guessRound]) this.guessPips[this.guessRound].setTexture(TEX.heartS);
      this.guessResult.setText("猜对啦！");
      const p = this.hooks.petSprite();
      if (p) this.hooks.burst(TEX.note, p.x, p.y - 130, 4);
    } else {
      sfxGuessWrong();
      this.guessResult.setText("猜错了…");
      const p = this.hooks.petSprite();
      if (p) this.hooks.burst(TEX.sweat, p.x, p.y - 130, 2);
    }
    this.guessRound++;
    this.scene.time.delayedCall(GUESS_REVEAL_MS, () => {
      if (this.guessRound >= GUESS_ROUNDS) {
        const win = this.guessScore >= GUESS_WIN_NEEDED;
        this.guessPanel.setVisible(false);
        this.hooks.finish(win, "玩得开心极了！", "虽然输了，也挺开心的");
      } else {
        this.guessPhase = "choose";
        this.guessResult.setText("");
        this.hooks.petSprite()?.setFlipX(false);
        for (const btn of this.guessArrowBtns) setBtnEnabled(btn, true);
      }
    });
  }

  onNumPick(guessHigh: boolean): void {
    if (!this.playing || this.numResolving) return;
    this.numResolving = true;
    let next = randInt(1, 99);
    while (next === this.numCur) next = randInt(1, 99);
    const correct = guessHigh ? next > this.numCur : next < this.numCur;
    if (correct) {
      this.numScore++;
      sfxGuessRight();
      if (this.numPips[this.numRound]) this.numPips[this.numRound].setTexture(TEX.heartS);
    } else {
      sfxGuessWrong();
    }
    this.numValueText.setText(String(next)).setColor(correct ? "#2ed573" : "#d63031");
    this.scene.tweens.add({ targets: this.numValueText, scale: 1.25, duration: 140, yoyo: true });
    this.numStatusText.setText(correct ? "猜对啦！" : "猜错了…");
    this.numRound++;
    this.scene.time.delayedCall(900, () => {
      if (this.numRound >= GUESS_ROUNDS) {
        this.numPanel.setVisible(false);
        this.hooks.finish(this.numScore >= GUESS_WIN_NEEDED, "手气真棒！", "差一点点，再来！");
        return;
      }
      this.numCur = next;
      this.numResolving = false;
      this.numValueText.setText(String(next)).setColor("#5b3a21");
      this.numStatusText.setText("下一张牌会更大吗？");
    });
  }

  onTimingAttempt(): void {
    if (!this.playing || this.timeResolving) return;
    this.timeResolving = true;
    const hit = Math.abs(this.timeMarker.x - this.timeZoneCenter) <= this.zoneHalf;
    if (hit) {
      this.timeScore++;
      sfxGuessRight();
      if (this.timePips[this.timeRound]) this.timePips[this.timeRound].setTexture(TEX.heartS);
      this.timeStatusText.setText("接住了！");
      this.hooks.burst(TEX.sparkle, this.timeMarker.x, 344, 4);
    } else {
      sfxGuessWrong();
      this.timeStatusText.setText("差了一点…");
    }
    this.timeRound++;
    this.scene.time.delayedCall(800, () => {
      if (this.timeRound >= GUESS_ROUNDS) {
        this.timePanel.setVisible(false);
        this.hooks.finish(this.timeScore >= GUESS_WIN_NEEDED, "眼疾手快！", "星星溜走了…");
        return;
      }
      this.timeSpeed += 45;
      this.randomizeTimeZone();
      this.timeResolving = false;
      this.timeStatusText.setText("让星星停进亮区里");
    });
  }

  onWhackHit(): void {
    if (!this.whackRunning || !this.whackUp) return;
    this.whackHits++;
    sfxGuessRight();
    if (this.whackPips[this.whackHits - 1]) {
      this.whackPips[this.whackHits - 1].setTexture(TEX.heartS);
    }
    this.hooks.burst(TEX.sparkle, this.whackPoop.x, this.whackPoop.y - 30, 5);
    this.whackStatusText.setText(`拍中 ${this.whackHits} 次！`);
    this.whackPoop.setVisible(false);
    this.whackUp = false;
    this.whackAwaitSec = randRange(0.35, 0.6) * this.whackFactor();
    this.endWhackIfDone();
  }

  // ———— 内部 ————

  private resetPips(pips: Phaser.GameObjects.Image[]): void {
    for (const pip of pips) pip.setTexture(TEX.heartS0);
  }

  private randomizeTimeZone(): void {
    this.timeZoneCenter = randRange(136, 344);
    this.timeZone.setPosition(this.timeZoneCenter - this.zoneHalf, 344);
  }

  private updateTiming(dt: number): void {
    if (!this.timeSwing) return;
    let x = this.timeMarker.x + this.timeDir * this.timeSpeed * dt;
    if (x >= 370) {
      x = 370;
      this.timeDir = -1;
    } else if (x <= 110) {
      x = 110;
      this.timeDir = 1;
    }
    this.timeMarker.x = x;
  }

  /** 拍便便节奏倍率:阶段越高便便缩头越快 */
  private whackFactor(): number {
    return Math.max(0.6, 1 - (this.hooks.stage() - 1) * 0.1);
  }

  private updateWhack(dt: number): void {
    if (!this.whackRunning) return;
    this.whackAwaitSec -= dt;
    if (this.whackAwaitSec > 0) return;
    if (this.whackUp) {
      // 没拍到，缩回去
      this.whackPoop.setVisible(false);
      this.whackUp = false;
      this.whackAwaitSec = randRange(0.35, 0.7) * this.whackFactor();
      this.endWhackIfDone();
    } else if (this.whackPopsLeft > 0) {
      this.popWhackPoop();
    }
  }

  private popWhackPoop(): void {
    this.whackPopsLeft--;
    const slot = this.whackSlots[Math.floor(Math.random() * this.whackSlots.length)];
    this.whackPoop.setTexture(Math.random() < 0.5 ? TEX.poop0 : TEX.poop1);
    this.whackPoop.setPosition(slot, 378).setVisible(true).setScale(2.6, 0.4);
    this.scene.tweens.add({ targets: this.whackPoop, scaleY: 2.6, duration: 110 });
    this.whackUp = true;
    // 冒头时间随进度与阶段越来越短
    const base = clamp(1.05 - (WHACK_POPS - this.whackPopsLeft) * 0.07, 0.55, 1.05);
    this.whackAwaitSec = base * this.whackFactor();
  }

  private endWhackIfDone(): void {
    if (this.whackRunning && this.whackPopsLeft <= 0 && !this.whackUp) {
      this.whackRunning = false;
      this.scene.time.delayedCall(650, () => {
        this.whackPanel.setVisible(false);
        this.hooks.finish(
          this.whackHits >= WHACK_HITS_TO_WIN,
          "拍得干脆利落！",
          "便便太滑了，没拍够…",
        );
      });
    }
  }

  // ———— 面板构建 ————

  private buildSelect(): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0).setDepth(130).setVisible(false);
    const dim = this.dim();
    const dialog = this.scene.add.image(GAME_WIDTH / 2, 330, TEX.dialog);
    const title = gameText(this.scene, GAME_WIDTH / 2, 266, "玩点什么？", 26, "#5b3a21", {
      depth: 131,
    });
    const games = [
      { label: "猜方向", x: 168, y: 322, run: () => this.startGuess() },
      { label: "比大小", x: 312, y: 322, run: () => this.startNum() },
      { label: "接星星", x: 168, y: 382, run: () => this.startTiming() },
      { label: "拍便便", x: 312, y: 382, run: () => this.startWhack() },
    ];
    const btns = games.map((g) =>
      makeButton(this.scene, g.x, g.y, { label: g.label, scale: 0.82, onClick: g.run }),
    );
    const cancel = makeButton(this.scene, GAME_WIDTH / 2, 448, {
      label: "先不玩了",
      scale: 0.82,
      onClick: () => {
        this.selPanel.setVisible(false);
        this.playing = false;
        this.hooks.refresh();
      },
    });
    c.add([dim, dialog, title, ...btns, cancel]);
    return c;
  }

  private buildGuess(): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0).setDepth(130).setVisible(false);
    const dim = this.dim();
    const dialog = this.scene.add.image(GAME_WIDTH / 2, 330, TEX.dialog).setScale(1.08);
    const title = gameText(this.scene, GAME_WIDTH / 2, 262, "它会看向哪边？", 26, "#5b3a21", {
      depth: 131,
    });
    const hint = gameText(
      this.scene,
      GAME_WIDTH / 2,
      296,
      `连对 ${GUESS_WIN_NEEDED} 回合就赢啦`,
      16,
      "#8a6a4a",
      { depth: 131 },
    );
    const left = makeButton(this.scene, 150, 356, {
      label: "◀ 左边",
      onClick: () => this.onGuess("left"),
    });
    const right = makeButton(this.scene, 330, 356, {
      label: "右边 ▶",
      onClick: () => this.onGuess("right"),
    });
    for (let i = 0; i < GUESS_ROUNDS; i++) {
      this.guessPips.push(
        this.scene.add
          .image(240 + (i - (GUESS_ROUNDS - 1) / 2) * 26, 412, TEX.heartS0)
          .setDepth(131),
      );
    }
    this.guessResult = gameText(this.scene, GAME_WIDTH / 2, 448, "", 20, "#5b3a21", { depth: 131 });
    c.add([dim, dialog, title, hint, left, right, ...this.guessPips, this.guessResult]);
    this.guessArrowBtns = [left, right];
    return c;
  }

  private buildNum(): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0).setDepth(130).setVisible(false);
    const dim = this.dim();
    const dialog = this.scene.add.image(GAME_WIDTH / 2, 330, TEX.dialog).setScale(1.12);
    const title = gameText(this.scene, GAME_WIDTH / 2, 256, "比大小", 26, "#5b3a21", {
      depth: 131,
    });
    const status = gameText(this.scene, GAME_WIDTH / 2, 292, "下一张牌会更大吗？", 16, "#8a6a4a", {
      depth: 131,
    });
    const value = gameText(this.scene, GAME_WIDTH / 2, 344, "-", 46, "#5b3a21", { depth: 131 });
    const high = makeButton(this.scene, 150, 400, {
      label: "▲ 更大",
      onClick: () => this.onNumPick(true),
    });
    const low = makeButton(this.scene, 330, 400, {
      label: "▼ 更小",
      onClick: () => this.onNumPick(false),
    });
    for (let i = 0; i < GUESS_ROUNDS; i++) {
      this.numPips.push(
        this.scene.add
          .image(240 + (i - (GUESS_ROUNDS - 1) / 2) * 26, 442, TEX.heartS0)
          .setDepth(131),
      );
    }
    c.add([dim, dialog, title, status, value, high, low, ...this.numPips]);
    this.numValueText = value;
    this.numStatusText = status;
    return c;
  }

  private buildTiming(): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0).setDepth(130).setVisible(false);
    const dim = this.dim();
    const dialog = this.scene.add.image(GAME_WIDTH / 2, 330, TEX.dialog).setScale(1.12);
    const title = gameText(this.scene, GAME_WIDTH / 2, 256, "接住星星！", 26, "#5b3a21", {
      depth: 131,
    });
    const status = gameText(this.scene, GAME_WIDTH / 2, 290, "让星星停进亮区里", 16, "#8a6a4a", {
      depth: 131,
    });
    const bar = this.scene.add
      .rectangle(100, 344, 280, 16, C.barBack)
      .setOrigin(0, 0.5)
      .setDepth(131);
    this.timeZone = this.scene.add
      .rectangle(this.timeZoneCenter - 32, 344, 64, 16, C.mid)
      .setOrigin(0, 0.5)
      .setDepth(132);
    this.timeMarker = this.scene.add.image(240, 344, TEX.sparkle).setScale(1.8).setDepth(133);
    const grab = makeButton(this.scene, GAME_WIDTH / 2, 400, {
      label: "接住！",
      scale: 0.9,
      onClick: () => this.onTimingAttempt(),
    });
    for (let i = 0; i < GUESS_ROUNDS; i++) {
      this.timePips.push(
        this.scene.add
          .image(240 + (i - (GUESS_ROUNDS - 1) / 2) * 26, 442, TEX.heartS0)
          .setDepth(131),
      );
    }
    c.add([
      dim,
      dialog,
      title,
      status,
      bar,
      this.timeZone,
      this.timeMarker,
      grab,
      ...this.timePips,
    ]);
    this.timeStatusText = status;
    return c;
  }

  private buildWhack(): Phaser.GameObjects.Container {
    const c = this.scene.add.container(0, 0).setDepth(130).setVisible(false);
    const dim = this.dim();
    const dialog = this.scene.add.image(GAME_WIDTH / 2, 330, TEX.dialog).setScale(1.12);
    const title = gameText(this.scene, GAME_WIDTH / 2, 256, "拍拍便便！", 26, "#5b3a21", {
      depth: 131,
    });
    const status = gameText(
      this.scene,
      GAME_WIDTH / 2,
      290,
      `便便冒头时点它 ${WHACK_HITS_TO_WIN} 次！`,
      16,
      "#8a6a4a",
      { depth: 131 },
    );
    const holes = this.whackSlots.map((x) =>
      this.scene.add.rectangle(x, 378, 64, 12, C.barBack).setOrigin(0.5, 1).setDepth(131),
    );
    const poop = this.scene.add
      .image(240, 378, TEX.poop0)
      .setOrigin(0.5, 1)
      .setScale(2.6)
      .setDepth(132)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });
    poop.on("pointerdown", () => this.onWhackHit());
    for (let i = 0; i < WHACK_HITS_TO_WIN; i++) {
      this.whackPips.push(
        this.scene.add
          .image(240 + (i - (WHACK_HITS_TO_WIN - 1) / 2) * 26, 404, TEX.heartS0)
          .setDepth(131),
      );
    }
    c.add([dim, dialog, title, status, ...holes, ...this.whackPips, poop]);
    this.whackStatusText = status;
    this.whackPoop = poop;
    return c;
  }

  private dim(): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55)
      .setInteractive();
  }
}
