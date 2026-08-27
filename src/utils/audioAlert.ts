/**
 * Sound synthesizer utility for high-priority emergency broadcasts
 * Uses browser Web Audio API - no external assets required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playEmergencyAlertSound(severity: 'critical' | 'warning' | 'info' = 'critical') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (severity === 'critical') {
      // High-low emergency siren tone (2 pulses)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.75);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    } else if (severity === 'warning') {
      // Two quick beep bursts
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, now + offset);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.15);
      });
    } else {
      // Gentle chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    // Audio playback error (e.g. user hasn't interacted with page yet) - safely ignore
    console.warn('Audio alert could not be played:', e);
  }
}

/**
 * Dispatch notification tone for routine and priority Calls for Service & BOLOs
 */
export function playCallDispatchSound(priority: 'routine' | 'priority' | 'urgent_bolo' = 'routine') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (priority === 'urgent_bolo') {
      // 3 assertive alert beeps for BOLO / Urgent
      [0, 0.18, 0.36].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(784, now + offset); // G5
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } else if (priority === 'priority') {
      // Double upbeat tone
      const notes = [587.33, 880]; // D5 -> A5
      notes.forEach((freq, i) => {
        const offset = i * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } else {
      // Routine pleasant dispatch chime (soft two-tone)
      const notes = [523.25, 659.25]; // C5 -> E5
      notes.forEach((freq, i) => {
        const offset = i * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    }
  } catch (e) {
    console.warn('Call dispatch audio tone could not be played:', e);
  }
}

/**
 * Receipt confirmed notification tone for Ops Admin console
 * Plays an affirming, crisp double-chime when a guard reads/acknowledges a dispatch or BOLO
 */
export function playReceiptConfirmedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Crisp affirmative high chime: G5 -> C6 (784Hz -> 1046.5Hz)
    const notes = [783.99, 1046.50];
    notes.forEach((freq, i) => {
      const offset = i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch (e) {
    console.warn('Receipt confirmed audio tone could not be played:', e);
  }
}

/**
 * On Scene notification tone for Ops Admin console
 * Plays an energetic two-tone arrival prompt: F5 -> A5 (698.46Hz -> 880Hz)
 */
export function playOnSceneAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [698.46, 880.00];
    notes.forEach((freq, i) => {
      const offset = i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.20, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
  } catch (e) {
    console.warn('On scene audio tone could not be played:', e);
  }
}

/**
 * All Clear / Call Resolved notification tone for Ops Admin console
 * Plays a pleasant ascending 3-note resolution chime: C5 -> E5 -> G5 (523.25Hz -> 659.25Hz -> 783.99Hz)
 */
export function playAllClearAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const offset = i * 0.10;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.28);
    });
  } catch (e) {
    console.warn('All clear audio tone could not be played:', e);
  }
}

/**
 * Clock-In confirmation sound for Guard & Ops Console
 * Crisp, uplifting ascending chime: F5 -> A5 -> C6 (698.46Hz -> 880Hz -> 1046.5Hz)
 */
export function playClockInAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [698.46, 880.00, 1046.50];
    notes.forEach((freq, i) => {
      const offset = i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  } catch (e) {
    console.warn('Clock in audio could not be played:', e);
  }
}

/**
 * Clock-Out completion tone
 * Pleasant descending resolution: C6 -> G5 -> E5 (1046.5Hz -> 783.99Hz -> 659.25Hz)
 */
export function playClockOutAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [1046.50, 783.99, 659.25];
    notes.forEach((freq, i) => {
      const offset = i * 0.10;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.30);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.30);
    });
  } catch (e) {
    console.warn('Clock out audio could not be played:', e);
  }
}

/**
 * Late Guard Clock-in Alert (> 15 minutes overdue)
 * Urgent double pulse alert to notify Ops dispatchers of unattended post
 */
export function playLateAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, now + offset); // D5
      osc.frequency.linearRampToValueAtTime(440.00, now + offset + 0.16); // A4

      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch (e) {
    console.warn('Late alert sound could not be played:', e);
  }
}

/**
 * Break toggle chime (soft two-tone)
 */
export function playBreakAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 739.99]; // D5 -> F#5
    notes.forEach((freq, i) => {
      const offset = i * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.14, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.20);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.20);
    });
  } catch (e) {
    console.warn('Break sound could not be played:', e);
  }
}



