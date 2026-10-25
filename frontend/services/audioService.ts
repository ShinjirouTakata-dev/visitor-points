import { SoundTone } from '../types';

export interface AnnouncementOptions {
  congratsAudioUrl?: string; // パート1のWAV/MP3 URL (未指定時は日本語AI音声)
  thanksAudioUrl?: string;   // パート3のWAV/MP3 URL (未指定時は日本語AI音声)
}

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private volume: number = 0.5;
  private isMuted: boolean = false;
  private isBgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private bgmGain: GainNode | null = null;
  private currentPlayingAudio: HTMLAudioElement | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.volume * 0.15, this.ctx.currentTime);
    }
    if (this.currentPlayingAudio) {
      this.currentPlayingAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBgm();
      this.cancelAnnouncement();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public cancelAnnouncement() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentPlayingAudio) {
      this.currentPlayingAudio.pause();
      this.currentPlayingAudio = null;
    }
  }

  /**
   * Helper to play speech using Web Speech API (returns a Promise that resolves onend)
   */
  private speakTextAsync(text: string, rate: number = 1.05, pitch: number = 1.15): Promise<void> {
    return new Promise((resolve) => {
      if (this.isMuted || this.volume <= 0 || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = Math.min(1, this.volume * 1.2);

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('ja') &&
          (v.name.includes('Google') ||
            v.name.includes('Natural') ||
            v.name.includes('Nanami') ||
            v.name.includes('Keiko') ||
            v.name.includes('Kyoko') ||
            v.name.includes('Otoya') ||
            v.name.includes('Sayaka') ||
            v.name.includes('Haruka'))
      ) || voices.find((v) => v.lang.startsWith('ja'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Helper to play an external WAV/audio file (fallback to speech on error)
   */
  private playAudioFileAsync(url: string, fallbackText: string): Promise<void> {
    return new Promise((resolve) => {
      if (!url || url.trim() === '') {
        // WAV URLが未設定の場合はAI音声で再生
        this.speakTextAsync(fallbackText).then(resolve);
        return;
      }

      try {
        const audio = new Audio(url);
        audio.volume = this.volume;
        this.currentPlayingAudio = audio;

        audio.onended = () => {
          this.currentPlayingAudio = null;
          resolve();
        };

        audio.onerror = () => {
          // WAVファイルが存在しない/ロード失敗時はAI音声でフォールバック再生
          this.currentPlayingAudio = null;
          this.speakTextAsync(fallbackText).then(resolve);
        };

        audio.play().catch(() => {
          this.speakTextAsync(fallbackText).then(resolve);
        });
      } catch {
        this.speakTextAsync(fallbackText).then(resolve);
      }
    });
  }

  /**
   * 【3分割シーケンシャルアナウンス】
   * パート1: 「おめでとうございます！」 (WAVファイルURLまたはAI音声)
   * パート2: 「Xポイント付与です！」 (可変値のためAI音声で発話)
   * パート3: 「ご来店ありがとうございます。」 (WAVファイルURLまたはAI音声)
   */
  public async playAwardAnnouncement(points: number, options?: AnnouncementOptions): Promise<void> {
    if (this.isMuted || this.volume <= 0) return;

    this.cancelAnnouncement();

    try {
      // パート1: 「おめでとうございます！」
      await this.playAudioFileAsync(
        options?.congratsAudioUrl || '',
        'おめでとうございます！'
      );

      // パート2: 「○ポイント付与です！」
      await this.speakTextAsync(`${points}ポイント付与です！`, 1.05, 1.15);

      // パート3: 「ご来店ありがとうございます。」
      await this.playAudioFileAsync(
        options?.thanksAudioUrl || '',
        'ご来店ありがとうございます。'
      );
    } catch (e) {
      console.warn('Award announcement sequence error:', e);
    }
  }

  /**
   * 単体テスト再生用
   */
  public async testAnnouncementPart(partNumber: 1 | 2 | 3, samplePoints: number = 100, options?: AnnouncementOptions) {
    this.cancelAnnouncement();
    if (partNumber === 1) {
      await this.playAudioFileAsync(options?.congratsAudioUrl || '', 'おめでとうございます！');
    } else if (partNumber === 2) {
      await this.speakTextAsync(`${samplePoints}ポイント付与です！`);
    } else if (partNumber === 3) {
      await this.playAudioFileAsync(options?.thanksAudioUrl || '', 'ご来店ありがとうございます。');
    }
  }

  /**
   * Gentle, relaxing lo-fi retail ambient background chord synthesizer
   */
  public toggleBgm(enabled: boolean) {
    if (!enabled || this.isMuted) {
      this.stopBgm();
      return;
    }
    if (this.isBgmPlaying) return;

    this.initContext();
    if (!this.ctx) return;

    this.isBgmPlaying = true;
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];
    let chordIdx = 0;

    const playChordStep = () => {
      if (!this.isBgmPlaying || !this.ctx) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;
      const now = this.ctx.currentTime;

      if (!this.bgmGain) {
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.volume * 0.15, now);
        this.bgmGain.connect(this.ctx.destination);
      }

      currentChord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const noteGain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.04, now + 0.3);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

        osc.connect(noteGain);
        noteGain.connect(this.bgmGain!);

        osc.start(now);
        osc.stop(now + 3.0);
      });

      this.bgmTimer = window.setTimeout(playChordStep, 3200);
    };

    playChordStep();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public isBgmActive(): boolean {
    return this.isBgmPlaying;
  }

  public playTone(tone: SoundTone = 'MELODIC_CHIME') {
    if (this.isMuted || tone === 'MUTE' || this.volume <= 0) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(this.ctx.destination);

      switch (tone) {
        case 'MELODIC_CHIME': {
          const notes = [
            { freq: 739.99, start: 0.0, dur: 0.3 },
            { freq: 587.33, start: 0.16, dur: 0.3 },
            { freq: 440.0,  start: 0.32, dur: 0.3 },
            { freq: 587.33, start: 0.48, dur: 0.35 },
            { freq: 739.99, start: 0.64, dur: 0.65 },
          ];

          notes.forEach(({ freq, start, dur }) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(0, now + start);
            gain.gain.linearRampToValueAtTime(0.24, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + start);
            osc.stop(now + start + dur + 0.05);
          });
          break;
        }

        case 'RETAIL_BELL': {
          const freqs = [1046.5, 2093.0];
          freqs.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = idx === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.3 / (idx + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + 0.9);
          });
          break;
        }

        case 'MARIMBA': {
          const chord = [392.0, 493.88, 587.33, 783.99];
          chord.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.22, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.4);
          });
          break;
        }

        case 'SUBTLE_PING': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.25);
          break;
        }
      }
    } catch {
      // autoplay fallback
    }
  }

  public playSpinTick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  public playScratchSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(240 + Math.random() * 80, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  public playWin() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.6);
      });
    } catch {}
  }
}

export const audioService = new SoundSynthesizer();
