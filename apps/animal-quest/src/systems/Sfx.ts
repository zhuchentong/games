/** WebAudio 程序化音效：零外部资源，振荡器 + 音量包络；在首次用户手势（按键）后自动解锁 */
let ctx: AudioContext | null = null;
let muted = false;
/** 全局音量 0~5 档（音效与 BGM 共用），持久化 adl_volume */
let volume = 3;

try {
  muted = window.localStorage.getItem("adl_muted") === "1";
  const v = Number(window.localStorage.getItem("adl_volume"));
  if (Number.isInteger(v) && v >= 0 && v <= 5) volume = v;
} catch {
  // 存储不可用时保持默认开声
}

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freqFrom: number,
  freqTo: number,
  durMs: number,
  type: OscillatorType,
  vol = 0.06,
): void {
  const level = vol * (volume / 5);
  if (muted || level <= 0) return;
  const ac = audio();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t = ac.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + durMs / 1000);
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + durMs / 1000);
  } catch {
    // 音频不可用时静默降级
  }
}

export const Sfx = {
  /** 供 Music 复用同一 AudioContext（浏览器限制并发 context 数，必须共享） */
  context(): AudioContext | null {
    return audio();
  },

  getVolume(): number {
    return volume;
  },

  /** 设定音量档（0~5）并持久化，返回钳制后的档位 */
  setVolume(v: number): number {
    volume = Math.max(0, Math.min(5, Math.round(v)));
    try {
      window.localStorage.setItem("adl_volume", String(volume));
    } catch {
      // 忽略存储失败
    }
    return volume;
  },

  isMuted(): boolean {
    return muted;
  },

  /** 切换静音并持久化，返回切换后状态 */
  toggleMute(): boolean {
    muted = !muted;
    try {
      window.localStorage.setItem("adl_muted", muted ? "1" : "0");
    } catch {
      // 忽略存储失败
    }
    return muted;
  },

  jump(): void {
    tone(320, 660, 120, "square", 0.045);
  },
  /** 弹簧弹射 */
  spring(): void {
    tone(200, 620, 140, "square", 0.05);
  },
  /** 血包拾取：上行双音 */
  healPickup(): void {
    tone(520, 520, 90, "sine", 0.05);
    window.setTimeout(() => tone(780, 780, 140, "sine", 0.05), 90);
  },
  attack(): void {
    tone(880, 220, 90, "sawtooth", 0.04);
  },
  skill(): void {
    tone(500, 960, 160, "triangle", 0.055);
  },
  /** 翻滚：短促下坠呼啸 */
  roll(): void {
    tone(420, 130, 170, "square", 0.045);
  },
  /** 大落差落地闷响（触发阈值由场景按下落速度决定） */
  land(): void {
    tone(160, 70, 110, "triangle", 0.05);
  },
  /** 对话开启/翻页的短水滴音 */
  dialogBlip(): void {
    tone(700, 940, 60, "sine", 0.035);
  },
  /** 暂停：下行双音（恢复为上行，同一函数参数翻转） */
  pauseOpen(): void {
    tone(500, 320, 140, "sine", 0.05);
  },
  pauseClose(): void {
    tone(320, 500, 140, "sine", 0.05);
  },
  /** 低血量警报：急促双高音（跨过阈值时鸣响一次） */
  lowHp(): void {
    tone(880, 880, 90, "square", 0.045);
    window.setTimeout(() => tone(880, 880, 90, "square", 0.045), 140);
  },
  hurt(): void {
    tone(200, 70, 220, "sawtooth", 0.07);
  },
  /** 岩浆灼烧：噪声感的低频嘶啦 + 弹起上滑 */
  lava(): void {
    tone(90, 55, 180, "sawtooth", 0.06);
    window.setTimeout(() => tone(140, 420, 200, "triangle", 0.045), 90);
  },
  /** 自爆：低频爆响 */
  boom(): void {
    tone(150, 40, 320, "sawtooth", 0.1);
  },
  /** 金币连击：n 为 5 秒窗口内连拾枚数，音高递增 */
  coinCombo(n: number): void {
    const f = 660 * (1 + n * 0.12);
    tone(f, f, 70, "sine", 0.05);
    window.setTimeout(() => tone(f * 1.5, f * 1.5, 130, "sine", 0.045), 70);
  },
  /** Boss 阶段切换怒吼 */
  bossRoar(): void {
    tone(80, 50, 500, "sawtooth", 0.1);
  },
  /** 激光蓄能上滑音 */
  laserCharge(): void {
    tone(200, 900, 600, "sine", 0.045);
  },
  phase(): void {
    tone(150, 90, 400, "square", 0.07);
  },
  victory(): void {
    [523, 659, 784, 1046].forEach((f, i) => {
      window.setTimeout(() => tone(f, f, 210, "triangle", 0.06), i * 140);
    });
  },
};
