/**
 * Tiny Web Audio synthesizer for game sounds, so no audio assets need to be shipped.
 */
export type SoundName = 'move' | 'capture' | 'check' | 'illegal' | 'gameStart' | 'gameEnd';

let context: AudioContext | null = null;

const audio = (): AudioContext | null => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
};

const tone = (
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
) => {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
  amp.gain.setValueAtTime(0, ctx.currentTime + start);
  amp.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
};

/** Short burst of filtered noise, like a piece touching wood. */
const knock = (ctx: AudioContext, start: number, gain: number, frequency: number) => {
  const length = Math.floor(ctx.sampleRate * 0.08);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  filter.Q.value = 1.2;
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start(ctx.currentTime + start);
};

export const playSound = (name: SoundName): void => {
  const ctx = audio();
  if (!ctx) return;
  switch (name) {
    case 'move':
      knock(ctx, 0, 0.9, 900);
      break;
    case 'capture':
      knock(ctx, 0, 1, 700);
      knock(ctx, 0.06, 0.7, 1200);
      break;
    case 'check':
      knock(ctx, 0, 0.9, 900);
      tone(ctx, 880, 0.02, 0.18, 'triangle', 0.08);
      break;
    case 'illegal':
      tone(ctx, 180, 0, 0.12, 'square', 0.05);
      break;
    case 'gameStart':
      tone(ctx, 523, 0, 0.12, 'triangle');
      tone(ctx, 784, 0.1, 0.18, 'triangle');
      break;
    case 'gameEnd':
      tone(ctx, 784, 0, 0.15, 'triangle');
      tone(ctx, 659, 0.14, 0.15, 'triangle');
      tone(ctx, 523, 0.28, 0.35, 'triangle');
      break;
  }
};
