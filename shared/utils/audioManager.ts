export type OscillatorType = "sine" | "square" | "sawtooth" | "triangle" | "custom";

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx) {
        // @ts-ignore
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    return audioCtx;
};

export const playBeep = (freq: number = 440, type: OscillatorType = 'sine', duration: number = 0.1) => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        
        if (ctx.state === 'suspended') {
            ctx.resume().catch(err => console.error("Audio resume failed", err));
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration + 0.1);

        setTimeout(() => {
            osc.disconnect();
            gain.disconnect();
        }, (duration + 0.2) * 1000);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export const initAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume();
    }
};
