"use client";

import { musicPref } from "./music";
import { scheduleReceived, scheduleResult, scheduleSent, scheduleSpin } from "./sfx-synth";

// Sound effects share the "sound" switch in the top bar with the background music.
let ac: AudioContext | null = null;
let out: GainNode | null = null;

function ready() {
  if (!musicPref()) return null;
  if (!ac) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ac = new Ctor();
    out = ac.createGain();
    out.gain.value = 0.55;
    const comp = ac.createDynamicsCompressor();
    out.connect(comp).connect(ac.destination);
  }
  if (ac.state === "suspended") void ac.resume();
  return ac && out ? { ac, out } : null;
}

/** Call from a click handler so later effects are allowed to play. */
export function unlockSfx() {
  ready();
}
export function sfxSpin(delta: number, segmentAngle: number, durationSec: number) {
  const r = ready();
  if (r) scheduleSpin(r.ac, r.out, r.ac.currentTime + 0.02, { delta, segmentAngle, durationSec });
}
export function sfxResult(prize: number) {
  const r = ready();
  if (r) scheduleResult(r.ac, r.out, r.ac.currentTime + 0.02, prize);
}
export function sfxSent() {
  const r = ready();
  if (r) scheduleSent(r.ac, r.out, r.ac.currentTime + 0.01);
}
export function sfxReceived() {
  const r = ready();
  if (r) scheduleReceived(r.ac, r.out, r.ac.currentTime + 0.01);
}
