import Phaser from "phaser";
import type { Player } from "../entities/Player";
import type { Projectile } from "../entities/Projectile";
import type { Enemy } from "../entities/Enemy";

const HIT_STOP_MS = 60;
const HIT_STOP_SCALE = 2.5;

/**
 * 战斗系统薄层：持有敌人与弹体列表，每帧做接触伤害/弹幕命中/突进撞击结算。
 * 玩家侧的受击（无敌帧/击退/红闪）仍在 Player.damage 内。
 */
export class CombatSystem {
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  private dashHit = new Set<Enemy>();
  private scene: Phaser.Scene | null = null;
  private hitStopActive = false;

  /** 场景创建后注入（hit-stop 需要 physics.world） */
  attach(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  /** 命中微冻结：短暂放慢物理，增强打击感；死亡重置时强制恢复 */
  private hitStop(): void {
    if (!this.scene || this.hitStopActive) return;
    this.hitStopActive = true;
    const world = this.scene.physics.world;
    world.timeScale = HIT_STOP_SCALE;
    this.scene.time.delayedCall(HIT_STOP_MS, () => {
      this.hitStopActive = false;
      world.timeScale = 1;
    });
  }

  /** 死亡/坠落重置时调用，确保物理恢复正常速度 */
  resetTimeScale(): void {
    this.hitStopActive = false;
    if (this.scene) this.scene.physics.world.timeScale = 1;
  }

  addEnemy(enemy: Enemy): void {
    this.enemies.push(enemy);
  }

  /** 场景挂载的 CombatSystem 实例：深层实体拿不到场景引用时经此查找（Projectile/Boss 召唤/技能结算） */
  static get(scene: Phaser.Scene): CombatSystem | undefined {
    return (scene as unknown as { combat?: CombatSystem }).combat;
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p);
  }

  removeProjectile(p: Projectile): void {
    const i = this.projectiles.indexOf(p);
    if (i !== -1) this.projectiles.splice(i, 1);
  }

  clearEnemies(): void {
    for (const e of this.enemies) e.destroy();
    this.enemies.length = 0;
  }

  clearProjectiles(): void {
    for (const p of this.projectiles.slice()) p.destroy();
  }

  aliveCount(): number {
    return this.enemies.filter((e) => !e.dead).length;
  }

  enemiesInRadius(x: number, y: number, radius: number): Enemy[] {
    return this.enemies.filter(
      (e) => !e.dead && Phaser.Math.Distance.Between(x, y, e.x, e.y) < radius,
    );
  }

  /** 近战矩形判定，返回命中数 */
  meleeHit(rect: Phaser.Geom.Rectangle, damage: number): number {
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Phaser.Geom.Rectangle.Overlaps(rect, e.bounds())) {
        e.hit(damage, rect.centerX);
        hits++;
      }
    }
    if (hits > 0) this.hitStop();
    return hits;
  }

  update(player: Player, time: number, delta: number): void {
    const pRect = player.bounds();

    for (const e of this.enemies) {
      if (e.dead) continue;
      e.tick(player, time, delta);
      if (Phaser.Geom.Rectangle.Overlaps(pRect, e.bounds())) {
        player.damage(e.touchDamage, e.x);
      }
    }

    // 狼突进撞击：每次突进每个敌人只结算一次
    if (player.isDashing(time)) {
      for (const e of this.enemies) {
        if (e.dead || this.dashHit.has(e)) continue;
        if (Phaser.Geom.Rectangle.Overlaps(pRect, e.bounds())) {
          this.dashHit.add(e);
          e.hit(player.config.skill.damage, player.x);
          this.hitStop();
        }
      }
    } else {
      this.dashHit.clear();
    }

    // 弹幕命中：玩家弹打敌人，敌人弹打玩家
    for (const p of this.projectiles.slice()) {
      if (!p.active) continue;
      const r = p.bounds();
      if (p.fromPlayer) {
        for (const e of this.enemies) {
          if (!e.dead && Phaser.Geom.Rectangle.Overlaps(r, e.bounds())) {
            e.hit(p.damage, p.x);
            this.hitStop();
            p.destroy();
            break;
          }
        }
      } else if (Phaser.Geom.Rectangle.Overlaps(r, pRect)) {
        player.damage(p.damage, p.x);
        p.destroy();
      }
    }
  }
}
