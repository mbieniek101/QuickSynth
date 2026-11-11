'use strict';
/*  QuickSynth — a pocket groovebox for the browser / iPhone home screen, tuned for techno,
    house and dark new wave. DRUM, BASS and LEAD play in sync: 16 patterns each with chaining,
    knobs, sidechain pump, reverb, live recording and hold-to-apply master FX. All synthesized. */
(() => {
const STEPS = 16, NPAT = 16;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const pad2 = n => String(n).padStart(2, '0');
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = m => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);
const SCALES = {
  'minor': [0, 2, 3, 5, 7, 8, 10],
  'phrygian': [0, 1, 3, 5, 7, 8, 10],
  'dorian': [0, 2, 3, 5, 7, 9, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'major': [0, 2, 4, 5, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'pent. minor': [0, 3, 5, 7, 10],
  'blues': [0, 3, 5, 6, 7, 10],
  'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
const BASS_WAVES = ['sawtooth', 'square', 'triangle', 'sine'], BASS_WL = ['SAW', 'SQR', 'TRI', 'SIN'];
const LEAD_WAVES = ['sawtooth', 'square', 'super', 'triangle'], LEAD_WL = ['SAW', 'SQR', 'SUPER', 'TRI'];
const CHORDS = ['OFF', 'OCT', '5TH', 'TRIAD', '7TH'];
const idx4 = v => Math.min(3, Math.floor(v * 4));
const chordIdx = v => Math.min(4, Math.floor(v * 5));
const pct = v => String(Math.round(v * 99));

const DRUM_NAMES = ['KICK', '808', 'SNARE', 'CLAP', 'C.HAT', 'O.HAT', 'RIDE', 'CRASH',
                    'TOM L', 'TOM M', 'TOM H', 'RIM', 'COWBL', 'SHAKR', 'SUB', 'ZAP'];
const KICKS = new Set([0, 1, 14]); // these trigger the sidechain pump

const DEFS = [
  { id: 'drum', name: 'DRUM', color: '#f3e600', selLabel: 'SOUND', knobs: [
    { k: 'tune', label: 'TUNE', def: .5, fmt: v => { const s = Math.round((v - .5) * 24); return (s > 0 ? '+' : '') + s; } },
    { k: 'decay', label: 'DECAY', def: .5 },
    { k: 'tone', label: 'TONE', def: 1 },
    { k: 'level', label: 'LEVEL', def: .8 },
  ] },
  { id: 'bass', name: 'BASS', color: '#5ef6ff', selLabel: 'NOTE', knobs: [
    { k: 'wave', label: 'WAVE', def: 0, fmt: v => BASS_WL[idx4(v)] },
    { k: 'cutoff', label: 'CUTOFF', def: .3 },
    { k: 'reso', label: 'RESO', def: .5 },
    { k: 'env', label: 'ENV', def: .5 },
    { k: 'decay', label: 'DECAY', def: .3 },
    { k: 'glide', label: 'GLIDE', def: .15 },
    { k: 'drive', label: 'DRIVE', def: .35 },
  ] },
  { id: 'lead', name: 'LEAD', color: '#ff2bd6', selLabel: 'NOTE', knobs: [
    { k: 'wave', label: 'WAVE', def: .6, fmt: v => LEAD_WL[idx4(v)] },
    { k: 'cutoff', label: 'CUTOFF', def: .7 },
    { k: 'attack', label: 'ATTACK', def: 0 },
    { k: 'release', label: 'RELEASE', def: .25 },
    { k: 'detune', label: 'DETUNE', def: .6 },
    { k: 'chord', label: 'CHORD', def: .7, fmt: v => CHORDS[chordIdx(v)] },
    { k: 'gate', label: 'GATE', def: .35, fmt: v => v > .92 ? 'TIE' : pct(v) },
  ] },
];

// sound presets (knob values 0..1)
const PRESETS = {
  1: {
    'Rubber (French house)': { wave: 0, cutoff: .3, reso: .5, env: .5, decay: .3, glide: .15, drive: .35 },
    'Acid squelch': { wave: 0, cutoff: .22, reso: .82, env: .78, decay: .25, glide: .35, drive: .55 },
    'Octave pulse (new wave)': { wave: .3, cutoff: .48, reso: .2, env: .3, decay: .4, glide: 0, drive: .2 },
    'Techno rumble': { wave: .6, cutoff: .34, reso: .3, env: .4, decay: .2, glide: 0, drive: .85 },
    'Deep sub': { wave: .9, cutoff: .5, reso: 0, env: 0, decay: .5, glide: 0, drive: .15 },
  },
  2: {
    'Supersaw stab': { wave: .6, cutoff: .7, attack: 0, release: .25, detune: .6, chord: .7, gate: .35 },
    'Robot filter': { wave: 0, cutoff: .45, attack: 0, release: .2, detune: .2, chord: .3, gate: .5 },
    'Goth pad': { wave: .6, cutoff: .42, attack: .55, release: .65, detune: .5, chord: .7, gate: 1 },
    'Cold lead': { wave: .3, cutoff: .55, attack: .08, release: .4, detune: .3, chord: 0, gate: .7 },
    'Pluck': { wave: 0, cutoff: .5, attack: 0, release: .15, detune: .15, chord: .5, gate: .2 },
    'Organ chords': { wave: .3, cutoff: .6, attack: .02, release: .2, detune: .1, chord: .9, gate: .8 },
  },
};

const FX = [
  { id: 'lp', label: 'LOW' }, { id: 'hp', label: 'HIGH' }, { id: 'dly', label: 'ECHO' },
  { id: 'phase', label: 'PHAS' }, { id: 'crush', label: 'CRSH' },
  { id: 'r4', label: 'R×4', len: 4 }, { id: 'r2', label: 'R×2', len: 2 }, { id: 'r1', label: 'R×1', len: 1 },
];

// ---------------------------------------------------------------- state
const STORE_KEY = 'minisynth.state.v2'; // storage key kept from the old name so saved patterns survive the rename
const defaults = def => Object.fromEntries(def.knobs.map(k => [k.k, k.def]));
const newPattern = () => ({ g: new Array(16).fill(0) });
const bits = steps => steps.reduce((m, s) => m | (1 << s), 0);
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

function defaultState() {
  const s = {
    v: 2, bpm: 124, swing: 0, pump: .45,
    devices: DEFS.map((d, i) => ({
      cur: 0, chain: [0], sel: 0,
      patterns: Array.from({ length: NPAT }, newPattern),
      params: i === 0 ? Array.from({ length: 16 }, () => defaults(d)) : defaults(d),
      vol: .8, verb: [.12, 0, .28][i], mute: false, root: 2, scale: 'minor', oct: [3, 2, 4][i],
    })),
  };
  const [dr, bs, ld] = s.devices;
  const four = [0, 4, 8, 12], off8 = [2, 6, 10, 14];
  // P1 techno
  let g = dr.patterns[0].g;
  g[0] = bits(four); g[3] = bits([4, 12]); g[5] = bits(off8);
  g[4] = bits([0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15]);
  // P2 house
  g = dr.patterns[1].g;
  g[0] = bits(four); g[3] = bits([4, 12]); g[5] = bits(off8); g[13] = bits(range(0, 16)); g[2] = bits([15]);
  // P3 new wave (kick burst at the end of the bar)
  g = dr.patterns[2].g;
  g[0] = bits([0, 4, 8, 12, 13, 14, 15]); g[2] = bits([4, 12]); g[4] = bits([0, 2, 4, 6, 8, 10, 12, 14]);
  // P4 tom fill
  g = dr.patterns[3].g;
  g[0] = bits([0, 4, 8]); g[2] = bits([4, 14, 15]); g[10] = bits([8, 9]); g[9] = bits([10, 11]); g[8] = bits([12, 13]); g[7] = bits([0]);
  dr.params[4].level = .45; dr.params[13].level = .35; dr.params[5].level = .6;

  // bass P1 rolling, P2 octave pulse, P3 acid
  g = bs.patterns[0].g;
  g[0] = bits([1, 2, 5, 6, 9, 10, 13, 14]); g[7] = bits([3, 11]); g[3] = bits([7]); g[5] = bits([15]);
  g = bs.patterns[1].g;
  g[0] = bits([0, 2, 4, 6]); g[7] = bits([1, 3, 5, 7]); g[5] = bits([8, 10, 12, 14]); g[12] = bits([9, 11, 13, 15]);
  g = bs.patterns[2].g;
  g[0] = bits([0, 2, 5, 8, 11, 14]); g[3] = bits([3, 9]); g[7] = bits([6, 12]); g[2] = bits([15]);
  // lead P1 chord stabs
  g = ld.patterns[0].g;
  g[0] = bits([2, 6]); g[5] = bits([10]); g[3] = bits([14]);
  return s;
}

function sanitize(s) {
  const d0 = defaultState();
  s.v = 2;
  s.bpm = clamp(+s.bpm || 124, 40, 240);
  s.swing = clamp(+s.swing || 0, 0, .6);
  s.pump = s.pump === undefined ? .45 : clamp(+s.pump || 0, 0, 1);
  if (!s.rimFix) { const p1 = s.devices[0] && s.devices[0].patterns && s.devices[0].patterns[0]; if (p1 && p1.g && p1.g[11] === ((1 << 7) | (1 << 15))) p1.g[11] = 0; s.rimFix = 1; }
  s.devices.forEach((dev, i) => {
    const def = DEFS[i], base = d0.devices[i];
    for (const k of ['cur', 'chain', 'sel', 'vol', 'verb', 'mute', 'root', 'scale', 'oct']) if (dev[k] === undefined) dev[k] = base[k];
    if (!SCALES[dev.scale]) dev.scale = 'minor';
    if (!Array.isArray(dev.patterns) || dev.patterns.length !== NPAT) dev.patterns = base.patterns;
    dev.patterns.forEach(p => { if (!Array.isArray(p.g) || p.g.length !== 16) p.g = new Array(16).fill(0); });
    if (!Array.isArray(dev.chain) || !dev.chain.length) dev.chain = [dev.cur | 0];
    if (i === 0) {
      if (!Array.isArray(dev.params) || dev.params.length !== 16) dev.params = base.params;
      dev.params = dev.params.map(p => ({ ...defaults(def), ...p }));
    } else dev.params = { ...defaults(def), ...dev.params };
  });
  return s;
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && s.v === 2 && Array.isArray(s.devices) && s.devices.length === 3) return sanitize(s);
  } catch (e) { /* fall through */ }
  return defaultState();
}

let st = loadState();
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) {} }, 300);
}

// runtime (not saved)
const rt = st.devices.map(() => ({ chainPos: 0, queued: null, cursor: 0 }));
const ui = { dev: 0, mode: 'play', rec: false, playing: false, playStep: -1, copyArmed: false, clearArmedAt: 0 };

const isSynth = di => di > 0;
function noteFor(dev, track) {
  const sc = SCALES[dev.scale];
  return 12 * (dev.oct + 1) + dev.root + sc[track % sc.length] + 12 * Math.floor(track / sc.length);
}
function trackName(di, k) {
  return di === 0 ? DRUM_NAMES[k] : noteName(noteFor(st.devices[di], k));
}
const stepOn = (pat, k, s) => (pat.g[k] >> s) & 1;
const stepTracks = (pat, s) => range(0, 16).filter(k => stepOn(pat, k, s));
function leadNotes(dev, k) {
  const base = noteFor(dev, k);
  switch (chordIdx(dev.params.chord)) {
    case 1: return [base, base + 12];
    case 2: return [base, base + 7];
    case 3: return [base, noteFor(dev, k + 2), noteFor(dev, k + 4)];
    case 4: return [base, noteFor(dev, k + 2), noteFor(dev, k + 4), noteFor(dev, k + 6)];
    default: return [base];
  }
}

// ---------------------------------------------------------------- audio
let ctx = null, A = null, noiseBuf = null;

function makeCurve(fn, n = 2048) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fn(i / (n - 1) * 2 - 1);
  return c;
}
function makeIR(sec) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * .4; d[i] = lp * (1 - i / len) ** 3.5; }
  }
  return b;
}

function initAudio() {
  if (ctx) { resumeAudio(); return; }
  // let audio play even when the iPhone's silent switch is on
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });

  const input = ctx.createGain();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = .7;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 10; hp.Q.value = .7;
  const crush = ctx.createWaveShaper();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 4;
  comp.attack.value = .004; comp.release.value = .15;
  const out = ctx.createGain(); out.gain.value = .9;
  input.connect(lp); lp.connect(hp); hp.connect(crush); crush.connect(comp); comp.connect(out); out.connect(ctx.destination);

  // echo (dotted 8th)
  const send = ctx.createGain(); send.gain.value = 0;
  const dly = ctx.createDelay(2);
  const dlyTone = ctx.createBiquadFilter(); dlyTone.type = 'lowpass'; dlyTone.frequency.value = 3000;
  const fb = ctx.createGain(); fb.gain.value = .45;
  crush.connect(send); send.connect(dly); dly.connect(dlyTone); dlyTone.connect(fb); fb.connect(dly); dlyTone.connect(comp);

  // jet phaser / flanger
  const flD = ctx.createDelay(.05); flD.delayTime.value = .004;
  const flFb = ctx.createGain(); flFb.gain.value = .65;
  const flWet = ctx.createGain(); flWet.gain.value = 0;
  const flLfo = ctx.createOscillator(); flLfo.frequency.value = .2;
  const flLfoG = ctx.createGain(); flLfoG.gain.value = .0032;
  flLfo.connect(flLfoG); flLfoG.connect(flD.delayTime); flLfo.start();
  crush.connect(flD); flD.connect(flFb); flFb.connect(flD); flD.connect(flWet); flWet.connect(comp);

  // reverb
  const verb = ctx.createConvolver(); verb.buffer = makeIR(2.8);
  const verbOut = ctx.createGain(); verbOut.gain.value = .9;
  verb.connect(verbOut); verbOut.connect(input);

  // per-device: bus (volume) -> duck (sidechain) -> master, + reverb send
  const buses = [], ducks = [], verbSends = [];
  st.devices.forEach((dev, i) => {
    const b = ctx.createGain(); b.gain.value = dev.vol;
    const dk = ctx.createGain(); dk.gain.value = 1;
    const vs = ctx.createGain(); vs.gain.value = dev.verb;
    b.connect(dk); dk.connect(input); dk.connect(vs); vs.connect(verb);
    buses.push(b); ducks.push(dk); verbSends.push(vs);
  });

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  A = {
    input, lp, hp, crush, comp, send, dly, flWet, buses, ducks, verbSends,
    satCurve: makeCurve(x => Math.tanh(x * 3) / Math.tanh(3)),
    softCurve: makeCurve(x => Math.tanh(x * 1.6) / Math.tanh(1.6)),
    crushCurve: makeCurve(x => Math.round(Math.tanh(x * 2) * 7) / 7, 4096),
    driveCurves: range(0, 6).map(i => { const d = 1 + i * 2.2; return makeCurve(x => Math.tanh(x * d) / Math.tanh(d)); }),
  };

  // iOS unlock: play one silent sample inside the user gesture
  const b = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource();
  src.buffer = b; src.connect(ctx.destination); src.start(0);
  resumeAudio();
  applyFx();
}
function resumeAudio() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }

// sidechain: duck bass + lead on every kick
function pump(t) {
  const a = st.pump; if (!a || !A) return;
  const depth = 1 - a * .85, back = stepDur() * .55;
  for (const di of [1, 2]) {
    const g = A.ducks[di].gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(depth, t, .004);
    g.setTargetAtTime(1, t + .03, back);
  }
}

// --- small building blocks
function vca(t, peak, dec, dest, att = .001) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + att);
  g.gain.exponentialRampToValueAtTime(.0005, t + att + dec);
  g.connect(dest);
  return g;
}
function osc(type, f, t, end, dest) {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.connect(dest); o.start(t); o.stop(end);
  return o;
}
function noise(t, end, dest) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(end);
  return s;
}
function filt(type, f, q, dest) {
  const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
  b.connect(dest); return b;
}
function shaper(curve, dest) { const w = ctx.createWaveShaper(); w.curve = curve; w.connect(dest); return w; }
function metal(t, dec, tm, dest, peak, hpF = 7000) {
  const g = vca(t, peak, dec, dest);
  const bp = filt('bandpass', 10000, .8, filt('highpass', hpF, .7, g));
  const end = t + dec + .05;
  for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) osc('square', f * tm, t, end, bp);
}

// --- drums (909 / 808 / electronic-tom flavoured)
function drumHit(i, t, p, bus) {
  const tm = 2 ** ((p.tune - .5) * 2), dm = 2 ** ((p.decay - .5) * 3);
  const out = ctx.createGain(); out.gain.value = p.level * 1.1; out.connect(bus);
  const d = filt('lowpass', 150 * 2 ** (p.tone * 7.1), .7, out);
  let o, len;
  switch (i) {
    case 0: { // KICK — punchy 909 style
      len = .5 * dm;
      o = osc('sine', 230 * tm, t, t + len + .05, vca(t, 1, len, shaper(A.softCurve, d)));
      o.frequency.exponentialRampToValueAtTime(52 * tm, t + .06);
      noise(t, t + .02, filt('highpass', 3000, .7, vca(t, .45, .008, d)));
      break; }
    case 1: { // 808 — long boomy kick
      len = .9 * dm;
      o = osc('sine', 125 * tm, t, t + len + .05, vca(t, 1, len, shaper(A.softCurve, d)));
      o.frequency.exponentialRampToValueAtTime(47 * tm, t + .1);
      break; }
    case 2: { // SNARE — 909 style
      len = .22 * dm;
      const tv = vca(t, .5, .08 * dm, d);
      osc('triangle', 185 * tm, t, t + .2, tv).frequency.exponentialRampToValueAtTime(160 * tm, t + .07);
      osc('triangle', 330 * tm, t, t + .2, tv).frequency.exponentialRampToValueAtTime(290 * tm, t + .07);
      noise(t, t + len + .05, filt('highpass', 1800 * tm, .7, vca(t, .7, len, d)));
      break; }
    case 3: { // CLAP
      len = .24 * dm;
      const g = ctx.createGain(); g.connect(d);
      const gg = g.gain; gg.setValueAtTime(0, t);
      for (let k = 0; k < 3; k++) { const tk = t + k * .011; gg.setValueAtTime(1, tk); gg.exponentialRampToValueAtTime(.05, tk + .009); }
      gg.setValueAtTime(1, t + .033); gg.exponentialRampToValueAtTime(.0005, t + .033 + len);
      noise(t, t + len + .06, filt('bandpass', 1150 * tm, 1.1, g));
      break; }
    case 4: case 5: { // HATS — metallic + noise
      len = (i === 4 ? .045 : .32) * dm;
      metal(t, len, tm, d, .26);
      noise(t, t + len + .03, filt('highpass', 8000 * tm, .7, vca(t, .18, len, d)));
      break; }
    case 6: { // RIDE
      len = 1.3 * dm;
      metal(t, len, tm * 1.55, d, .14, 5000);
      osc('sine', 3150 * tm, t, t + .6, vca(t, .06, .4 * dm, d));
      break; }
    case 7: { // CRASH
      len = 1.4 * dm;
      metal(t, len, tm * 1.2, d, .2, 5000);
      noise(t, t + len, filt('highpass', 5000, .7, vca(t, .2, len * .8, d)));
      break; }
    case 8: case 9: case 10: { // TOMS — electronic, pitch-diving
      const f = [92, 135, 195][i - 8] * tm;
      len = .5 * dm;
      o = osc('triangle', f * 1.7, t, t + len + .05, vca(t, .85, len, d));
      o.frequency.exponentialRampToValueAtTime(f * .75, t + len);
      noise(t, t + .06, filt('bandpass', f * 6, 1, vca(t, .25, .04, d)));
      break; }
    case 11: { // RIM
      // woody rimshot: low body + band-passed snap (the old 1.7 kHz blip sounded like a metronome)
      len = .06 * dm;
      const bp = filt('bandpass', 1100 * tm, 1.6, d);
      osc('triangle', 520 * tm, t, t + .12, vca(t, .5, len, bp));
      osc('square', 820 * tm, t, t + .12, vca(t, .18, len * .6, bp));
      noise(t, t + .03, filt('bandpass', 2500 * tm, 1.2, vca(t, .2, .012, d)));
      break; }
    case 12: { // COWBELL
      len = .3 * dm;
      const bp = filt('bandpass', 800 * tm, 2, vca(t, .55, len, d));
      osc('square', 545 * tm, t, t + len + .05, bp); osc('square', 815 * tm, t, t + len + .05, bp);
      break; }
    case 13: len = .09 * dm; noise(t, t + len + .08, filt('bandpass', 6500 * tm, 1.5, vca(t, .45, len, d, .02))); break; // SHAKER
    case 14: { // SUB — sustained 808 bass hit
      len = 1.2 * dm;
      o = osc('sine', 80 * tm, t, t + len + .05, vca(t, .9, len, shaper(A.satCurve, d)));
      o.frequency.exponentialRampToValueAtTime(52 * tm, t + .08);
      break; }
    case 15: { // ZAP
      len = .15 * dm;
      o = osc('sine', 1800 * tm, t, t + len + .05, vca(t, .55, len, d));
      o.frequency.exponentialRampToValueAtTime(70 * tm, t + .12 * dm);
      break; }
  }
  if (KICKS.has(i)) pump(t);
  const ms = (t - ctx.currentTime + (len || .3) + .4) * 1000;
  setTimeout(() => out.disconnect(), ms);
}

// --- synth envelopes: returns a release(time) function
function envAR(param, t, peak, att, dur, rel) {
  param.setValueAtTime(0, t);
  if (dur == null || dur >= att) {
    param.linearRampToValueAtTime(peak, t + att);
    if (dur != null) { param.setValueAtTime(peak, t + dur); param.setTargetAtTime(0, t + dur, rel / 4); }
  } else {
    param.linearRampToValueAtTime(peak * dur / att, t + dur);
    param.setTargetAtTime(0, t + dur, rel / 4);
  }
  return r => {
    r = Math.max(r, t);
    const v = r >= t + att ? peak : peak * (r - t) / att;
    param.cancelScheduledValues(r); param.setValueAtTime(v, r); param.setTargetAtTime(0, r, rel / 4);
    return r + rel * 1.3 + .05;
  };
}

let bassLastF = 0;
function bassVoice(midi, t, dur, p, bus) {
  const f = mtof(midi);
  const glide = p.glide * p.glide * .35;
  const o = ctx.createOscillator(); o.type = BASS_WAVES[idx4(p.wave)];
  const sub = ctx.createOscillator(); sub.type = 'sine';
  if (glide > .004 && bassLastF) {
    o.frequency.setValueAtTime(bassLastF, t); o.frequency.exponentialRampToValueAtTime(f, t + glide);
    sub.frequency.setValueAtTime(bassLastF / 2, t); sub.frequency.exponentialRampToValueAtTime(f / 2, t + glide);
  } else { o.frequency.setValueAtTime(f, t); sub.frequency.setValueAtTime(f / 2, t); }
  bassLastF = f;
  const fl = ctx.createBiquadFilter(); fl.type = 'lowpass';
  const base = 50 * 2 ** (p.cutoff * 7.5);
  const peakF = Math.min(18000, base * 2 ** (p.env * 5));
  const dec = .04 + p.decay * p.decay * 1.5;
  fl.Q.value = .5 + p.reso * 18;
  fl.frequency.setValueAtTime(peakF, t); fl.frequency.exponentialRampToValueAtTime(base, t + dec);
  const subG = ctx.createGain(); subG.gain.value = .35;
  const g = ctx.createGain();
  o.connect(fl); sub.connect(subG); subG.connect(fl);
  const di = Math.round(p.drive * 5);
  if (di > 0) fl.connect(shaper(A.driveCurves[di], g)); else fl.connect(g);
  g.connect(bus);
  const release = envAR(g.gain, t, .5 / (1 + p.reso * .7) / (1 + di * .12), .004, dur, .06);
  o.start(t); sub.start(t);
  const stopAll = end => { o.stop(end); sub.stop(end); setTimeout(() => g.disconnect(), (end - ctx.currentTime + .2) * 1000); };
  if (dur != null) { stopAll(t + dur + .15); return null; }
  return r => stopAll(release(r));
}

function leadVoice(midi, t, dur, p, bus, nVoices = 1) {
  const f = mtof(midi), type = LEAD_WAVES[idx4(p.wave)];
  const att = .002 + p.attack * p.attack * 1.5, rel = .03 + p.release * p.release * 2.5;
  const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2;
  const base = 200 * 2 ** (p.cutoff * 6.4);
  fl.frequency.setValueAtTime(Math.min(18000, base * 2.2), t);
  fl.frequency.exponentialRampToValueAtTime(base, t + .25);
  const g = ctx.createGain(); fl.connect(g); g.connect(bus);
  let detunes, oscType;
  if (type === 'super') { const w = 8 + p.detune * 40; detunes = [-1, -.5, 0, .5, 1].map(x => x * w); oscType = 'sawtooth'; }
  else { detunes = [-p.detune * 28, p.detune * 28]; oscType = type; }
  const oscs = detunes.map(c => {
    const o = ctx.createOscillator(); o.type = oscType; o.frequency.value = f; o.detune.value = c;
    o.connect(fl); o.start(t); return o;
  });
  const peak = (oscType === 'triangle' ? .3 : .34 / oscs.length) / Math.sqrt(nVoices);
  const release = envAR(g.gain, t, peak, att, dur, rel);
  const stopAll = end => { oscs.forEach(o => o.stop(end)); setTimeout(() => g.disconnect(), (end - ctx.currentTime + .2) * 1000); };
  if (dur != null) { stopAll(t + dur + rel * 1.3 + .05); return null; }
  return r => stopAll(release(r));
}
function leadChord(dev, k, t, dur, bus) {
  const notes = leadNotes(dev, k);
  return notes.map(m => leadVoice(m, t, dur, dev.params, bus, notes.length)).filter(Boolean);
}

// ---------------------------------------------------------------- fx
const activeFx = new Set();
let fxRepeatOrder = [];
const rep = { len: 0, startCounter: 0, startStep: 0 };

function applyFx() {
  if (!ctx) return;
  const t = ctx.currentTime, a = activeFx;
  const lpOn = a.has('lp'), hpOn = a.has('hp');
  // LOW / HIGH sweep gradually while held, snap back on release
  A.lp.frequency.setTargetAtTime(lpOn ? 180 : 20000, t, lpOn ? .6 : .04);
  A.lp.Q.setTargetAtTime(lpOn ? 7 : .7, t, .05);
  A.hp.frequency.setTargetAtTime(hpOn ? 3500 : 10, t, hpOn ? .6 : .04);
  A.hp.Q.setTargetAtTime(hpOn ? 4 : .7, t, .05);
  A.crush.curve = a.has('crush') ? A.crushCurve : null;
  A.dly.delayTime.setTargetAtTime(stepDur() * 3, t, .02);
  A.send.gain.setTargetAtTime(a.has('dly') ? .6 : 0, t, .02);
  A.flWet.gain.setTargetAtTime(a.has('phase') ? .8 : 0, t, .03);
}
function wantedRepeat() {
  const last = fxRepeatOrder[fxRepeatOrder.length - 1];
  return last ? FX.find(f => f.id === last).len : 0;
}

// ---------------------------------------------------------------- sequencer
const stepDur = () => 60 / st.bpm / 4;
let timer = 0, counter = 0, nextTime = 0;
let uiQueue = [], recent = [], skipOnce = null;

function advancePatterns() {
  st.devices.forEach((dev, di) => {
    const r = rt[di];
    if (r.queued != null) {
      dev.cur = r.queued; r.queued = null; r.chainPos = Math.max(0, dev.chain.indexOf(dev.cur));
    } else if (dev.chain.length > 1) {
      r.chainPos = (r.chainPos + 1) % dev.chain.length; dev.cur = dev.chain[r.chainPos];
    }
  });
}

function scheduleStep(c, t) {
  const ps = c % STEPS;
  if (ps === 0 && c > 0) advancePatterns();
  const want = wantedRepeat();
  if (want !== rep.len) {
    rep.len = want;
    if (want) { rep.startCounter = c - (c % want); rep.startStep = rep.startCounter % STEPS; }
  }
  const s = rep.len ? (rep.startStep + ((c - rep.startCounter) % rep.len)) % STEPS : ps;
  const sd = stepDur();

  st.devices.forEach((dev, di) => {
    if (dev.mute) return;
    const pat = dev.patterns[dev.cur], bus = A.buses[di];
    const skip = k => skipOnce && skipOnce.c === c && skipOnce.di === di && skipOnce.k === k;
    if (di === 0) {
      for (let k = 0; k < 16; k++) if (stepOn(pat, k, s) && !skip(k)) drumHit(k, t, dev.params[k], bus);
    } else if (di === 1) {
      for (let k = 0; k < 16; k++) if (stepOn(pat, k, s)) { // mono: lowest note wins
        if (!skip(k)) bassVoice(noteFor(dev, k), t, sd * (dev.params.glide > .06 ? 1.02 : .8), dev.params, bus);
        break;
      }
    } else {
      const p = dev.params, tie = p.gate > .92 && !rep.len;
      for (let k = 0; k < 16; k++) {
        if (!stepOn(pat, k, s) || skip(k)) continue;
        let dur;
        if (tie) {
          if (s > 0 && stepOn(pat, k, s - 1)) continue; // already sustaining
          let r = 1; while (s + r < STEPS && stepOn(pat, k, s + r)) r++;
          dur = r * sd * .98;
        } else dur = sd * (.1 + p.gate * .9);
        leadChord(dev, k, t, dur, bus);
      }
    }
  });
  const entry = { t, s, ps, c, pats: st.devices.map(d => d.cur) };
  uiQueue.push(entry);
  recent.push(entry); if (recent.length > 8) recent.shift();
}

function swingOffset(c) { return (c % 2) ? st.swing * stepDur() * .66 : 0; }

function scheduler() {
  if (!ctx) return;
  if (nextTime < ctx.currentTime - .2) nextTime = ctx.currentTime + .05; // after an interruption, don't catch up
  while (nextTime < ctx.currentTime + .12) {
    scheduleStep(counter, nextTime + swingOffset(counter));
    nextTime += stepDur();
    counter++;
  }
}

function start() {
  initAudio();
  st.devices.forEach((dev, di) => {
    const r = rt[di];
    if (r.queued != null) { dev.cur = r.queued; r.queued = null; }
    if (dev.chain.indexOf(dev.cur) < 0) dev.chain = [dev.cur];
    r.chainPos = dev.chain.indexOf(dev.cur);
  });
  counter = 0; bassLastF = 0; uiQueue = []; recent = [];
  nextTime = ctx.currentTime + .06;
  ui.playing = true; ui.startedAt = performance.now();
  scheduler();
  timer = setInterval(scheduler, 25);
  renderAll();
}
function stop() {
  ui.playing = false;
  clearInterval(timer);
  uiQueue = []; recent = [];
  ui.playStep = -1;
  renderAll();
}

// ---------------------------------------------------------------- live playing
const liveVoices = new Map(); // pointerId -> [release fns]

function triggerLive(di, k, pointerId) {
  initAudio();
  const dev = st.devices[di], t = ctx.currentTime + .005, bus = A.buses[di];
  if (di === 0) { drumHit(k, t, dev.params[k], bus); return; }
  releaseLive(pointerId);
  let rels;
  if (di === 1) { bassLastF = 0; rels = [bassVoice(noteFor(dev, k), t, null, dev.params, bus)]; }
  else rels = leadChord(dev, k, t, null, bus);
  liveVoices.set(pointerId, rels);
}
function releaseLive(pointerId) {
  const rels = liveVoices.get(pointerId);
  if (rels) { rels.forEach(r => r && r(ctx.currentTime)); liveVoices.delete(pointerId); }
}
function previewStep(di, s) {
  initAudio();
  const dev = st.devices[di], pat = dev.patterns[dev.cur], t = ctx.currentTime + .005, bus = A.buses[di];
  const ks = stepTracks(pat, s);
  if (di === 1 && ks.length) { bassLastF = 0; bassVoice(noteFor(dev, ks[0]), t, .2, dev.params, bus); }
  if (di === 2) ks.forEach(k => leadChord(dev, k, t, .3, bus));
}

function recordHit(di, k) {
  const now = ctx.currentTime;
  const upcoming = { t: nextTime + swingOffset(counter), ps: counter % STEPS, c: counter, pats: null, future: true };
  let best = upcoming, bd = Math.abs(upcoming.t - now);
  for (const e of recent) { const d = Math.abs(e.t - now); if (d < bd) { bd = d; best = e; } }
  const dev = st.devices[di];
  const pat = dev.patterns[best.pats ? best.pats[di] : dev.cur];
  if (di === 1) for (let j = 0; j < 16; j++) pat.g[j] &= ~(1 << best.ps); // bass is mono
  pat.g[k] |= 1 << best.ps;
  if (best.future) skipOnce = { c: best.c, di, k }; // we already heard it live
  save(); drawMatrix();
}

// ---------------------------------------------------------------- UI
const els = {
  tabs: $('#tabs'), knobs: $('#knobs'), keys: $('#keys'), wgrid: $('#wgrid'), wsteps: $('#wsteps'), wnotes: $('#wnotes'),
  fx: $('#fx'), matrix: $('#matrix'),
  scrDev: $('#scrDev'), scrInfo: $('#scrInfo'), scrMode: $('#scrMode'), scrSel: $('#scrSel'), scrMsg: $('#scrMsg'),
  fnCtx: $('#fnCtx'), fnWrite: $('#fnWrite'), fnPattern: $('#fnPattern'), fnRec: $('#fnRec'), play: $('#playBtn'),
  bpmVal: $('#bpmVal'), sheet: $('#sheet'), sheetBody: $('#sheetBody'),
};
const curDev = () => st.devices[ui.dev];
const curPat = () => curDev().patterns[curDev().cur];

let msgTimer = 0;
function flash(msg) {
  els.scrMsg.textContent = msg;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { els.scrMsg.textContent = ''; }, 1500);
}

// pointer helper: fires down/up reliably with capture, prevents scroll/zoom/emulated mouse
function onPress(el, down, up) {
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    down(e);
  });
  if (up) {
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}

// --- tabs
DEFS.forEach((d, i) => {
  const b = document.createElement('button');
  b.className = 'tab'; b.style.setProperty('--c', d.color);
  b.innerHTML = `${d.name}<span class="dot"></span>`;
  onPress(b, () => {
    if (ui.dev === i) { toggleMute(i); }
    else { ui.dev = i; ui.copyArmed = false; buildKnobs(); }
    renderAll();
  });
  els.tabs.appendChild(b);
});
function toggleMute(i) { st.devices[i].mute = !st.devices[i].mute; flash(st.devices[i].mute ? 'MUTED // SHHH' : 'BACK ONLINE'); save(); }

// --- knobs
function arcPath(v) {
  const a0 = -135, a1 = -135 + 270 * v, r = 18, cx = 24, cy = 24;
  const pt = a => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}
function knobTarget() { return ui.dev === 0 ? curDev().params[curDev().sel] : curDev().params; }
let knobEls = [];
function buildKnobs() {
  const def = DEFS[ui.dev];
  els.knobs.innerHTML = '';
  els.knobs.style.setProperty('--n', def.knobs.length);
  els.knobs.classList.toggle('many', def.knobs.length > 6);
  knobEls = def.knobs.map(kd => {
    const w = document.createElement('div'); w.className = 'knob';
    w.innerHTML = `<svg viewBox="0 0 48 48"><circle class="kbg" cx="24" cy="24" r="14"/>
      <path class="ktrack" d="${arcPath(1)}"/><path class="kval"/><line class="kptr" x1="24" y1="24" x2="24" y2="14"/></svg>
      <label>${kd.label}</label>`;
    let sy = 0, sv = 0, lastTap = 0;
    onPress(w, e => {
      const now = performance.now();
      if (now - lastTap < 300) { knobTarget()[kd.k] = kd.def; updateKnobs(); showKnob(kd); save(); }
      lastTap = now;
      sy = e.clientY; sv = knobTarget()[kd.k];
      w.classList.add('active'); showKnob(kd);
    }, () => w.classList.remove('active'));
    w.addEventListener('pointermove', e => {
      if (!w.hasPointerCapture(e.pointerId)) return;
      const v = clamp(sv + (sy - e.clientY) / 160, 0, 1);
      knobTarget()[kd.k] = v; updateKnob(w, v); showKnob(kd); save();
    });
    return w;
  });
  knobEls.forEach(w => els.knobs.appendChild(w));
  updateKnobs();
}
function showKnob(kd) { const v = knobTarget()[kd.k]; flash(`${kd.label} ${kd.fmt ? kd.fmt(v) : pct(v)}`); }
function updateKnob(w, v) {
  w.querySelector('.kval').setAttribute('d', v > .002 ? arcPath(v) : '');
  w.querySelector('.kptr').setAttribute('transform', `rotate(${-135 + 270 * v} 24 24)`);
}
function updateKnobs() {
  const p = knobTarget();
  DEFS[ui.dev].knobs.forEach((kd, i) => updateKnob(knobEls[i], p[kd.k]));
}

// --- function buttons
// The first button changes with the mode: MUTE (play) · CLEAR or REST (write) · COPY (pattern)
function ctxLabel() {
  if (ui.mode === 'write') return isSynth(ui.dev) ? 'REST' : 'CLEAR';
  if (ui.mode === 'pattern') return 'COPY';
  return 'MUTE';
}
onPress(els.fnCtx, () => {
  const dev = curDev(), r = rt[ui.dev];
  if (ui.mode === 'play') toggleMute(ui.dev);
  else if (ui.mode === 'pattern') { ui.copyArmed = !ui.copyArmed; flash(ui.copyArmed ? `COPY P${pad2(dev.cur + 1)} → TAP SLOT` : ''); }
  else if (isSynth(ui.dev)) { // REST: clear the step under the cursor, move on
    const bit = 1 << r.cursor; curPat().g.forEach((_, k) => { curPat().g[k] &= ~bit; });
    r.cursor = (r.cursor + 1) % STEPS; save();
  } else { // CLEAR the selected drum sound (tap twice)
    const now = performance.now();
    if (now - ui.clearArmedAt < 1500) { curPat().g[dev.sel] = 0; ui.clearArmedAt = 0; flash(`NUKED ${DRUM_NAMES[dev.sel]}`); save(); }
    else { ui.clearArmedAt = now; flash(`TAP AGAIN TO NUKE ${DRUM_NAMES[dev.sel]}`); }
  }
  renderAll();
});
function setMode(m) {
  ui.mode = ui.mode === m ? 'play' : m;
  ui.copyArmed = false; patHeld = []; patDown = 0; notesHeld.clear();
  renderAll();
}
onPress(els.fnWrite, () => setMode('write'));
onPress(els.fnPattern, () => setMode('pattern'));
onPress(els.fnRec, () => { ui.rec = !ui.rec; renderAll(); });
onPress(els.play, () => { initAudio(); ui.playing ? stop() : start(); });

// --- 4×4 keys (play + pattern modes)
const keyEls = [];
let patHeld = [], patDown = 0;
for (let k = 0; k < 16; k++) {
  const b = document.createElement('button');
  b.className = 'key';
  b.innerHTML = `<span class="num">${k + 1}</span><span class="led"></span><span class="lbl"></span>`;
  onPress(b, e => { b.classList.add('down'); resumeAudio(); keyDown(k, e.pointerId); },
             e => { b.classList.remove('down'); keyUp(k, e.pointerId); });
  keyEls.push(b); els.keys.appendChild(b);
}

function keyDown(k, pid) {
  const dev = curDev(), di = ui.dev;
  if (ui.mode === 'play') {
    dev.sel = k;
    triggerLive(di, k, pid);
    if (ui.rec && ui.playing) recordHit(di, k);
    if (di === 0) updateKnobs();
    save(); renderAll();
    return;
  }
  if (ui.mode === 'pattern') {
    if (ui.copyArmed) {
      ui.copyArmed = false;
      if (k !== dev.cur) { dev.patterns[k] = JSON.parse(JSON.stringify(curPat())); save(); flash(`COPIED TO P${pad2(k + 1)}`); }
      renderAll(); return;
    }
    patHeld.push(k); patDown++; renderKeys();
  }
}
function keyUp(k, pid) {
  releaseLive(pid);
  if (ui.mode !== 'pattern' || !patDown) return;
  patDown--;
  if (patDown > 0) return;
  const list = patHeld; patHeld = [];
  const dev = curDev(), r = rt[ui.dev];
  dev.chain = list.slice();
  if (ui.playing) { r.queued = list[0]; flash(list.length > 1 ? 'CHAIN QUEUED' : `NEXT P${pad2(list[0] + 1)}`); }
  else { dev.cur = list[0]; r.chainPos = 0; flash(list.length > 1 ? `CHAIN ×${list.length}` : `P${pad2(list[0] + 1)}`); }
  save(); renderAll();
}

// --- write grid: 16 steps on top, 16 sounds/notes below (no view switching)
const stepEls = [], noteEls = [];
// synth note keys are laid out like a keyboard: low notes on the bottom row
const noteTrackAt = i => isSynth(ui.dev) ? (i < 8 ? i + 8 : i - 8) : i;
const notesHeld = new Set();
let entryMade = false, lastStepTap = { s: -1, t: 0 };

for (let s = 0; s < 16; s++) {
  const b = document.createElement('button');
  b.className = 'wkey step';
  b.innerHTML = `<span class="num">${s + 1}</span><span class="lbl"></span>`;
  onPress(b, () => { b.classList.add('down'); resumeAudio(); stepDown(s); }, () => b.classList.remove('down'));
  stepEls.push(b); els.wsteps.appendChild(b);
}
for (let i = 0; i < 16; i++) {
  const b = document.createElement('button');
  b.className = 'wkey note';
  b.innerHTML = `<span class="lbl"></span>`;
  onPress(b, e => { b.classList.add('down'); resumeAudio(); noteDown(noteTrackAt(i), e.pointerId); },
             e => { b.classList.remove('down'); noteUp(e.pointerId); });
  noteEls.push(b); els.wnotes.appendChild(b);
}

function stepDown(s) {
  const dev = curDev(), di = ui.dev, pat = curPat();
  if (di === 0) { // drums: toggle the selected sound on this step
    const on = stepOn(pat, dev.sel, s);
    pat.g[dev.sel] ^= 1 << s;
    if (!on && !ui.playing) triggerLive(0, dev.sel, -1);
  } else { // synths: move the cursor here; double-tap clears the step
    const r = rt[di], now = performance.now();
    if (lastStepTap.s === s && now - lastStepTap.t < 320) {
      pat.g.forEach((_, k) => { pat.g[k] &= ~(1 << s); });
      flash(`STEP ${s + 1} WIPED`); lastStepTap.s = -1;
    } else {
      r.cursor = s; lastStepTap = { s, t: now };
      if (!ui.playing) previewStep(di, s);
    }
  }
  save(); renderAll();
}

function noteDown(k, pid) {
  const dev = curDev(), di = ui.dev;
  if (di === 0) { // drums: pick the sound (and hear it)
    dev.sel = k; triggerLive(0, k, pid); updateKnobs(); save(); renderAll(); return;
  }
  // synths: write the note at the cursor. Hold one note and tap others for a chord (lead).
  const r = rt[di], pat = curPat(), bit = 1 << r.cursor;
  const chordAdd = di === 2 && notesHeld.size > 0;
  if (!chordAdd) pat.g.forEach((_, j) => { pat.g[j] &= ~bit; });
  pat.g[k] |= bit;
  dev.sel = k;
  notesHeld.add(pid); entryMade = true;
  triggerLive(di, k, pid);
  save(); renderAll();
}
function noteUp(pid) {
  releaseLive(pid);
  if (!notesHeld.delete(pid)) return;
  if (notesHeld.size === 0 && entryMade) {
    entryMade = false;
    const r = rt[ui.dev]; r.cursor = (r.cursor + 1) % STEPS; // auto-advance like a step sequencer
    renderAll();
  }
}

// --- fx buttons
FX.forEach(fx => {
  const b = document.createElement('button');
  b.className = 'fxb'; b.textContent = fx.label;
  onPress(b, () => {
    initAudio();
    activeFx.add(fx.id); b.classList.add('on');
    if (fx.len) fxRepeatOrder.push(fx.id);
    applyFx();
  }, () => {
    activeFx.delete(fx.id); b.classList.remove('on');
    fxRepeatOrder = fxRepeatOrder.filter(id => id !== fx.id);
    applyFx();
  });
  els.fx.appendChild(b);
});

// --- rendering
function setCls(el, cls) { if (el.className !== cls) el.className = cls; }
function setLbl(el, txt) { const l = el.querySelector('.lbl'); if (l.textContent !== txt) l.textContent = txt; }

function renderKeys() {
  const write = ui.mode === 'write';
  els.keys.classList.toggle('hidden', write);
  els.wgrid.classList.toggle('hidden', !write);
  if (write) return renderWrite();
  const dev = curDev(), di = ui.dev, pat = curPat(), r = rt[di];
  keyEls.forEach((b, k) => {
    let cls = 'key', lbl = '';
    if (ui.mode === 'play') {
      lbl = trackName(di, k);
      if (k === dev.sel) cls += ' sel';
      if (ui.playing && ui.playStep >= 0 && stepOn(pat, k, ui.playStep)) cls += ' trig';
    } else {
      lbl = 'P' + pad2(k + 1);
      if (dev.patterns[k].g.some(x => x)) cls += ' has';
      if (dev.chain.length > 1 && dev.chain.includes(k)) cls += ' chain';
      if (k === dev.cur) cls += ' cur';
      if (r.queued === k) cls += ' queued';
      if (patHeld.includes(k)) cls += ' on';
    }
    setCls(b, cls); setLbl(b, lbl);
  });
}

function renderWrite() {
  const dev = curDev(), di = ui.dev, pat = curPat(), synth = isSynth(di), cursor = rt[di].cursor;
  stepEls.forEach((b, s) => {
    let cls = 'wkey step', lbl = '';
    if (s % 4 === 0) cls += ' beat';
    if (s === ui.playStep) cls += ' ph';
    if (synth) {
      const ks = stepTracks(pat, s);
      if (ks.length) { cls += ' on'; lbl = trackName(di, ks[0]) + (ks.length > 1 ? '+' : ''); }
      if (s === cursor) cls += ' cursor';
    } else if (stepOn(pat, dev.sel, s)) cls += ' on';
    else if (stepTracks(pat, s).length) cls += ' any';
    setCls(b, cls); setLbl(b, lbl);
  });
  const atCursor = synth ? stepTracks(pat, cursor) : [];
  noteEls.forEach((b, i) => {
    const k = noteTrackAt(i);
    let cls = 'wkey note';
    if (synth) {
      if (atCursor.includes(k)) cls += ' on';
      if (k % SCALES[dev.scale].length === 0) cls += ' root';
    } else {
      if (k === dev.sel) cls += ' on';
      else if (pat.g[k]) cls += ' has';
    }
    if (ui.playing && ui.playStep >= 0 && stepOn(pat, k, ui.playStep)) cls += ' trig';
    setCls(b, cls); setLbl(b, trackName(di, k));
  });
}

function renderScreen() {
  const def = DEFS[ui.dev], dev = curDev(), r = rt[ui.dev];
  document.documentElement.style.setProperty('--accent', def.color);
  els.scrDev.textContent = def.name + (dev.mute ? ' (MUTE)' : '');
  let info = `P${pad2(dev.cur + 1)}`;
  if (dev.chain.length > 1) info += ` [${dev.chain.map(n => n + 1).join(' ')}]`;
  if (r.queued != null) info += ` → P${pad2(r.queued + 1)}`;
  els.scrInfo.textContent = info;
  els.scrMode.textContent = ui.mode.toUpperCase() + (ui.rec ? ' ● REC' : '');
  els.scrMode.classList.toggle('rec', ui.rec);
  if (ui.mode === 'write' && isSynth(ui.dev)) {
    const ks = stepTracks(curPat(), r.cursor);
    els.scrSel.textContent = `STEP ${pad2(r.cursor + 1)} ${ks.length ? ks.map(k => trackName(ui.dev, k)).join(' ') : '—'}`;
  } else els.scrSel.textContent = `${def.selLabel} ${pad2(dev.sel + 1)} ${trackName(ui.dev, dev.sel)}`;
}

function renderButtons() {
  els.fnCtx.textContent = ctxLabel();
  els.fnCtx.classList.toggle('on', (ui.mode === 'play' && curDev().mute) || (ui.mode === 'pattern' && ui.copyArmed));
  els.fnWrite.classList.toggle('on', ui.mode === 'write');
  els.fnPattern.classList.toggle('on', ui.mode === 'pattern');
  els.fnRec.classList.toggle('on', ui.rec);
  els.play.classList.toggle('on', ui.playing);
  els.play.textContent = ui.playing ? '■' : '▶';
  [...els.tabs.children].forEach((t, i) => {
    t.classList.toggle('active', i === ui.dev);
    t.classList.toggle('muted', st.devices[i].mute);
  });
  els.bpmVal.textContent = Math.round(st.bpm);
}

function sizeMatrix() {
  const c = els.matrix, dpr = window.devicePixelRatio || 1;
  c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr);
}
function drawMatrix() {
  const c = els.matrix, g = c.getContext('2d'), W = c.width, H = c.height;
  if (!W || !H) return;
  const dev = curDev(), pat = curPat(), col = DEFS[ui.dev].color;
  const cw = W / 16, rh = H / 16;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.045)';
  g.fillRect(0, (15 - dev.sel) * rh, W, rh);
  if (ui.mode === 'write' && isSynth(ui.dev)) {
    g.strokeStyle = col; g.lineWidth = Math.max(1, W / 400);
    g.strokeRect(rt[ui.dev].cursor * cw + 1, 1, cw - 2, H - 2);
  }
  if (ui.playStep >= 0) { g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(ui.playStep * cw, 0, cw, H); }
  const w = Math.max(2, cw * .62), h = Math.max(2, rh * .62);
  const dpr = window.devicePixelRatio || 1;
  const lit = [];
  for (let k = 0; k < 16; k++) {
    const y = (15 - k) * rh + (rh - h) / 2;
    for (let s = 0; s < 16; s++) {
      const x = s * cw + (cw - w) / 2;
      if (stepOn(pat, k, s)) { lit.push([x, y, s === ui.playStep]); continue; }
      g.fillStyle = s % 4 === 0 ? 'rgba(255,70,85,.24)' : 'rgba(255,70,85,.1)';
      g.fillRect(x, y, w, h);
    }
  }
  // lit cells glow like phosphor
  g.shadowColor = col; g.shadowBlur = 7 * dpr;
  for (const [x, y, hot] of lit) { g.fillStyle = hot ? '#ffffff' : col; g.fillRect(x, y, w, h); }
  g.shadowBlur = 0;
}
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function renderAll() { renderButtons(); renderScreen(); renderKeys(); drawMatrix(); }

// animation loop: move the playhead in time with what you hear
function frame() {
  if (ui.playing && ctx) {
    const now = ctx.currentTime;
    let changed = false;
    while (uiQueue.length && uiQueue[0].t <= now) {
      const e = uiQueue.shift();
      ui.playStep = e.s; changed = true;
      if (e.ps === 0) renderScreen(); // pattern may have advanced
      const dr = st.devices[0], kg = dr.patterns[e.pats[0]].g;
      if (!dr.mute && ((kg[0] | kg[1] | kg[14]) >> e.s) & 1) jolt();
    }
    if (changed) {
      renderKeys(); drawMatrix();
      [...els.tabs.children].forEach((t, i) => {
        const d = st.devices[i];
        t.classList.toggle('pulse', !d.mute && ui.playStep % 4 === 0 && d.patterns[d.cur].g.some(x => x));
      });
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- settings sheet
let clipboard = null;
function openSheet() {
  buildSheet();
  els.sheet.classList.remove('hidden'); els.sheet.setAttribute('aria-hidden', 'false');
}
function closeSheet() { els.sheet.classList.add('hidden'); els.sheet.setAttribute('aria-hidden', 'true'); }
$('#menuBtn').addEventListener('click', openSheet);
$('#bpmBtn').addEventListener('click', openSheet);
$('#sheetClose').addEventListener('click', closeSheet);
els.sheet.addEventListener('click', e => { if (e.target === els.sheet) closeSheet(); });

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v);
  }
  kids.flat().forEach(c => e.append(c));
  return e;
}
function slider(label, min, max, step, value, fmt, onInput) {
  const val = h('span', { class: 'val' }, fmt(value));
  const inp = h('input', { type: 'range', min, max, step, value });
  inp.addEventListener('input', () => { const v = +inp.value; val.textContent = fmt(v); onInput(v); });
  return h('div', { class: 'row' }, h('label', {}, label), inp, val);
}
function select(label, options, value, onChange) {
  const s = h('select', {}, options.map(([v, t]) => { const o = h('option', { value: v }, t); if (String(v) === String(value)) o.selected = true; return o; }));
  s.addEventListener('change', () => onChange(s.value));
  return h('div', { class: 'row' }, h('label', {}, label), s);
}
function button(text, fn, cls = '') { return h('button', { class: 'btn ' + cls, onclick: fn }, text); }

function buildSheet() {
  const b = els.sheetBody; b.innerHTML = '';
  const def = DEFS[ui.dev], dev = curDev();

  b.append(h('h3', {}, 'Tempo & groove'));
  b.append(slider('BPM', 40, 240, 1, st.bpm, v => String(v), v => { st.bpm = v; applyFx(); renderButtons(); save(); }));
  b.append(slider('Swing', 0, 60, 1, Math.round(st.swing * 100), v => v + '%', v => { st.swing = v / 100; save(); }));
  b.append(slider('Pump', 0, 100, 1, Math.round(st.pump * 100), v => v + '%', v => { st.pump = v / 100; save(); }));
  b.append(h('p', { class: 'note' }, 'Pump = sidechain: bass and lead duck every time a kick hits.'));

  b.append(h('h3', {}, 'Mixer'));
  st.devices.forEach((d, i) => {
    const mute = button(d.mute ? 'Muted' : 'Mute', () => {
      d.mute = !d.mute; mute.textContent = d.mute ? 'Muted' : 'Mute'; mute.classList.toggle('on', d.mute); renderAll(); save();
    }, 'small toggle' + (d.mute ? ' on' : ''));
    const row = slider(DEFS[i].name, 0, 100, 1, Math.round(d.vol * 100), v => String(v), v => {
      d.vol = v / 100; if (A) A.buses[i].gain.setTargetAtTime(d.vol, ctx.currentTime, .02); save();
    });
    row.append(mute); b.append(row);
    b.append(slider('↳ Reverb', 0, 100, 1, Math.round(d.verb * 100), v => String(v), v => {
      d.verb = v / 100; if (A) A.verbSends[i].gain.setTargetAtTime(d.verb, ctx.currentTime, .02); save();
    }));
  });

  if (ui.dev > 0) {
    b.append(h('h3', {}, `${def.name} sound`));
    const names = Object.keys(PRESETS[ui.dev]);
    b.append(select('Preset', [['', 'Choose…'], ...names.map(n => [n, n])], '', v => {
      if (!v) return; Object.assign(dev.params, PRESETS[ui.dev][v]); updateKnobs(); save(); flash(v.toUpperCase());
    }));
    b.append(select('Root', NOTE_NAMES.map((n, i) => [i, n]), dev.root, v => { dev.root = +v; renderAll(); save(); }));
    b.append(select('Scale', Object.keys(SCALES).map(k => [k, k]), dev.scale, v => { dev.scale = v; renderAll(); save(); }));
    b.append(select('Octave', [0, 1, 2, 3, 4, 5].map(o => [o, String(o)]), dev.oct, v => { dev.oct = +v; renderAll(); save(); }));
  }

  b.append(h('h3', {}, `${def.name} · pattern ${dev.cur + 1}`));
  b.append(h('div', { class: 'btns' },
    button('Copy pattern', () => { clipboard = JSON.parse(JSON.stringify(curPat())); flash('COPIED'); closeSheet(); }),
    button('Paste pattern', () => {
      if (!clipboard) return flash('NOTHING COPIED');
      dev.patterns[dev.cur] = JSON.parse(JSON.stringify(clipboard)); save(); renderAll(); flash('PASTED'); closeSheet();
    }),
    button('Clear pattern', () => { if (confirm('Clear this pattern?')) { curPat().g.fill(0); save(); renderAll(); closeSheet(); } }, 'danger'),
  ));

  b.append(h('h3', {}, 'Backup'));
  b.append(h('div', { class: 'btns' },
    button('Export all', exportState),
    button('Import…', () => $('#importFile').click()),
    button('Reset everything', () => {
      if (confirm('Erase all patterns and settings?')) {
        if (ui.playing) stop(); st = defaultState(); save(); buildKnobs(); renderAll(); closeSheet();
        if (A) st.devices.forEach((d, i) => { A.buses[i].gain.value = d.vol; A.verbSends[i].gain.value = d.verb; });
      }
    }, 'danger'),
  ));

  b.append(h('h3', {}, 'How to play'));
  const help = h('div', { class: 'help' });
  help.innerHTML = `
    <p><b>Play mode</b> (no mode lit): tap keys to play live. <b>REC</b> + ▶ records what you tap onto the nearest step.</p>
    <p><b>WRITE · drums</b>: tap a sound in the bottom half, then tap steps in the top half to toggle it. A dim dot means another sound is on that step.</p>
    <p><b>WRITE · bass/lead</b>: the outlined step is the cursor. Tap a note and it's written there, then the cursor moves on. Play a melody in order. <b>REST</b> leaves a gap. Tap a step to jump the cursor; double-tap it to clear. On LEAD, hold a note and tap others to enter a chord.</p>
    <p><b>PATTERN</b>: tap to switch (at end of bar while playing). Hold one and tap others to chain. <b>COPY</b>, then tap a slot, duplicates the current pattern.</p>
    <p><b>Demo patterns</b>: DRUM P1 techno · P2 house · P3 new wave · P4 tom fill. BASS P1 rolling · P2 octave pulse · P3 acid. Mix and match.</p>
    <p><b>FX</b>: hold. LOW/HIGH sweep slowly while held (build-ups), PHAS = jet phaser, R×4/2/1 = beat repeat.</p>
    <p><b>LEAD CHORD</b> knob turns one key into octaves, fifths, triads or 7ths in key. GATE all the way up = <b>TIE</b> for pads.</p>
    <p><b>Knobs</b>: drag up/down, double-tap to reset. Tap the active tab to mute it.</p>`;
  b.append(help);
}

function exportState() {
  const blob = new Blob([JSON.stringify(st)], { type: 'application/json' });
  const name = `quicksynth-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'QuickSynth backup' }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!(s && (s.v === 1 || s.v === 2) && Array.isArray(s.devices) && s.devices.length === 3)) throw new Error('bad file');
    if (ui.playing) stop();
    st = sanitize(s); save(); buildKnobs(); renderAll(); closeSheet(); flash('DATA RESTORED');
    if (A) st.devices.forEach((d, i) => { A.buses[i].gain.value = d.vol; A.verbSends[i].gain.value = d.verb; });
  } catch (err) { alert('That file is not a QuickSynth backup.'); }
  e.target.value = '';
});

// ---------------------------------------------------------------- street deco (purely visual)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = n => Math.floor(Math.random() * n);
const hex = n => Array.from({ length: n }, () => '0123456789ABCDEF'[rnd(16)]).join('');
const KANA = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Latin only: Rajdhani has no Japanese glyphs
const kana = n => Array.from({ length: n }, () => KANA[rnd(KANA.length)]).join('');
const GEN = {
  serial: () => `${rnd(900) + 100} ${rnd(900) + 100} ${hex(8)}`,
  hexline: () => `0x${hex(4)} // ${kana(3)}-${rnd(90) + 10} // ${hex(6)}`,
  coords: () => `N ${(Math.random() * 90).toFixed(2)} E${(Math.random() * 180).toFixed(2)}`,
};
function barcodeSVG(w = 46, h = 9) {
  let x = 0, r = '';
  while (x < w) { const bw = 1 + rnd(3); if (Math.random() > .35) r += `<rect x="${x}" width="${bw}" height="${h}"/>`; x += bw + 1 + rnd(2); }
  return `<svg width="${w}" height="${h}" fill="#ff4655" xmlns="http://www.w3.org/2000/svg">${r}</svg>`;
}
document.querySelectorAll('[data-gen]').forEach(el => {
  const g = el.dataset.gen;
  if (g === 'barcode') el.innerHTML = barcodeSVG(); else el.textContent = GEN[g]();
});
const edgeR = document.querySelector('.edge-r');
function tickDeco() {
  edgeR.textContent = Array.from({ length: 30 }, () => Math.random() < .25 ? KANA[rnd(KANA.length)] : pad2(rnd(100))).join('\n');
  if (ui.playing) {
    const t = Math.floor((performance.now() - ui.startedAt) / 1000);
    $('#scrClock').textContent = `T+${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`;
  }
}
tickDeco();
setInterval(tickDeco, reduceMotion ? 5000 : 700);

// screen jolts on every kick
const screenWrap = $('#screenWrap');
let joltTimer = 0;
function jolt() {
  if (reduceMotion) return;
  screenWrap.classList.add('jolt');
  clearTimeout(joltTimer);
  joltTimer = setTimeout(() => screenWrap.classList.remove('jolt'), 70);
}
// random signal glitch: an inverted band tears across the UI now and then
const band = $('#glitchBand'), appEl = $('#app');
function glitchSoon() {
  setTimeout(() => {
    if (!document.hidden && !reduceMotion) {
      band.style.top = (10 + Math.random() * 75) + '%';
      band.style.height = (6 + Math.random() * 40) + 'px';
      band.classList.add('on');
      if (Math.random() < .6) appEl.classList.add('shift');
      setTimeout(() => { band.classList.remove('on'); appEl.classList.remove('shift'); }, 60 + Math.random() * 70);
    }
    glitchSoon();
  }, (ui.playing ? 3500 : 7000) + Math.random() * 6000);
}
glitchSoon();

// ---------------------------------------------------------------- boot
document.addEventListener('touchmove', e => { if (!e.target.closest('.sheet-body')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchend', resumeAudio, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) resumeAudio(); });
window.addEventListener('pagehide', () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) {} });
window.addEventListener('resize', () => { sizeMatrix(); drawMatrix(); });

const splash = $('#splash');
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
if (isIOS && !standalone) $('#installHint').textContent = 'Tip: tap Share → "Add to Home Screen" to install QuickSynth as a full-screen app.';
splash.addEventListener('click', () => { initAudio(); splash.classList.add('hidden'); });

buildKnobs();
sizeMatrix();
renderAll();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
