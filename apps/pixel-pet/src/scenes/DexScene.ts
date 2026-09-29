/** 图鉴与记录场景：24 种进化形态收集页 + 统计/成就页。数据来自 ProfileStore。 */

import Phaser from "phaser";
import {
  GAME_WIDTH,
  SPECIES,
  TAG_COLOR,
  TAG_LABEL,
  petTexKey,
  stageName,
  type PetForm,
  type SpeciesDef,
} from "../config";
import { ACHIEVEMENTS } from "../achievements";
import { ProfileStore } from "../systems/ProfileStore";
import { gameText, makeButton } from "./widgets";

const FORMS: PetForm[] = ["s1", "s2", "s3", "s4", "s5good", "s5bad"];
const FORM_LABEL: Record<PetForm, string> = {
  s1: "幼年",
  s2: "成长",
  s3: "成熟",
  s4: "完全",
  s5good: "神兽",
  s5bad: "疏忽",
};

function formStage(form: PetForm): number {
  return form === "s5good" || form === "s5bad" ? 5 : Number(form.slice(1));
}

export class DexScene extends Phaser.Scene {
  private dexTab!: Phaser.GameObjects.Container;
  private recTab!: Phaser.GameObjects.Container;
  private footer!: Phaser.GameObjects.Text;

  constructor() {
    super("dex");
  }

  create(): void {
    this.dexTab = this.add.container(0, 0);
    this.recTab = this.add.container(0, 0).setVisible(false);

    gameText(this, GAME_WIDTH / 2, 52, "图鉴与记录", 36, "#ffe9a8", {
      stroke: "#5b3a21",
      strokeThickness: 7,
      depth: 10,
    });

    const profile = ProfileStore.load();

    // —— 图鉴页 ——
    const total = SPECIES.length * FORMS.length;
    const progress = gameText(
      this,
      GAME_WIDTH / 2,
      130,
      `已收集 ${profile.dex.length} / ${total}`,
      18,
      "#9dd6ff",
    );
    this.dexTab.add(progress);
    SPECIES.forEach((species, i) => {
      this.buildSpeciesSection(species, profile.dex, 158 + i * 122);
    });
    this.footer = gameText(this, GAME_WIDTH / 2, 664, "点一格看看它的名字", 15, "#77848f");
    this.dexTab.add(this.footer);

    // —— 记录页 ——
    this.buildRecordsTab(profile);

    // —— 标签与返回 ——
    makeButton(this, 140, 96, {
      label: "图 鉴",
      scale: 0.72,
      onClick: () => this.switchTab(true),
    });
    makeButton(this, 340, 96, {
      label: "记 录",
      scale: 0.72,
      onClick: () => this.switchTab(false),
    });
    makeButton(this, 436, 52, {
      label: "返回",
      scale: 0.62,
      onClick: () => this.scene.start("title"),
    });
    this.switchTab(true);
  }

  private switchTab(dex: boolean): void {
    this.dexTab.setVisible(dex);
    this.recTab.setVisible(!dex);
  }

  private buildSpeciesSection(species: SpeciesDef, dex: string[], yTop: number): void {
    const color = `#${TAG_COLOR[species.tag].toString(16).padStart(6, "0")}`;
    const header = gameText(this, 30, yTop + 8, TAG_LABEL[species.tag], 17, color, {
      originX: 0,
      originY: 0.5,
    });
    this.dexTab.add(header);
    FORMS.forEach((form, j) => {
      const cx = 66 + j * 70;
      const cy = yTop + 66;
      const key = `${species.id}-${form}`;
      const seen = dex.includes(key);
      const cell = this.add.rectangle(cx, cy, 66, 80, seen ? 0x35455c : 0x232c3c);
      cell.setStrokeStyle(1, 0x4a5a72);
      this.dexTab.add(cell);
      if (seen) {
        const sprite = this.add
          .image(cx, cy - 11, petTexKey(species.id, form, 0, 0))
          .setScale(1.05);
        const stage = formStage(form);
        const label = gameText(
          this,
          cx,
          cy + 29,
          FORM_LABEL[form],
          12,
          form === "s5good" ? "#ffd32a" : form === "s5bad" ? "#8f9aa8" : "#c8d6e5",
        );
        this.dexTab.add([sprite, label]);
        cell.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          const name = stageName(species, stage, form === "s5bad" ? "bad" : "good");
          this.footer.setText(`${name} · ${FORM_LABEL[form]}形态`).setColor("#fdf3e0");
        });
      } else {
        const q = gameText(this, cx, cy - 11, "?", 26, "#4a5a72");
        this.dexTab.add(q);
        cell.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
          this.footer.setText("还未遇见…").setColor("#77848f");
        });
      }
    });
  }

  private buildRecordsTab(profile: ReturnType<typeof ProfileStore.load>): void {
    const s = profile.stats;
    const lines = [
      `金币 ${profile.coins}`,
      `孵化 ${s.hatched} 只 · 送别 ${s.departed} 只`,
      `喂食 ${s.fed} 次 · 打扫 ${s.cleaned} 次`,
      `摸头 ${s.patted} 次 · 小游戏 ${s.games} 场胜 ${s.wins} 场`,
    ];
    // 统计块整体下移,避开 y≈96 的标签按钮
    const stats = gameText(this, GAME_WIDTH / 2, 172, lines.join("\n"), 17, "#fdf3e0");
    const achTitle = gameText(
      this,
      GAME_WIDTH / 2,
      272,
      `成就 ${profile.achievements.length} / ${ACHIEVEMENTS.length}`,
      20,
      "#ffe9a8",
    );
    this.recTab.add([stats, achTitle]);
    ACHIEVEMENTS.forEach((def, i) => {
      const got = profile.achievements.includes(def.id);
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 126 + col * 228;
      const y = 312 + row * 54;
      const mark = got ? "✓" : "✗";
      const name = gameText(this, x, y, `${mark} ${def.name}`, 16, got ? "#ffd32a" : "#6a7686");
      const desc = gameText(this, x, y + 22, def.desc, 12, got ? "#c8d6e5" : "#566270");
      this.recTab.add([name, desc]);
    });
  }
}
