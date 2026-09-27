/** 与 Phaser/场景无关的纯函数工具 */

/** 三角波往返：elapsedMs 在 periodMs 内线性 0→1 再 1→0（Phaser 4 的 Math 命名空间无 PingPong） */
export function pingPong01(elapsedMs: number, periodMs: number): number {
  const phase = (elapsedMs / periodMs) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

/** 毫秒 → "MM:SS"（HUD 计时/结算用时共用） */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
