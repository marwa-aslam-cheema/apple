// Sound effects as pure "schedule into an AudioContext" functions, so they work live and in offline renders (tests/previews).

function env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(ac: BaseAudioContext, out: AudioNode, t: number, freq: number, dur: number, gain: number, type: OscillatorType = "sine", endFreq?: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  env(g, t, gain, 0.006, dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseBurst(ac: BaseAudioContext, out: AudioNode, t: number, dur: number, gain: number, f0: number, f1: number) {
  const len = Math.max(1, Math.floor(ac.sampleRate * (dur + 0.05)));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource();
  const bp = ac.createBiquadFilter();
  const g = ac.createGain();
  s.buffer = buf;
  bp.type = "bandpass";
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, gain, Math.min(0.05, dur / 3), dur);
  s.connect(bp).connect(g).connect(out);
  s.start(t);
  s.stop(t + dur + 0.05);
}

/** cubic-bezier(x1,y1,x2,y2) easing, the same curve family CSS uses for the wheel's slow-down. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 32; i++) {
      t = (lo + hi) / 2;
      const bx = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3;
      if (bx < x) lo = t;
      else hi = t;
    }
    return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
  };
}
export const WHEEL_EASE = bezier(0.17, 0.67, 0.12, 1); // matches the CSS transition on the wheel

/** Times (seconds after the spin starts) at which a peg passes the pointer. They spread out as the wheel slows. */
export function tickTimes(delta: number, segmentAngle: number, durationSec: number): number[] {
  const times: number[] = [];
  let prev = 0;
  for (let t = 0; t <= durationSec; t += 0.004) {
    const k = Math.floor((delta * WHEEL_EASE(t / durationSec)) / segmentAngle);
    if (k > prev) {
      times.push(t);
      prev = k;
    }
  }
  return times;
}

export function scheduleSpin(ac: BaseAudioContext, out: AudioNode, t0: number, o: { delta: number; segmentAngle: number; durationSec: number }) {
  noiseBurst(ac, out, t0, 0.7, 0.07, 400, 2400); // launch whoosh
  const ticks = tickTimes(o.delta, o.segmentAngle, o.durationSec);
  ticks.forEach((t, i) => {
    const slow = i / Math.max(1, ticks.length); // later ticks are a touch louder and lower, like a lever clicking over
    tone(ac, out, t0 + t, 1500 - 500 * slow, 0.03, 0.11 + 0.09 * slow, "triangle", 700);
    noiseBurst(ac, out, t0 + t, 0.015, 0.05, 3000, 3000);
  });
  return ticks.length;
}

export function scheduleResult(ac: BaseAudioContext, out: AudioNode, t: number, prize: number) {
  if (prize <= 0) {
    tone(ac, out, t, 392, 0.28, 0.08);
    tone(ac, out, t + 0.16, 330, 0.4, 0.07);
    return;
  }
  const big = prize >= 300;
  const scale = big ? [523, 659, 784, 1047, 1319, 1568, 2093] : prize >= 20 ? [784, 988, 1175, 1568] : [880, 1175];
  scale.forEach((f, i) => {
    tone(ac, out, t + i * 0.085, f, 0.5, 0.1, "sine");
    tone(ac, out, t + i * 0.085, f * 2, 0.3, 0.025, "triangle");
  });
  if (big) for (let i = 0; i < 12; i++) tone(ac, out, t + 0.1 + i * 0.07, 2400 + (i % 4) * 330, 0.12, 0.03, "sine"); // coin sparkle
}

export function scheduleSent(ac: BaseAudioContext, out: AudioNode, t: number) {
  tone(ac, out, t, 520, 0.09, 0.09, "sine", 880);
}

export function scheduleReceived(ac: BaseAudioContext, out: AudioNode, t: number) {
  tone(ac, out, t, 988, 0.22, 0.09);
  tone(ac, out, t + 0.12, 1319, 0.35, 0.09);
}
