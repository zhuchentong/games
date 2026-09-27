import Phaser from "phaser";

/** 键盘输入封装：←→/AD 移动，空格/W/↑ 跳，J 普攻，K 技能，Shift 翻滚，E 交互，Q 取消 */
export class InputManager {
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    for (const code of [
      "LEFT",
      "A",
      "RIGHT",
      "D",
      "SPACE",
      "W",
      "UP",
      "DOWN",
      "J",
      "K",
      "SHIFT",
      "E",
      "Q",
    ]) {
      this.keys.set(code, kb.addKey(code));
    }
  }

  private anyDown(codes: string[]): boolean {
    return codes.some((c) => this.keys.get(c)?.isDown === true);
  }

  private anyJustDown(codes: string[]): boolean {
    return codes.some((c) => {
      const key = this.keys.get(c);
      return key ? Phaser.Input.Keyboard.JustDown(key) : false;
    });
  }

  /** 水平方向：-1 左 / 1 右 / 0 不动 */
  axisX(): number {
    return (this.anyDown(["RIGHT", "D"]) ? 1 : 0) - (this.anyDown(["LEFT", "A"]) ? 1 : 0);
  }

  /** 跳跃键按住中（鸟滑翔用） */
  jumpHeld(): boolean {
    return this.anyDown(["SPACE", "W", "UP"]);
  }

  /** 本帧跳跃键刚按下（三键任一，每帧只读一次） */
  jumpJustDown(): boolean {
    return this.anyJustDown(["SPACE", "W", "UP"]);
  }

  attackJustDown(): boolean {
    return this.anyJustDown(["J"]);
  }

  skillJustDown(): boolean {
    return this.anyJustDown(["K"]);
  }

  rollJustDown(): boolean {
    return this.anyJustDown(["SHIFT"]);
  }

  /** 交互键（E）：靠近补给机打开商店 / 商店内购买 */
  interactJustDown(): boolean {
    return this.anyJustDown(["E"]);
  }

  /** 取消键（Q）：关闭商店 */
  cancelJustDown(): boolean {
    return this.anyJustDown(["Q"]);
  }

  /** 商店菜单上移（W/↑ 与跳跃同键：商店开启时玩家不 tick，无冲突） */
  menuUpJustDown(): boolean {
    return this.anyJustDown(["W", "UP"]);
  }

  /** 商店菜单下移（S/↓） */
  menuDownJustDown(): boolean {
    return this.anyJustDown(["S", "DOWN"]);
  }
}
