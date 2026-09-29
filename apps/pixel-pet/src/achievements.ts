/** 成就定义与发放：基于跨宠物档案(统计/图鉴)与当前宠物状态判定,解锁发金币。 */

import { DAY_MS, bondLevelOf } from "./config";
import { ProfileStore, type PetProfile } from "./systems/ProfileStore";
import type { PetSave } from "./systems/SaveManager";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** 解锁奖励金币 */
  reward: number;
  check: (ctx: { profile: PetProfile; pet: PetSave | null; now: number }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_hatch",
    name: "初次相遇",
    desc: "孵化第一只宠物",
    reward: 0,
    check: ({ profile }) => profile.stats.hatched >= 1,
  },
  {
    id: "hatch_5",
    name: "缘分多多",
    desc: "累计孵化 5 只宠物",
    reward: 20,
    check: ({ profile }) => profile.stats.hatched >= 5,
  },
  {
    id: "bond_lv3",
    name: "情谊渐浓",
    desc: "亲密度达到 ♥3",
    reward: 10,
    check: ({ pet }) => pet !== null && bondLevelOf(pet.bond) >= 3,
  },
  {
    id: "bond_lv5",
    name: "心有灵犀",
    desc: "亲密度达到 ♥5",
    reward: 30,
    check: ({ pet }) => pet !== null && bondLevelOf(pet.bond) >= 5,
  },
  {
    id: "final_good",
    name: "神兽降世",
    desc: "养成一只神兽最终形态",
    reward: 30,
    check: ({ pet }) => pet !== null && pet.stage === 5 && pet.branch === "good",
  },
  {
    id: "dex_12",
    name: "收藏家",
    desc: "图鉴收集 12 种形态",
    reward: 20,
    check: ({ profile }) => profile.dex.length >= 12,
  },
  {
    id: "dex_all",
    name: "图鉴大师",
    desc: "集齐全部 24 种形态",
    reward: 100,
    check: ({ profile }) => profile.dex.length >= 24,
  },
  {
    id: "win_20",
    name: "常胜将军",
    desc: "小游戏累计获胜 20 次",
    reward: 20,
    check: ({ profile }) => profile.stats.wins >= 20,
  },
  {
    id: "feed_50",
    name: "大厨之手",
    desc: "累计喂食 50 次",
    reward: 20,
    check: ({ profile }) => profile.stats.fed >= 50,
  },
  {
    id: "clean_30",
    name: "环境大师",
    desc: "累计打扫 30 次",
    reward: 10,
    check: ({ profile }) => profile.stats.cleaned >= 30,
  },
  {
    id: "pat_100",
    name: "摸头之交",
    desc: "累计摸头 100 次",
    reward: 30,
    check: ({ profile }) => profile.stats.patted >= 100,
  },
  {
    id: "old_friend",
    name: "长长久久",
    desc: "单只宠物照顾满 10 个游戏日",
    reward: 20,
    check: ({ pet, now }) => pet !== null && (now - pet.bornAt) / DAY_MS >= 10,
  },
];

/** 检查并发放新成就;返回本次新解锁的列表(已入账金币) */
export function grantAchievements(pet: PetSave | null): AchievementDef[] {
  const profile = ProfileStore.load();
  const now = Date.now();
  const unlocked: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (profile.achievements.includes(def.id)) continue;
    if (def.check({ profile, pet, now })) {
      unlocked.push(def);
      profile.achievements.push(def.id);
      profile.coins += def.reward;
    }
  }
  if (unlocked.length > 0) ProfileStore.save(profile);
  return unlocked;
}

export function achievementOf(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
