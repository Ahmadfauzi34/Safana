/**
 * Web Audio API synthesizer for Savannah ambient soundscapes
 * (Wind, rain, crickets, morning birds)
 */
export class SavannahAudioSynth {
  private ctx: AudioContext | null = null;
  private isPlaying = false;

  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
  }

  public start() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.setupWindNode();
  }

  public stop() {
    this.isPlaying = false;
    if (this.ctx) {
      this.ctx.suspend();
    }
  }

  private setupWindNode() {
    if (!this.ctx) return;

    // Pink/Brown noise generator for wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);

    whiteNoise.start();
  }

  public updateAmbience(windSpeed: number, rainAmount: number, isNight: boolean) {
    if (!this.ctx || !this.isPlaying) return;

    if (this.windGain) {
      const targetGain = 0.04 + windSpeed * 0.04 + rainAmount * 0.06;
      this.windGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.5);
    }
  }
}

export const savannahAudio = new SavannahAudioSynth();
