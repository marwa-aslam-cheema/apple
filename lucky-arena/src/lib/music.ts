"use client";

import { TRACKS, barSeconds, buildChain, scheduleBar, type Track } from "./lounge";

const PREF_KEY = "la_music";
const TRACK_KEY = "la_track";
const LEVEL = 0.1; // master volume: very dim background music (raise towards 0.3 for louder, 0 is silent)
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bus: AudioNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBar = 0;
let barIndex = 0;
let playing = false;
let track: Track = TRACKS[0];

export function musicPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}
function trackIndex() {
  try {
    return Math.abs(Number(localStorage.getItem(TRACK_KEY) ?? 0)) % TRACKS.length;
  } catch {
    return 0;
  }
}
/** Each login moves on to the next of the four tracks. */
export function nextTrack() {
  try {
    localStorage.setItem(TRACK_KEY, String((trackIndex() + 1) % TRACKS.length));
  } catch {
    /* ignore */
  }
}
export function currentTrackName() {
  return TRACKS[trackIndex()].name;
}

export function setMusicPref(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* private mode: preference just will not persist */
  }
}

function ensureContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  bus = buildChain(ctx, master);
  return ctx;
}

/** Call inside a click/submit handler so browsers allow audio later (autoplay policy). */
export function unlockAudio() {
  const ac = ensureContext();
  if (ac && ac.state === "suspended") void ac.resume();
}

function pump() {
  if (!ctx || !bus) return;
  while (nextBar < ctx.currentTime + 3) {
    scheduleBar(ctx, bus, nextBar, barIndex++, track);
    nextBar += barSeconds(track);
  }
}

export function startMusic() {
  if (playing) {
    if (ctx?.state === "suspended") void ctx.resume();
    return;
  }
  if (!musicPref()) return;
  const ac = ensureContext();
  if (!ac || !master) return;
  if (ac.state === "suspended") void ac.resume();
  playing = true;
  track = TRACKS[trackIndex()];
  barIndex = 0;
  nextBar = ac.currentTime + 0.2;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(master.gain.value, ac.currentTime);
  master.gain.linearRampToValueAtTime(LEVEL, ac.currentTime + 5); // slow fade-in
  pump();
  timer = setInterval(pump, 700);
}

export function stopMusic() {
  if (!playing || !ctx || !master) return;
  playing = false;
  if (timer) clearInterval(timer);
  timer = null;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
  // Drop the audio graph a moment later so already-scheduled notes do not leak into the next session.
  const old = ctx;
  ctx = null; master = null; bus = null;
  setTimeout(() => void old.close().catch(() => undefined), 1500);
}

export function isPlaying() {
  return playing;
}
