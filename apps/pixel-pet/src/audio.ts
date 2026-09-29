/** Web Audio 实时合成：全部音效与 BGM 运行时生成，无音频文件。 */

import { MUTE_KEY } from "./config";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = loadMuted();

export function unlockAudio(): void {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    bgmBus = ctx.createGain();
    bgmBus.gain.value = 0.42;
    bgmBus.connect(master);
  }
  void ctx.resume();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): void {
  muted = !muted;
  if (master && ctx) {
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // 隐私模式：静默降级
  }
}

function at(): number {
  return ctx ? ctx.currentTime : 0;
}

function midi(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

interface ToneOpts {
  when?: number;
  type?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  gain: number;
  bus?: GainNode | null;
}

function tone({ when, type = "square", from, to, dur, gain, bus }: ToneOpts): void {
  if (!ctx || !master) return;
  const t0 = when ?? at();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(24, from), t0);
  if (to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, to), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.014);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(bus ?? master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.06);
}

interface NoiseOpts {
  when?: number;
  dur: number;
  gain: number;
  type?: BiquadFilterType;
  freq: number;
  q?: number;
  sweepTo?: number;
  bus?: GainNode | null;
}

function noise({ when, dur, gain, type = "lowpass", freq, q, sweepTo, bus }: NoiseOpts): void {
  if (!ctx || !master) return;
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = when ?? at();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(Math.max(40, freq), t0);
  if (sweepTo !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + dur);
  }
  if (q !== undefined) filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(bus ?? master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** 在 t0 + offset 处按序列播放音符（0 = 休止符） */
function melody(
  notes: number[],
  stepSec: number,
  opts: {
    type?: OscillatorType;
    dur?: number;
    gain?: number;
    when?: number;
    bus?: GainNode | null;
  } = {},
): void {
  const { type = "square", dur = stepSec * 0.92, gain = 0.12, when, bus } = opts;
  const t0 = when ?? at();
  notes.forEach((n, i) => {
    if (n > 0) tone({ when: t0 + i * stepSec, type, from: midi(n), dur, gain, bus });
  });
}

// —— 音效 ——

export function sfxClick(): void {
  tone({ from: 880, to: 620, dur: 0.06, gain: 0.1 });
}

export function sfxMunch(): void {
  noise({ dur: 0.07, gain: 0.22, type: "bandpass", freq: 420, q: 1.2 });
  noise({ when: at() + 0.11, dur: 0.07, gain: 0.2, type: "bandpass", freq: 360, q: 1.2 });
}

export function sfxYum(): void {
  melody([76, 79, 84], 0.09, { type: "triangle", dur: 0.12, gain: 0.14 });
}

export function sfxRefuse(): void {
  tone({ type: "square", from: 170, to: 120, dur: 0.2, gain: 0.12 });
}

export function sfxSplash(): void {
  noise({ dur: 0.4, gain: 0.2, type: "highpass", freq: 2600, sweepTo: 500 });
  tone({ type: "sine", from: 620, to: 940, dur: 0.1, gain: 0.08 });
  tone({ when: at() + 0.14, type: "sine", from: 700, to: 1050, dur: 0.09, gain: 0.07 });
}

export function sfxPlop(): void {
  tone({ type: "sine", from: 320, to: 90, dur: 0.13, gain: 0.16 });
}

export function sfxMedicine(): void {
  tone({ type: "sine", from: 520, to: 160, dur: 0.16, gain: 0.12 });
  melody([76, 79, 84], 0.1, { type: "triangle", when: at() + 0.25, dur: 0.14, gain: 0.13 });
}

export function sfxSick(): void {
  tone({ type: "square", from: midi(69), dur: 0.18, gain: 0.09 });
  tone({ when: at() + 0.22, type: "square", from: midi(65), dur: 0.26, gain: 0.09 });
}

export function sfxSleepStart(): void {
  tone({ type: "sine", from: midi(48), dur: 0.7, gain: 0.07 });
  tone({ when: at() + 0.35, type: "sine", from: midi(43), dur: 0.8, gain: 0.06 });
}

export function sfxSnore(): void {
  tone({ type: "sine", from: 82, to: 120, dur: 0.5, gain: 0.05 });
  tone({ when: at() + 0.6, type: "sine", from: 110, to: 76, dur: 0.45, gain: 0.045 });
}

export function sfxWake(): void {
  tone({ type: "triangle", from: 420, to: 840, dur: 0.16, gain: 0.12 });
}

export function sfxGuessRight(): void {
  tone({ type: "triangle", from: 660, to: 990, dur: 0.12, gain: 0.13 });
}

export function sfxGuessWrong(): void {
  tone({ type: "square", from: 220, to: 150, dur: 0.22, gain: 0.11 });
}

export function sfxGameWin(): void {
  melody([76, 76, 78, 80, 80, 78, 76], 0.09, { type: "square", gain: 0.1 });
}

export function sfxGameLose(): void {
  melody([64, 62, 60], 0.14, { type: "square", gain: 0.09 });
}

export function sfxEvolve(): void {
  noise({ dur: 0.7, gain: 0.1, type: "highpass", freq: 400, sweepTo: 4000 });
  tone({ type: "sawtooth", from: 180, to: 1150, dur: 0.65, gain: 0.07 });
  melody([72, 76, 79, 84, 88], 0.11, {
    type: "square",
    when: at() + 0.7,
    dur: 0.16,
    gain: 0.13,
  });
}

export function sfxRunaway(): void {
  melody([64, 60, 57, 53], 0.24, { type: "square", dur: 0.3, gain: 0.1 });
}

export function sfxCrack(): void {
  noise({ dur: 0.07, gain: 0.24, type: "lowpass", freq: 900 });
}

export function sfxHatchPop(): void {
  tone({ type: "square", from: 300, to: 920, dur: 0.11, gain: 0.13 });
  melody([72, 76, 79, 84], 0.09, { type: "triangle", when: at() + 0.14, dur: 0.13, gain: 0.13 });
}

export function sfxPat(): void {
  noise({ dur: 0.05, gain: 0.14, type: "lowpass", freq: 1200 });
  tone({ type: "triangle", from: 740, to: 980, dur: 0.09, gain: 0.1 });
}

/** 气泡冒出时的小啾啾（音量刻意压低，不吵） */
export function sfxSpeak(): void {
  tone({ type: "square", from: midi(81), dur: 0.05, gain: 0.04 });
  tone({ when: at() + 0.07, type: "square", from: midi(78), dur: 0.05, gain: 0.035 });
}

/** 雨天的远处雨声（定期短促触发,音量极低） */
export function sfxRainPatter(): void {
  noise({ dur: 0.6, gain: 0.018, type: "lowpass", freq: 3400, sweepTo: 1100 });
}

// —— BGM：C-G-Am-F 温柔八音盒风 ——

const BPM = 100;
const STEP_SEC = 60 / BPM / 2; // 八分音符

const LEAD: number[] = [
  76,
  0,
  79,
  0,
  84,
  0,
  79,
  76, // C
  74,
  0,
  79,
  0,
  83,
  0,
  81,
  79, // G
  72,
  0,
  76,
  0,
  81,
  0,
  76,
  72, // Am
  69,
  0,
  72,
  0,
  77,
  0,
  81,
  79, // F
];
const BASS: number[][] = [
  [48, 55],
  [43, 50],
  [45, 52],
  [41, 48],
];

let bgmTimer: number | null = null;
let nextStepTime = 0;
let step = 0;

function scheduleStep(index: number, t: number): void {
  const chord = Math.floor(index / 8) % 4;
  const inBar = index % 8;
  const lead = LEAD[index % LEAD.length];
  if (lead > 0) {
    tone({
      when: t,
      type: "triangle",
      from: midi(lead),
      dur: STEP_SEC * 1.7,
      gain: 0.1,
      bus: bgmBus,
    });
  }
  if (inBar === 0 || inBar === 4) {
    tone({
      when: t,
      type: "sine",
      from: midi(BASS[chord][0]),
      dur: STEP_SEC * 1.6,
      gain: 0.13,
      bus: bgmBus,
    });
  }
  if (inBar === 6) {
    tone({
      when: t,
      type: "sine",
      from: midi(BASS[chord][1]),
      dur: STEP_SEC * 0.9,
      gain: 0.09,
      bus: bgmBus,
    });
  }
  if (inBar % 2 === 1) {
    noise({ when: t, dur: 0.03, gain: 0.015, type: "highpass", freq: 6000, bus: bgmBus });
  }
}

export function startBgm(): void {
  if (bgmTimer !== null || !ctx) return;
  nextStepTime = at() + 0.1;
  step = 0;
  bgmTimer = window.setInterval(() => {
    if (!ctx) return;
    while (nextStepTime < at() + 0.15) {
      scheduleStep(step, nextStepTime);
      step = (step + 1) % LEAD.length;
      nextStepTime += STEP_SEC;
    }
  }, 40);
}

export function stopBgm(): void {
  if (bgmTimer !== null) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}
