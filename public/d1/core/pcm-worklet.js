/* AudioWorklet: mic (context rate, usually 48 kHz) -> 16 kHz mono PCM s16le, posted in 20 ms frames (320 samples).
   Simple box-filter decimation: good enough for speech recognition, zero dependencies. */
class Pcm16k extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.acc = 0; this.n = 0; this.pos = 0;
    this.out = new Int16Array(320); this.o = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]; this.n++; this.pos++;
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio;
        const v = Math.max(-1, Math.min(1, this.acc / this.n));
        this.acc = 0; this.n = 0;
        this.out[this.o++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        if (this.o === 320) { this.port.postMessage(this.out.buffer, [this.out.buffer]); this.out = new Int16Array(320); this.o = 0; }
      }
    }
    return true;
  }
}
registerProcessor('pcm16k', Pcm16k);
