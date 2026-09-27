import type Phaser from "phaser";
import { UPGRADE_TRACKS, type UpgradeId } from "../data/upgrades";
import type { Player } from "../entities/Player";
import type { UIScene } from "../scenes/UIScene";
import type { InputManager } from "./InputManager";
import { SaveManager } from "./SaveManager";
import { Sfx } from "./Sfx";

/** 商店宿主（BaseLevelScene 实现）：状态字段留在场景上（E2E 直读写 L.coins 等），行为收在本控制器 */
export interface ShopHost {
  /** 商店期间暂停/恢复物理 */
  readonly physics: Phaser.Physics.Arcade.ArcadePhysics;
  readonly player: Player;
  /** 补给机商店面板所在 HUD 层 */
  readonly hud: UIScene;
  /** 本局齿轮币（E2E 可直接赋值模拟拾币） */
  coins: number;
  /** 商店菜单当前选中行 */
  shopIndex: number;
  /** 三轨升级等级（随存档跨关保留，购买时落盘；场景 create 时从存档恢复） */
  readonly upgradeLevels: Record<UpgradeId, number>;
  /** 是否处于商店交互中（场景 update 据此挂起玩法 tick，防 Boss 战无敌购物） */
  shopOpen: boolean;
}

/** 补给机商店：菜单导航/购买/开关面板，物理暂停与 HUD 驱动都在此，场景只转发输入与状态 */
export class ShopController {
  private readonly host: ShopHost;
  private readonly input: InputManager;

  constructor(host: ShopHost, input: InputManager) {
    this.host = host;
    this.input = input;
  }

  open(): void {
    this.host.shopOpen = true;
    this.host.shopIndex = 0;
    this.host.physics.world.pause();
    (this.host.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.host.hud.showShop(true);
    this.refresh();
  }

  close(): void {
    this.host.shopOpen = false;
    this.host.physics.world.resume();
    this.host.hud.showShop(false);
  }

  /** 商店开启期间由场景 update 转发（此时玩法 tick 已挂起） */
  handleInput(): void {
    if (this.input.cancelJustDown()) {
      this.close();
      return;
    }
    if (this.input.menuUpJustDown()) {
      this.host.shopIndex =
        (this.host.shopIndex + UPGRADE_TRACKS.length - 1) % UPGRADE_TRACKS.length;
      this.refresh();
    }
    if (this.input.menuDownJustDown()) {
      this.host.shopIndex = (this.host.shopIndex + 1) % UPGRADE_TRACKS.length;
      this.refresh();
    }
    if (this.input.interactJustDown()) this.buySelected();
  }

  private buySelected(): void {
    const track = UPGRADE_TRACKS[this.host.shopIndex];
    const lvl = this.host.upgradeLevels[track.id];
    if (lvl >= track.costs.length) return;
    const price = track.costs[lvl];
    if (this.host.coins < price) {
      Sfx.phase(); // 齿轮币不足：低沉拒绝音
      return;
    }
    this.host.coins -= price;
    this.host.upgradeLevels[track.id] = lvl + 1;
    // 升级等级落盘：跨关/续玩后由场景 create 恢复（死亡重生同场景不受影响）
    SaveManager.update((d) => {
      d.upgrades = { ...this.host.upgradeLevels };
    });
    track.apply(this.host.player);
    Sfx.healPickup();
    this.refresh();
  }

  private refresh(): void {
    this.host.hud.refreshShop({
      coins: this.host.coins,
      index: this.host.shopIndex,
      levels: { ...this.host.upgradeLevels },
    });
  }
}
