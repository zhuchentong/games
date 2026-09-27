/**
 * 关卡场景键单一来源（刻意零 import 的叶子模块）。
 * HUD 等并行场景不得值导入关卡场景类（Level1→BaseLevelScene→UIScene→Level1 成环，
 * 模块初始化 TDZ 崩溃——历史上真实踩过），只消费这里的字面量；
 * 关卡薄壳子类的 static KEY 与 desc.nextKey 也引用本表，保证四处（子类/UIScene/Boot/选角）永不分叉。
 */
export const LEVEL_SCENE_KEYS = ["Level1", "Level2", "Level3"] as const;

/** 存档关卡序号 → 场景键（越界收敛到首/末关；选角续玩与调试跳转共用） */
export function sceneKeyForLevel(level: number): string {
  const i = Math.min(Math.max(level, 1), LEVEL_SCENE_KEYS.length) - 1;
  return LEVEL_SCENE_KEYS[i];
}
