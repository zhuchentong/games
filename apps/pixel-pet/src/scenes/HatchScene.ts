/** 孵化场景：随机 4 颗蛋任选其一（或随机抽取），孵化演出后进入养育。 */

import Phaser from "phaser";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PERSONALITY_LABEL,
  SPECIES_BY_ID,
  TAG_COLOR,
  TAG_LABEL,
  petTexKey,
  pickEggCandidates,
  type EggCandidate,
} from "../config";
import { sfxClick, sfxCrack, sfxHatchPop, startBgm, stopBgm, unlockAudio } from "../audio";
import { TAG_ICON, TEX, eggTexKey } from "../textures";
import { defaultPet, SaveManager } from "../systems/SaveManager";
import { ProfileStore } from "../systems/ProfileStore";
import { gameText, makeButton } from "./widgets";

const EGG_CX = [72, 184, 296, 408] as const;
const EGG_CY = 296;

interface EggView {
  cand: EggCandidate;
  egg: Phaser.GameObjects.Image;
  crack: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Text;
}

export class HatchScene extends Phaser.Scene {
  private eggs: EggView[] = [];
  private hatching = false;
  /** 孵化出的幼崽（用于两帧待机） */
  private baby: Phaser.GameObjects.Image | null = null;
  private babyFrameTimer = 0;

  constructor() {
    super("hatch");
  }

  create(): void {
    this.eggs = [];
    this.hatching = false;
    this.baby = null;
    this.babyFrameTimer = 0;

    gameText(this, GAME_WIDTH / 2, 96, "选择你的伙伴", 40, "#ffe9a8", {
      stroke: "#5b3a21",
      strokeThickness: 8,
      depth: 10,
    });
    gameText(this, GAME_WIDTH / 2, 148, "每颗蛋里都睡着一只小猫小狗小兔或小鸡", 18, "#fdf3e0", {
      depth: 10,
    });

    const cands = pickEggCandidates(4);
    cands.forEach((cand, i) => {
      const species = SPECIES_BY_ID[cand.speciesId];
      const egg = this.add
        .image(EGG_CX[i], EGG_CY, eggTexKey(cand.speciesId, cand.variant))
        .setScale(3.4)
        .setDepth(5)
        .setInteractive({ useHandCursor: true });
      egg.on("pointerdown", () => this.pick(cand, egg));
      const crack = this.add
        .image(EGG_CX[i], EGG_CY, TEX.crack0)
        .setScale(3.4)
        .setDepth(6)
        .setVisible(false);
      // 物种徽章
      this.add
        .image(EGG_CX[i] - 26, EGG_CY - 58, TAG_ICON[species.tag])
        .setScale(2.2)
        .setDepth(6);
      // 名签
      this.add.rectangle(EGG_CX[i], EGG_CY + 84, 66, 26, TAG_COLOR[species.tag], 0.4).setDepth(5);
      const tag = gameText(this, EGG_CX[i], EGG_CY + 84, "？？？", 18, "#fdf3e0", {
        stroke: "#5b3a21",
        strokeThickness: 4,
        depth: 6,
      });
      // 呼吸浮动
      this.tweens.add({
        targets: egg,
        y: EGG_CY - 5,
        duration: 700 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.eggs.push({ cand, egg, crack, tag });
    });

    makeButton(this, 130, 560, { label: "随机抽取", onClick: () => this.randomPick() });
    makeButton(this, 350, 560, { label: "返回标题", onClick: () => this.scene.start("title") });

    gameText(this, GAME_WIDTH / 2, 636, "性格与配色会影响养成手感，全凭缘分", 15, "#77848f", {
      depth: 10,
    });

    this.events.once("shutdown", () => stopBgm());
    startBgm();
  }

  private randomPick(): void {
    if (this.hatching) return;
    const view = this.eggs[Math.floor(Math.random() * this.eggs.length)];
    this.pick(view.cand, view.egg);
  }

  private pick(cand: EggCandidate, egg: Phaser.GameObjects.Image): void {
    if (this.hatching) return;
    this.hatching = true;
    unlockAudio();
    sfxClick();

    // 其他蛋淡出
    for (const v of this.eggs) {
      if (v.egg !== egg) {
        this.tweens.add({ targets: [v.egg, v.crack, v.tag], alpha: 0.12, duration: 300 });
      }
    }

    const view = this.eggs.find((v) => v.egg === egg)!;
    const shake = this.tweens.add({
      targets: egg,
      angle: { from: -7, to: 7 },
      duration: 90,
      yoyo: true,
      repeat: 5,
    });
    shake.on("complete", () => {
      sfxCrack();
      view.crack.setVisible(true);
      this.time.delayedCall(420, () => {
        sfxCrack();
        view.crack.setTexture(TEX.crack1);
        this.time.delayedCall(420, () => {
          this.tweens.killTweensOf(egg);
          egg.destroy();
          view.crack.destroy();
          view.tag.destroy();
          this.hatch(cand);
        });
      });
    });
  }

  private hatch(cand: EggCandidate): void {
    const species = SPECIES_BY_ID[cand.speciesId];
    const pal = species.palettes[cand.variant];

    const light = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xfff6d8, 0)
      .setDepth(40);
    this.tweens.add({
      targets: light,
      alpha: 0.85,
      duration: 180,
      yoyo: true,
      onComplete: () => light.destroy(),
    });

    this.baby = this.add
      .image(GAME_WIDTH / 2, 300, petTexKey(cand.speciesId, "s1", cand.variant, 0))
      .setScale(0.2)
      .setDepth(41);
    sfxHatchPop();
    this.tweens.add({
      targets: this.baby,
      scale: 3.5,
      duration: 420,
      ease: "Back.easeOut",
    });
    this.add
      .particles(0, 0, TEX.sparkle, {
        x: GAME_WIDTH / 2,
        y: 290,
        speed: { min: 90, max: 240 },
        angle: { min: 200, max: 340 },
        lifespan: 900,
        scale: { start: 1.6, end: 0.2 },
        rotate: { min: -180, max: 180 },
        frequency: 60,
        duration: 1400,
      })
      .setDepth(42);

    this.time.delayedCall(600, () => {
      gameText(this, GAME_WIDTH / 2, 176, "孵出来了！", 34, "#ffffff", {
        stroke: "#5b3a21",
        strokeThickness: 7,
        depth: 42,
      });
      gameText(
        this,
        GAME_WIDTH / 2,
        416,
        species.names.stages[0],
        40,
        `#${pal.main.toString(16).padStart(6, "0")}`,
        { stroke: "#5b3a21", strokeThickness: 8, depth: 42 },
      );
      gameText(
        this,
        GAME_WIDTH / 2,
        456,
        `${TAG_LABEL[species.tag]} · ${PERSONALITY_LABEL[cand.personality]}性格`,
        20,
        "#fdf3e0",
        { stroke: "#5b3a21", strokeThickness: 5, depth: 42 },
      );
      // 谱系传承提示
      const departed = ProfileStore.load().stats.departed;
      if (departed > 0) {
        gameText(this, GAME_WIDTH / 2, 492, `带着 ${departed} 位前辈的祝福出生 ♥`, 16, "#ffe9a8", {
          stroke: "#5b3a21",
          strokeThickness: 4,
          depth: 42,
        });
      }
      const go = makeButton(this, GAME_WIDTH / 2, 540, {
        label: "开始照顾它",
        onClick: () => {
          const fresh = defaultPet(cand.speciesId, cand.variant, cand.personality);
          // 谱系传承:送别过的前辈给新宝宝初始亲密度加成(每只 +5,封顶 25)
          const departed = ProfileStore.load().stats.departed;
          if (departed > 0) fresh.bond = Math.min(25, departed * 5);
          SaveManager.save(fresh);
          // 档案:孵化数 + 幼年形态入图鉴
          ProfileStore.update((p) => {
            p.stats.hatched++;
            const key = `${cand.speciesId}-s1`;
            if (!p.dex.includes(key)) p.dex.push(key);
          });
          this.scene.start("game");
        },
      });
      go.setDepth(42);
    });
  }

  update(_time: number, delta: number): void {
    if (!this.baby) return;
    this.babyFrameTimer += delta;
    if (this.babyFrameTimer >= 500) {
      this.babyFrameTimer = 0;
      const key = this.baby.texture.key;
      // 末尾帧号 0/1 互换
      const next = key.endsWith("0") ? "1" : "0";
      this.baby.setTexture(`${key.slice(0, -1)}${next}`);
    }
  }
}
