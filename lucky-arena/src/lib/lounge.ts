// Original, procedurally generated lounge-jazz loop (Web Audio API). No audio files, so nothing to license.
// Four-chord turnaround (Cmaj9 - Am9 - Dm9 - G13) with swung eighths, soft electric-piano chords, bass,
// brushed noise and a sparse vibraphone-like melody. Quiet by design: the app plays it at a very low master volume.

export interface Chord { bass: number; fifth: number; notes: number[] }
export interface Track {
  name: string;
  bpm: number;
  swing: number; // 0 = straight eighths, ~0.2 = lazy swing
  chords: Chord[];
  melody: number[];
  bass: "pedal" | "bossa" | "ballad" | "walk";
  comp: "sustain" | "bossa" | "ballad" | "charleston";
  drums: "hats" | "bossa" | "brush" | "ride";
}

export const TRACKS: Track[] = [
  {
    name: "Midnight Lounge", bpm: 76, swing: 0.16, bass: "pedal", comp: "sustain", drums: "hats",
    melody: [72, 74, 76, 79, 81, 84],
    chords: [
      { bass: 48, fifth: 55, notes: [64, 67, 71, 74] }, // Cmaj9
      { bass: 45, fifth: 52, notes: [60, 64, 67, 71] }, // Am9
      { bass: 50, fifth: 57, notes: [65, 69, 72, 76] }, // Dm9
      { bass: 43, fifth: 50, notes: [59, 65, 69, 76] }, // G13
    ],
  },
  {
    name: "Velvet Bossa", bpm: 92, swing: 0.02, bass: "bossa", comp: "bossa", drums: "bossa",
    melody: [74, 77, 79, 81, 84, 86],
    chords: [
      { bass: 50, fifth: 57, notes: [65, 69, 72, 76] }, // Dm9
      { bass: 43, fifth: 50, notes: [64, 65, 71, 74] }, // G13
      { bass: 48, fifth: 55, notes: [64, 67, 71, 74] }, // Cmaj9
      { bass: 45, fifth: 52, notes: [61, 67, 71, 76] }, // A7
    ],
  },
  {
    name: "Slow Velvet Ballad", bpm: 64, swing: 0.2, bass: "ballad", comp: "ballad", drums: "brush",
    melody: [69, 72, 74, 76, 79, 81, 84],
    chords: [
      { bass: 45, fifth: 52, notes: [60, 64, 67, 71] }, // Am9
      { bass: 41, fifth: 48, notes: [60, 64, 69, 72] }, // Fmaj7
      { bass: 50, fifth: 57, notes: [65, 69, 72, 76] }, // Dm9
      { bass: 40, fifth: 47, notes: [56, 62, 64, 68] }, // E7
    ],
  },
  {
    name: "High Roller Swing", bpm: 104, swing: 0.22, bass: "walk", comp: "charleston", drums: "ride",
    melody: [72, 74, 77, 79, 81, 84],
    chords: [
      { bass: 41, fifth: 48, notes: [60, 64, 69, 72] }, // Fmaj7
      { bass: 38, fifth: 45, notes: [60, 66, 69, 74] }, // D7
      { bass: 43, fifth: 50, notes: [58, 62, 65, 70] }, // Gm7
      { bass: 36, fifth: 43, notes: [58, 64, 67, 70] }, // C7
    ],
  },
];

export const barSeconds = (t: Track) => (60 / t.bpm) * 4;

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ac: BaseAudioContext) {
  let b = noiseCache.get(ac);
  if (!b) {
    b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ac, b);
  }
  return b;
}

function env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function epNote(ac: BaseAudioContext, out: AudioNode, t: number, midi: number, gain: number, dur: number) {
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1500;
  env(g, t, gain, 0.015, dur);
  lp.connect(g).connect(out);
  for (const [type, mul, detune, vol] of [["triangle", 1, -4, 1], ["triangle", 1, 5, 0.8], ["sine", 4, 0, 0.12]] as const) {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = type;
    o.frequency.value = hz(midi) * mul;
    o.detune.value = detune;
    og.gain.value = vol;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}

function bassNote(ac: BaseAudioContext, out: AudioNode, t: number, midi: number, gain: number, dur: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  o.type = "sine";
  o.frequency.value = hz(midi);
  env(g, t, gain, 0.02, dur);
  o.connect(lp).connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.1);
}

function vibe(ac: BaseAudioContext, out: AudioNode, t: number, midi: number, gain: number) {
  const g = ac.createGain();
  env(g, t, gain, 0.008, 1.6);
  g.connect(out);
  for (const [mul, vol] of [[1, 1], [4, 0.18]] as const) {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.frequency.value = hz(midi) * mul;
    og.gain.value = vol;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + 1.7);
  }
}

function tick(ac: BaseAudioContext, out: AudioNode, t: number, gain: number, dur: number, highpass: number) {
  const s = ac.createBufferSource();
  const hp = ac.createBiquadFilter();
  const g = ac.createGain();
  s.buffer = noiseBuffer(ac);
  hp.type = "highpass";
  hp.frequency.value = highpass;
  env(g, t, gain, 0.004, dur);
  s.connect(hp).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

/** Schedules one 4/4 bar of `track` starting at time t0 into `out`. */
export function scheduleBar(ac: BaseAudioContext, out: AudioNode, t0: number, bar: number, track: Track, rand: () => number = Math.random) {
  const chord = track.chords[bar % track.chords.length];
  const eighth = 60 / track.bpm / 2;
  const at = (step: number) => t0 + step * eighth + (step % 2 ? eighth * track.swing : 0) + (rand() - 0.5) * 0.014;
  const chordAt = (step: number, notes: number[], gain: number, dur: number) =>
    notes.forEach((n, i) => epNote(ac, out, at(step) + i * 0.012, n, gain, dur));

  // chords
  if (track.comp === "sustain") {
    chordAt(0, chord.notes, 0.045, 2.4);
    if (bar % 2 === 0) chordAt(5, chord.notes.slice(1), 0.026, 1.1);
  } else if (track.comp === "bossa") {
    for (const s of [0, 3, 6]) chordAt(s, chord.notes, 0.032, 0.55);
  } else if (track.comp === "ballad") {
    chordAt(0, chord.notes, 0.04, 3.4);
    [2, 4, 6].forEach((s, i) => epNote(ac, out, at(s), chord.notes[(i + 1) % chord.notes.length] + 12, 0.018, 1.2));
  } else {
    for (const s of [1, 5]) chordAt(s, chord.notes, 0.04, 0.42);
    if (rand() < 0.5) chordAt(3, chord.notes.slice(1), 0.026, 0.3);
  }

  // bass
  if (track.bass === "pedal") {
    bassNote(ac, out, at(0), chord.bass, 0.2, 1.7);
    bassNote(ac, out, at(4), chord.fifth, 0.14, 1.1);
    if (rand() < 0.5) bassNote(ac, out, at(7), chord.bass + 2, 0.1, 0.5);
  } else if (track.bass === "bossa") {
    bassNote(ac, out, at(0), chord.bass, 0.2, 0.8);
    bassNote(ac, out, at(3), chord.fifth, 0.14, 0.5);
    bassNote(ac, out, at(4), chord.bass, 0.16, 0.8);
    bassNote(ac, out, at(7), chord.fifth, 0.12, 0.5);
  } else if (track.bass === "ballad") {
    bassNote(ac, out, at(0), chord.bass, 0.2, 3.0);
    bassNote(ac, out, at(5), chord.fifth, 0.1, 1.2);
  } else {
    [0, 7, 4, 2].forEach((off, i) => bassNote(ac, out, at(i * 2), chord.bass + off, 0.17, 0.42));
  }

  // drums
  if (track.drums === "hats") {
    for (let s = 0; s < 8; s += 2) tick(ac, out, at(s), 0.006 + rand() * 0.002, 0.04, 7000);
    for (const s of [2, 6]) tick(ac, out, at(s), 0.022, 0.16, 3500);
  } else if (track.drums === "bossa") {
    for (const s of [0, 3, 6]) tick(ac, out, at(s), 0.016, 0.03, 5500);
    for (let s = 0; s < 8; s++) tick(ac, out, at(s), 0.005, 0.03, 8000);
  } else if (track.drums === "brush") {
    for (const s of [2, 6]) tick(ac, out, at(s), 0.016, 0.3, 3000);
  } else {
    for (const s of [0, 2, 3, 4, 6, 7]) tick(ac, out, at(s), s % 2 ? 0.009 : 0.014, 0.1, 6500);
    for (const s of [2, 6]) tick(ac, out, at(s), 0.012, 0.05, 2500);
  }

  // sparse melody
  const chance = track.drums === "brush" ? 0.22 : 0.3;
  for (const s of [1, 3, 5, 7]) {
    if (rand() < chance) vibe(ac, out, at(s), track.melody[Math.floor(rand() * track.melody.length)], 0.04 + rand() * 0.02);
  }
}

/** Dry + reverb bus -> compressor -> destination. Returns the node to connect instruments to. */
export function buildChain(ac: BaseAudioContext, destination: AudioNode) {
  const bus = ac.createGain();
  const dry = ac.createGain();
  const wet = ac.createGain();
  const verb = ac.createConvolver();
  const len = Math.floor(ac.sampleRate * 2.4);
  const ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  verb.buffer = ir;
  dry.gain.value = 0.85;
  wet.gain.value = 0.32;
  const comp = ac.createDynamicsCompressor();
  bus.connect(dry).connect(comp);
  bus.connect(verb).connect(wet).connect(comp);
  comp.connect(destination);
  return bus;
}
