import Phaser from "phaser";
import type { LavaPitDef } from "../data/levels";
import { burst } from "../systems/Fx";
import { Sfx } from "../systems/Sfx";
import type { Player } from "./Player";

/** 坠入岩浆的伤害 */
const LAVA_DAMAGE = 14;
/** 岩浆弹起初速：足够把玩家弹出坑口回到地面 */
const LAVA_POP_VELOCITY = -580;
/**
 * 岩浆面相对地面顶的下沉深度。世界可视高度到 groundTop+40 为止（zoom 2 相机下缘 540），
 * 岩浆面必须落在可视带内（500+26=526），再深就看不见坑底、坑会像无底洞
 */
const SURFACE_DEPTH = 26;

/** 熔岩坑：主地面缺口处的岩浆面。坠入受伤并向上弹起（非致死坑，与一关坠落坑区分）；
 * 视觉为滚动岩浆贴图 + 呼吸辉光；伤害走 Player.damage（翻滚/护盾/无敌帧语义全部继承） */
export class LavaPit {
  constructor(scene: Phaser.Scene, def: LavaPitDef, groundTop: number, player: Player) {
    const surfaceY = groundTop + SURFACE_DEPTH;

    const lava = scene.add.tileSprite(def.x, surfaceY, def.w, 14, "lava").setOrigin(0);
    scene.tweens.add({
      targets: lava,
      tilePositionX: 32,
      duration: 900,
      repeat: -1,
    });
    // 表面辉光呼吸
    const glow = scene.add.rectangle(def.x, surfaceY - 2, def.w, 6, 0xff9f1a, 0.35).setOrigin(0);
    scene.tweens.add({
      targets: glow,
      alpha: 0.12,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    const zone = scene.add.zone(def.x + def.w / 2, surfaceY - 8, def.w, 20);
    scene.physics.add.existing(zone, true);
    scene.physics.add.overlap(player, zone, () => {
      const body = player.body as Phaser.Physics.Arcade.Body;
      if (player.invulnerable) {
        // 无敌期不结算伤害但必须弹起：否则玩家会沉底穿过岩浆触发 FALL_Y 坠落重生
        body.setVelocityY(LAVA_POP_VELOCITY);
        return;
      }
      player.damage(LAVA_DAMAGE, player.x);
      // 弹出坑口（覆盖 damage 的击退垂直分量）
      body.setVelocityY(LAVA_POP_VELOCITY);
      Sfx.lava();
      burst(scene, player.x, surfaceY - 6, {
        color: 0xff9f1a,
        count: 5,
        size: 3,
        grow: 12,
        duration: 300,
        spreadX: 10,
        spreadY: 3,
      });
    });
  }
}
