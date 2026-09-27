import type { Player } from "../entities/Player";

export type UpgradeId = "hp" | "atk" | "agi";

export interface UpgradeTrack {
  id: UpgradeId;
  name: string;
  desc: string;
  /** 各级价格（index = 当前等级 → 买下一级的花费） */
  costs: number[];
  /** 应用到玩家（config 为本关深拷贝；跨关/续玩后由场景按存档等级重新套用） */
  apply: (player: Player) => void;
}

/** 补给机升级轨：三级制，价格递增；金币上限 22 枚/局，全满需取舍 */
export const UPGRADE_TRACKS: UpgradeTrack[] = [
  {
    id: "hp",
    name: "强健体魄",
    desc: "血量上限 +20，并立即回血 20",
    costs: [3, 12, 22],
    apply: (p) => {
      p.config.hp += 20;
      p.hp = Math.min(p.config.hp, p.hp + 20);
    },
  },
  {
    id: "atk",
    name: "强化武装",
    desc: "普攻伤害 +4，技能伤害 +3",
    costs: [3, 12, 22],
    apply: (p) => {
      p.config.attackDamage += 4;
      p.config.skill.damage += 3;
    },
  },
  {
    id: "agi",
    name: "迅捷之靴",
    desc: "移动速度 +15，跳跃力 +20",
    costs: [3, 12, 22],
    apply: (p) => {
      p.config.speed += 15;
      p.config.jumpVelocity += 20;
    },
  },
];
