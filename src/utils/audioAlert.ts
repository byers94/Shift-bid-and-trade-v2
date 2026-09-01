/**
 * Sound synthesizer utility for high-priority emergency broadcasts
 * Uses browser Web Audio API - no external assets required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && typeof AudioContextClass === 'function') {
        audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn('AudioContext could not be initialized:', e);
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      audioCtx.resume().catch(() => {});
    } catch (e) {}
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
 * Break Status Alert Sound
 */
export function playBreakAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440.0, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, i) => {
      const offset = i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  } catch (e) {
    console.warn('Break alert audio could not be played:', e);
  }
}

/**
 * Priority 24-Hour Shift Push Notification Chime
 * Upbeat 3-tone rising alert (C5 -> E5 -> G5 -> C6) for high-priority open post broadcasts
 */
export function playPriorityShiftAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Fast 4-note ascending chord
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const offset = i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.20, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.28);
    });
  } catch (e) {
    console.warn('Priority shift audio could not be played:', e);
  }
}

/**
 * Scheduled Post Order & Time-Specific Task Notification Tone
 * Two-tone alert chime (F5 -> A5 -> D6) for upcoming pool locks, laundry closures, amenities checks
 */
export function playTaskAlertSound(urgency: 'approaching' | 'due_now' | 'overdue' = 'due_now') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (urgency === 'overdue') {
      // Urgent double beep
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
    } else if (urgency === 'due_now') {
      // 3-tone bright chime
      const tones = [587.33, 739.99, 880.00]; // D5, F#5, A5
      tones.forEach((freq, idx) => {
        const offset = idx * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.22, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.3);
      });
    } else {
      // Approaching gentle chime (E5 -> B5)
      const tones = [659.25, 987.77];
      tones.forEach((freq, idx) => {
        const offset = idx * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + offset);
        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.35);
      });
    }
  } catch (e) {
    console.warn('Task alert audio could not be played:', e);
  }
}

/**
 * Task Completion Confirmation Chime
 */
export function playTaskCompletedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 - E5 - G5 - C6
    notes.forEach((freq, i) => {
      const offset = i * 0.06;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
  } catch (e) {
    console.warn('Task completion audio could not be played:', e);
  }
}

/**
 * Standard Duty Report Submission Confirmation (Tri-tone affirmation)
 */
export function playReportSubmittedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, i) => {
      const offset = i * 0.07;
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
    console.warn('Report submission audio could not be played:', e);
  }
}

/**
 * Critical Incident Emergency Escalation Sound (Urgent multi-frequency beacon)
 */
export function playEmergencyEscalationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Rapid alternating high-alert pulses
    [0, 0.15, 0.3, 0.45].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 987.77 : 783.99, now + offset); // B5 / G5
      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  } catch (e) {
    console.warn('Emergency escalation audio could not be played:', e);
  }
}

/**
 * Geofence Departure Debounce Warning Tone (Guard mobile prompt)
 */
export function playGeofenceDepartureWarningSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now + offset); // D5
      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  } catch (e) {
    console.warn('Geofence departure warning sound failed:', e);
  }
}

/**
 * Geofence Off-Site Breach Escalation Alarm Tone (Dispatch CAD notification)
 */
export function playGeofenceBreachSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.2, 0.4].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(idx === 1 ? 520 : 780, now + offset);
      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.18);
    });
  } catch (e) {
    console.warn('Geofence breach audio failed:', e);
  }
}





