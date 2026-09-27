import type { Enemy } from "../entities/Enemy";
import type { BossPhaseDef } from "../data/boss";

/** Boss 阶段机：按 hp 比例判定当前阶段，只在跨过阈值向上时报告切换（招式表按 Boss 种类泛型） */
export class BossPhaseMachine<B extends Enemy> {
  private index = 0;
  private readonly defs: BossPhaseDef<B>[];

  constructor(defs: BossPhaseDef<B>[]) {
    this.defs = defs;
  }

  get phaseIndex(): number {
    return this.index;
  }

  get current(): BossPhaseDef<B> {
    return this.defs[this.index];
  }

  /** 命中后调用；返回 >0 表示切换到的新阶段索引（本作阶段只升不降） */
  onHpFraction(fraction: number): number {
    // 阶段 i 覆盖 (until[i+1], until[i]]，从高往低找第一个 fraction <= until
    let target = 0;
    for (let i = this.defs.length - 1; i >= 0; i--) {
      if (fraction <= this.defs[i].until) {
        target = i;
        break;
      }
    }
    if (target > this.index) {
      this.index = target;
      return target;
    }
    return -1;
  }
}
