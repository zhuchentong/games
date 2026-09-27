import { Sfx } from "./Sfx";

/**
 * WebAudio 程序化 BGM 定序器：pattern 表驱动，方波主旋律 + 三角波贝斯 + 噪声鼓点，零外部资源。
 * 与 Sfx 共享同一 AudioContext；M 静音 / -_=音量键在此统一接管（全局生效，替代各场景自行注册）。
 */

export type MusicTrack = "title" | "level" | "level2" | "level3" | "boss" | "victory";

interface TrackDef {
  bpm: number;
  /** 主旋律（MIDI 音高，0=休止），16 分音符步进 */
  lead: number[];
  bass: number[];
  /** 1=底鼓 2=踩镲 3=军鼓 0=休止 */
  drums: number[];
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C5"/"A#4" → MIDI 音高 */
function note(token: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(token);
  if (!m) return 0;
  return SEMITONE[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) + 1) * 12;
}

/** 空白分隔的音符串 → 音高数组（"."=休止） */
function mel(s: string): number[] {
  return s
    .trim()
    .split(/\s+/)
    .map((t) => (t === "." ? 0 : note(t)));
}

/** 鼓点串（K=底鼓 h=踩镲 S=军鼓 .=休止）→ 编码数组 */
function drum(s: string): number[] {
  return s
    .replace(/\s+/g, "")
    .split("")
    .map((c) => (c === "K" ? 1 : c === "h" ? 2 : c === "S" ? 3 : 0));
}

const TRACKS: Record<MusicTrack, TrackDef> = {
  // 标题：舒缓琶音
  title: {
    bpm: 90,
    lead: mel(
      "C5 . E5 . G5 . E5 . A5 . G5 . E5 . C5 . " +
        "A4 . C5 . E5 . C5 . G4 . B4 . D5 . B4 . " +
        "C5 . E5 . G5 . E5 . A5 . G5 . E5 . G5 . " +
        "A4 . C5 . E5 . D5 . C5 . . . . . . .",
    ),
    bass: mel(
      "C3 . . . . . . . . . . . . . . . A2 . . . . . . . . . . . . . . . " +
        "F2 . . . . . . . . . . . . . . . G2 . . . . . . . . . . . . . . .",
    ),
    drums: drum("K...h...h...h... K...h...h...h... K...h...h...h... K...h...h...h..."),
  },
  // 关卡：轻快推进
  level: {
    bpm: 132,
    lead: mel(
      "E5 G5 A5 . G5 . E5 . C5 . D5 E5 D5 . C5 . " +
        "E5 G5 A5 . G5 . E5 . D5 E5 D5 . B4 . C5 . " +
        "G5 . E5 . C5 . E5 . A5 . G5 . E5 . D5 . " +
        "E5 G5 A5 . G5 . A5 . B5 . C6 . G5 . E5 .",
    ),
    bass: mel(
      "C3 . C3 . C3 . C3 . C3 . C3 . C3 . C3 . A2 . A2 . A2 . A2 . A2 . A2 . A2 . A2 . " +
        "F2 . F2 . F2 . F2 . F2 . F2 . F2 . F2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .",
    ),
    drums: drum("K.h.S.h.K.h.S.hh K.h.S.h.K.h.S.hh K.h.S.h.K.h.S.hh K.h.S.h.K.h.S.hh"),
  },
  // 关卡二：熔火机厂——小调推进，比一关更急迫
  level2: {
    bpm: 140,
    lead: mel(
      "E5 . E5 G5 . E5 B4 . C5 . B4 . A4 . . . " +
        "E5 . E5 G5 . A5 . B5 . A5 . G5 . E5 . . " +
        "F5 . F5 A5 . F5 C6 . B5 . A5 . G5 . A5 . " +
        "G5 . E5 . D5 . E5 . B4 . C5 . A4 . . .",
    ),
    bass: mel(
      "A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . " +
        "A2 . A2 . A2 . A2 . G2 . G2 . G2 . G2 . " +
        "F2 . F2 . F2 . F2 . A2 . A2 . A2 . A2 . " +
        "E2 . E2 . E2 . E2 . G2 . G2 . G2 . G2 .",
    ),
    drums: drum("K.hKS.h.K.hKS.hh K.hKS.h.K.hKS.hh K.hKS.h.K.hKS.hh K.hKS.h.K.hKS.hh"),
  },
  // 关卡三：黑暗森林——终章，最急迫的小调推进
  level3: {
    bpm: 152,
    lead: mel(
      "A4 . C5 . E5 . A5 . G5 . E5 . F5 . E5 . " +
        "A4 . C5 . E5 . A5 . B5 . C6 . B5 . A5 . " +
        "F5 . A5 . C6 . F6 . E6 . C6 . A5 . G5 . " +
        "E5 . F5 . G5 . E5 . D5 . E5 . C5 . . .",
    ),
    bass: mel(
      "A2 . A2 . A2 . A2 . F2 . F2 . F2 . F2 . " +
        "C3 . C3 . C3 . C3 . G2 . G2 . G2 . G2 . " +
        "F2 . F2 . F2 . F2 . A2 . A2 . A2 . A2 . " +
        "E2 . E2 . E2 . E2 . G2 . G2 . G2 . G2 .",
    ),
    drums: drum("K.hKS.hhK.hKS.hh K.hKS.hhK.hKS.hh K.hKS.hhK.hKS.hh K.hKS.hhK.hKS.hh"),
  },
  // Boss 战：紧张压迫
  boss: {
    bpm: 150,
    lead: mel(
      "A4 . A4 C5 . A4 E5 D5 C5 . A4 . B4 C5 . . " +
        "A4 . A4 C5 . A4 F5 E5 D5 . C5 . D5 E5 . . " +
        "F5 . F5 A5 . F5 C6 . A5 . G5 . F5 . E5 . " +
        "D5 . E5 F5 . E5 C5 . B4 . C5 . A4 . . .",
    ),
    bass: mel(
      "A2 . A2 A2 . A2 A2 . A2 . A2 A2 . A2 A2 . A2 . A2 A2 . A2 A2 . A2 . A2 A2 . A2 A2 . " +
        "F2 . F2 F2 . F2 F2 . F2 . F2 F2 . F2 F2 . G2 . G2 G2 . G2 G2 . G2 . G2 G2 . G2 G2 .",
    ),
    drums: drum("K.h.S.h.KKh.S.hh K.h.S.h.KKh.S.hh K.h.S.h.KKh.S.hh K.h.S.h.KKh.S.hh"),
  },
  // 通关：号角式小调
  victory: {
    bpm: 112,
    lead: mel("C5 . E5 . G5 . C6 . B5 . G5 . B5 . C6 . " + "C6 . . . G5 . E5 . G5 . . . C5 . . ."),
    bass: mel("C3 . . . G2 . . . A2 . . . G2 . C3 . " + "C3 . . . G2 . . . C3 . . . C3 . . ."),
    drums: drum("K...S...K.S.K.S. K...S...K...S..."),
  },
};

function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let current: MusicTrack | null = null;
let step = 0;
let nextStepAt = 0;
let timer: number | null = null;

function gainTarget(): number {
  return Sfx.isMuted() ? 0 : Sfx.getVolume() / 5;
}

function applyGain(fadeS = 0.1): void {
  const ac = Sfx.context();
  if (!ac || !master) return;
  const g = master.gain;
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(Math.max(0.0001, g.value), ac.currentTime);
  g.linearRampToValueAtTime(Math.max(0.0001, gainTarget()), ac.currentTime + fadeS);
}

function ensureNoise(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function playTone(
  ac: AudioContext,
  type: OscillatorType,
  f: number,
  t: number,
  dur: number,
  vol: number,
): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master as GainNode);
  osc.start(t);
  osc.stop(t + dur);
}

function playNoise(ac: AudioContext, t: number, dur: number, vol: number, hpHz: number): void {
  const src = ac.createBufferSource();
  src.buffer = ensureNoise(ac);
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(hpHz, t);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src
    .connect(filter)
    .connect(gain)
    .connect(master as GainNode);
  src.start(t);
  src.stop(t + dur);
}

function scheduleStep(ac: AudioContext, def: TrackDef, idx: number, t: number): void {
  const stepDur = 60 / def.bpm / 4;
  const lead = def.lead[idx % def.lead.length];
  const bass = def.bass[idx % def.bass.length];
  if (lead > 0) playTone(ac, "square", freq(lead), t, stepDur * 1.9, 0.05);
  if (bass > 0) playTone(ac, "triangle", freq(bass), t, stepDur * 2.6, 0.1);
  switch (def.drums[idx % def.drums.length]) {
    case 1: {
      // 底鼓：正弦下滑
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain).connect(master as GainNode);
      osc.start(t);
      osc.stop(t + 0.12);
      break;
    }
    case 2:
      playNoise(ac, t, 0.035, 0.05, 6000);
      break;
    case 3:
      playNoise(ac, t, 0.09, 0.11, 1800);
      break;
  }
}

function tick(): void {
  if (!current) return;
  const ac = Sfx.context();
  if (!ac) return;
  ensureMaster(ac);
  if (ac.state !== "running") {
    nextStepAt = ac.currentTime + 0.1;
    return;
  }
  const def = TRACKS[current];
  const stepDur = 60 / def.bpm / 4;
  while (nextStepAt < ac.currentTime + 0.18) {
    const t = Math.max(nextStepAt, ac.currentTime + 0.01);
    scheduleStep(ac, def, step, t);
    step = (step + 1) % def.lead.length;
    nextStepAt = t + stepDur;
  }
}

export const Music = {
  /** 切换曲目（同名幂等）；淡出旧曲后淡入新曲。ctx 未解锁时仅记录状态，解锁后自动起播 */
  play(name: MusicTrack): void {
    if (current === name) return;
    current = name;
    step = 0;
    const ac = Sfx.context();
    if (!ac) return;
    const m = ensureMaster(ac);
    const g = m.gain;
    g.cancelScheduledValues(ac.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), ac.currentTime);
    g.linearRampToValueAtTime(0.0001, ac.currentTime + 0.18);
    g.linearRampToValueAtTime(Math.max(0.0001, gainTarget()), ac.currentTime + 0.55);
    nextStepAt = ac.currentTime + 0.3;
    if (timer === null) timer = window.setInterval(tick, 40);
  },

  stop(): void {
    current = null;
    applyGain(0.2);
  },

  /** 当前曲目（E2E 断言用；ctx 未解锁时也与场景切换同步更新） */
  current(): MusicTrack | null {
    return current;
  },

  /** 静音/音量档变化后调用，重设 BGM 总增益 */
  refreshGain(): void {
    applyGain(0.12);
  },
};

function ensureMaster(ac: AudioContext): GainNode {
  if (!master) {
    master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    master.connect(ac.destination);
  }
  return master;
}

// 全局音频键：-/+ 调音量（0~5 档，持久化），M 静音。DOM 级监听保证所有场景生效
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  switch (e.code) {
    case "Minus":
    case "NumpadSubtract":
      Sfx.setVolume(Sfx.getVolume() - 1);
      Music.refreshGain();
      break;
    case "Equal":
    case "NumpadAdd":
      Sfx.setVolume(Sfx.getVolume() + 1);
      Music.refreshGain();
      break;
    case "KeyM":
      Sfx.toggleMute();
      Music.refreshGain();
      break;
  }
});
