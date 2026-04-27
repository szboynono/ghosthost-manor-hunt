// Lightweight Web Audio sound manager — no file assets required.

type SoundId = "click" | "heartbeat" | "capture" | "repairBlip" | "gateOpen";

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(frequency: number, duration: number, type: OscillatorType = "sine", gain = 0.3) {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {
    // Audio not available in test/SSR
  }
}

export const soundManager = {
  play(id: SoundId) {
    switch (id) {
      case "click":
        beep(800, 0.05, "square", 0.2);
        break;
      case "heartbeat":
        beep(80, 0.12, "sine", 0.4);
        setTimeout(() => beep(80, 0.12, "sine", 0.4), 200);
        break;
      case "capture":
        beep(220, 0.3, "sawtooth", 0.5);
        setTimeout(() => beep(180, 0.4, "sawtooth", 0.4), 300);
        break;
      case "repairBlip":
        beep(600, 0.08, "square", 0.2);
        setTimeout(() => beep(900, 0.08, "square", 0.2), 120);
        break;
      case "gateOpen":
        beep(400, 0.1, "sine", 0.3);
        setTimeout(() => beep(600, 0.1, "sine", 0.3), 120);
        setTimeout(() => beep(800, 0.3, "sine", 0.3), 240);
        break;
    }
  },

  setMuted(m: boolean) {
    muted = m;
  },

  isMuted() {
    return muted;
  },
};
