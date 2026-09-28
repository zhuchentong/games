/** 程序化音频：Web Audio 实时合成全部音效与循环 BGM，无需外部素材。 */

import { MUTED_KEY } from "./config";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let bgmTimer: number | null = null;
let bgmStep = 0;
let bgmNextTime = 0;

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(v: boolean): void {
  try {
    localStorage.setItem(MUTED_KEY, v ? "1" : "0");
  } catch {
    /* 隐私模式等场景下忽略 */
  }
}

export function isMuted(): boolean {
  return muted;
}

/** 在首次用户手势里调用：创建并恢复 AudioContext。 */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") void c.resume();
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AC = window.AudioContext ?? w.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    bgmBus = ctx.createGain();
    bgmBus.gain.value = 0.55;
    bgmBus.connect(master);
  }
  return ctx;
}

export function setMuted(v: boolean): void {
  muted = v;
  saveMuted(v);
  if (master) master.gain.value = v ? 0 : 1;
}

/** 切换静音，返回切换后的状态。 */
export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

function now(): number {
  return ctx ? ctx.currentTime : 0;
}

/** 简单音符：振荡器 + 音量包络，可做频率滑动。 */
function tone(opts: {
  when: number;
  type: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain: number;
  bus?: GainNode | null;
}): void {
  const c = ctx;
  if (!c || !master) return;
  const t0 = Math.max(opts.when, c.currentTime);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t0);
  if (opts.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + opts.dur);
  osc.connect(g);
  g.connect(opts.bus ?? master);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.03);
}

/** 噪声爆发：白噪声 + 滤波器，可做频率滑动。 */
function noise(opts: {
  when: number;
  dur: number;
  gain: number;
  type: BiquadFilterType;
  freq: number;
  q?: number;
  sweepTo?: number;
  bus?: GainNode | null;
}): void {
  const c = ctx;
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = Math.max(opts.when, c.currentTime);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = opts.type;
  f.frequency.setValueAtTime(opts.freq, t0);
  f.Q.value = opts.q ?? 0.8;
  if (opts.sweepTo !== undefined) {
    f.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), t0 + opts.dur);
  }
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + opts.dur);
  src.connect(f);
  f.connect(g);
  g.connect(opts.bus ?? master);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.03);
}

const midi = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

// —— 音效 ——

/** 普通平台弹跳：短促轻快的 blip */
export function sfxBounce(): void {
  tone({ when: now(), type: "triangle", from: 330, to: 560, dur: 0.09, gain: 0.12 });
}

/** 弹簧：上滑 boing */
export function sfxSpring(): void {
  tone({ when: now(), type: "triangle", from: 180, to: 920, dur: 0.28, gain: 0.16 });
  tone({ when: now() + 0.02, type: "sine", from: 240, to: 1200, dur: 0.22, gain: 0.08 });
}

/** 易碎板碎裂：低频噪声垮塌 */
export function sfxBreak(): void {
  noise({ when: now(), dur: 0.22, gain: 0.22, type: "lowpass", freq: 900, sweepTo: 180 });
  tone({ when: now(), type: "square", from: 140, to: 60, dur: 0.16, gain: 0.1 });
}

/** 钉板受伤：刺耳高频 + 低闷响 */
export function sfxSpike(): void {
  noise({ when: now(), dur: 0.14, gain: 0.24, type: "highpass", freq: 2200 });
  tone({ when: now(), type: "square", from: 190, to: 70, dur: 0.2, gain: 0.18 });
}

/** 飞刀击中：高频划过 + 闷响 */
export function sfxKnife(): void {
  noise({ when: now(), dur: 0.1, gain: 0.2, type: "bandpass", freq: 3400, sweepTo: 900, q: 1.5 });
  tone({ when: now() + 0.04, type: "square", from: 300, to: 110, dur: 0.12, gain: 0.12 });
}

/** 爱心回血：上行三连音 */
export function sfxHeart(): void {
  const t = now();
  [88, 92, 96].forEach((m, i) =>
    tone({ when: t + i * 0.07, type: "sine", from: midi(m), dur: 0.16, gain: 0.14 }),
  );
}

/** 通用道具拾取：明亮双音上行 */
export function sfxPowerup(): void {
  const t = now();
  tone({ when: t, type: "square", from: midi(79), dur: 0.09, gain: 0.1 });
  tone({ when: t + 0.08, type: "square", from: midi(86), dur: 0.14, gain: 0.1 });
  tone({ when: t + 0.08, type: "sine", from: midi(98), dur: 0.12, gain: 0.07 });
}

/** 护盾拾取：清脆单音 ping */
export function sfxShield(): void {
  const t = now();
  tone({ when: t, type: "sine", from: midi(93), dur: 0.22, gain: 0.13 });
  tone({ when: t + 0.01, type: "triangle", from: midi(105), dur: 0.16, gain: 0.06 });
}

/** 护盾破碎：短促下滑 zap */
export function sfxShieldBreak(): void {
  const t = now();
  tone({ when: t, type: "square", from: midi(86), to: midi(64), dur: 0.18, gain: 0.13 });
  noise({ when: t, dur: 0.12, gain: 0.1, type: "highpass", freq: 3000, sweepTo: 800 });
}

/** 死亡：下滑坠落音 */
export function sfxDie(): void {
  const t = now();
  tone({ when: t, type: "square", from: 420, to: 70, dur: 0.55, gain: 0.16 });
  tone({ when: t + 0.05, type: "triangle", from: 300, to: 55, dur: 0.6, gain: 0.1 });
  noise({ when: t, dur: 0.3, gain: 0.1, type: "lowpass", freq: 500, sweepTo: 120 });
}

/** 通关：小号角 */
export function sfxWin(): void {
  const t = now();
  [72, 76, 79, 84].forEach((m, i) =>
    tone({ when: t + i * 0.11, type: "square", from: midi(m), dur: 0.16, gain: 0.12 }),
  );
  [60, 64, 67, 72].forEach((m, i) =>
    tone({ when: t + i * 0.11, type: "triangle", from: midi(m), dur: 0.2, gain: 0.1 }),
  );
  tone({ when: t + 0.44, type: "square", from: midi(88), dur: 0.5, gain: 0.12 });
  tone({ when: t + 0.44, type: "triangle", from: midi(76), dur: 0.5, gain: 0.08 });
}

/** 开始游戏：两音提示 */
export function sfxStart(): void {
  const t = now();
  tone({ when: t, type: "square", from: midi(76), dur: 0.09, gain: 0.1 });
  tone({ when: t + 0.09, type: "square", from: midi(83), dur: 0.14, gain: 0.1 });
}

// —— BGM：C-G-Am-F 轻快 chiptune 循环 ——

const BPM = 132;
/** 八分音符时长（秒） */
const STEP = 60 / BPM / 2;

/** 主旋律（MIDI 音高，0 表示休止），每 8 个一组对应一小节 */
const LEAD: number[] = [
  72,
  76,
  79,
  76,
  72,
  76,
  79,
  81, // C
  79,
  74,
  71,
  74,
  79,
  74,
  76,
  74, // G
  72,
  69,
  76,
  72,
  81,
  76,
  72,
  76, // Am
  77,
  74,
  69,
  74,
  77,
  81,
  84,
  81, // F
];
/** 贝斯（四分音符，每小节 4 个） */
const BASS: number[] = [48, 48, 55, 55, 43, 43, 50, 50, 45, 45, 52, 52, 41, 41, 48, 48];

function scheduleStep(step: number, t: number): void {
  const lead = LEAD[step];
  if (lead > 0) {
    tone({
      when: t,
      type: "square",
      from: midi(lead),
      dur: STEP * 0.9,
      gain: 0.05,
      bus: bgmBus,
    });
  }
  if (step % 2 === 0) {
    const bass = BASS[step / 2];
    tone({
      when: t,
      type: "triangle",
      from: midi(bass),
      dur: STEP * 1.8,
      gain: 0.09,
      bus: bgmBus,
    });
  }
  noise({
    when: t,
    dur: 0.03,
    gain: step % 4 === 0 ? 0.03 : 0.012,
    type: "highpass",
    freq: 6000,
    bus: bgmBus,
  });
}

/** 开始循环 BGM（幂等）。 */
export function startBgm(): void {
  const c = ensureCtx();
  if (!c || bgmTimer !== null) return;
  bgmStep = 0;
  bgmNextTime = c.currentTime + 0.08;
  bgmTimer = window.setInterval(() => {
    const cc = ctx;
    if (!cc) return;
    while (bgmNextTime < cc.currentTime + 0.15) {
      scheduleStep(bgmStep, bgmNextTime);
      bgmStep = (bgmStep + 1) % LEAD.length;
      bgmNextTime += STEP;
    }
  }, 40);
}

/** 停止 BGM。 */
export function stopBgm(): void {
  if (bgmTimer !== null) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}
