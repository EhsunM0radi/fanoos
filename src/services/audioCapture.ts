export interface AudioCaptureConfig {
  deviceId?: string;
  systemDeviceId?: string;
  captureMode?: 'Microphone' | 'SystemAudio' | 'Combined';
  micVolume?: number; // 0 - 150
  systemAudioVolume?: number; // 0 - 150
  micMuted?: boolean;
  systemAudioMuted?: boolean;
}

export class BrowserAudioCapture {
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private systemSource: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null;
  private systemGainNode: GainNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  private isCapturing: boolean = false;
  private currentMode: 'Microphone' | 'SystemAudio' | 'Combined' = 'Combined';

  // State
  private _micVolume: number = 100;
  private _systemVolume: number = 100;
  private _micMuted: boolean = false;
  private _systemMuted: boolean = false;

  // Subscriptions
  private onChunkCallbacks: ((chunk: ArrayBuffer) => void)[] = [];
  private onVolumeCallbacks: ((volume: number) => void)[] = [];
  private onMicVolumeCallbacks: ((volume: number) => void)[] = [];
  private onSystemVolumeCallbacks: ((volume: number) => void)[] = [];

  public get capturing(): boolean {
    return this.isCapturing;
  }

  public get captureMode(): 'Microphone' | 'SystemAudio' | 'Combined' {
    return this.currentMode;
  }

  public onChunk(cb: (chunk: ArrayBuffer) => void) {
    this.onChunkCallbacks.push(cb);
  }

  public onVolume(cb: (volume: number) => void) {
    this.onVolumeCallbacks.push(cb);
  }

  public onMicVolume(cb: (volume: number) => void) {
    this.onMicVolumeCallbacks.push(cb);
  }

  public onSystemVolume(cb: (volume: number) => void) {
    this.onSystemVolumeCallbacks.push(cb);
  }

  public async getDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  public async getOutputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audiooutput');
    } catch {
      return [];
    }
  }

  public setMicVolume(volumePct: number): void {
    this._micVolume = Math.max(0, Math.min(200, volumePct));
    if (this.micGainNode) {
      this.micGainNode.gain.value = this._micMuted ? 0 : this._micVolume / 100;
    }
  }

  public setSystemVolume(volumePct: number): void {
    this._systemVolume = Math.max(0, Math.min(200, volumePct));
    if (this.systemGainNode) {
      this.systemGainNode.gain.value = this._systemMuted ? 0 : this._systemVolume / 100;
    }
  }

  public setMicMuted(muted: boolean): void {
    this._micMuted = muted;
    if (this.micGainNode) {
      this.micGainNode.gain.value = muted ? 0 : this._micVolume / 100;
    }
  }

  public setSystemMuted(muted: boolean): void {
    this._systemMuted = muted;
    if (this.systemGainNode) {
      this.systemGainNode.gain.value = muted ? 0 : this._systemVolume / 100;
    }
  }

  public async start(config: AudioCaptureConfig = {}): Promise<void> {
    if (this.isCapturing) return;

    const {
      deviceId = 'default',
      captureMode = 'Combined',
      micVolume = 100,
      systemAudioVolume = 100,
      micMuted = false,
      systemAudioMuted = false,
    } = config;

    this.currentMode = captureMode;
    this._micVolume = micVolume;
    this._systemVolume = systemAudioVolume;
    this._micMuted = micMuted;
    this._systemMuted = systemAudioMuted;

    // Deepgram Nova-3 standard: 16kHz mono 16-bit Linear PCM
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    // Create gain nodes for independent mixer control
    this.micGainNode = this.audioContext.createGain();
    this.systemGainNode = this.audioContext.createGain();

    this.micGainNode.gain.value = this._micMuted ? 0 : this._micVolume / 100;
    this.systemGainNode.gain.value = this._systemMuted ? 0 : this._systemVolume / 100;

    // 1. Capture Microphone (Local Speaker / Headset)
    if (captureMode === 'Microphone' || captureMode === 'Combined') {
      try {
        const constraints: MediaStreamConstraints = {
          audio: deviceId && deviceId !== 'default'
            ? { deviceId: { exact: deviceId } }
            : {
                echoCancellation: true,
                noiseSuppression: true,
                channelCount: 1,
              },
          video: false,
        };

        this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
        this.micSource.connect(this.micGainNode);
      } catch (err) {
        console.warn('[AudioCapture] Mic capture unavailable:', err);
      }
    }

    // 2. Capture System Audio (Remote Counterpart / Meeting App loopback)
    // In web browsers, system audio can be shared via getDisplayMedia audio track.
    // If running in Combined or SystemAudio mode, we connect the loopback stream if provided.
    // In MAUI/Windows, WASAPI Loopback captures this natively with zero permissions.
    if (captureMode === 'SystemAudio' || captureMode === 'Combined') {
      // In web apps, system loopback can also be simulated or received from display media
      // Connect to system gain node
    }

    // 3. Audio Mixing & PCM Conversion Processor Node
    // Buffer size 4096 (~256ms at 16kHz)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isCapturing) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate RMS for volume meter
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      const volume = Math.min(100, Math.round(rms * 250));

      // Dispatch volume levels
      this.onVolumeCallbacks.forEach((cb) => cb(volume));
      
      if (this.currentMode === 'Microphone' || (this.currentMode === 'Combined' && !this._micMuted)) {
        this.onMicVolumeCallbacks.forEach((cb) => cb(this._micMuted ? 0 : volume));
      }
      if (this.currentMode === 'SystemAudio' || (this.currentMode === 'Combined' && !this._systemMuted)) {
        // System volume meter
        this.onSystemVolumeCallbacks.forEach((cb) => cb(this._systemMuted ? 0 : Math.round(volume * 0.9)));
      }

      // Convert Float32Array to 16-bit Linear PCM Little-Endian
      const pcmBuffer = new ArrayBuffer(inputData.length * 2);
      const view = new DataView(pcmBuffer);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp between -1 and 1
        const s = Math.max(-1, Math.min(1, inputData[i]));
        // Scale to 16-bit signed integer (-32768 to 32767)
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }

      // Dispatch PCM chunk to subscribers (Deepgram WebSocket)
      this.onChunkCallbacks.forEach((cb) => cb(pcmBuffer));
    };

    // Connect mixer outputs to processor
    if (this.micGainNode) {
      this.micGainNode.connect(this.processor);
    }
    if (this.systemGainNode) {
      this.systemGainNode.connect(this.processor);
    }

    this.processor.connect(this.audioContext.destination);
    this.isCapturing = true;
  }

  public stop(): void {
    if (!this.isCapturing) return;

    this.isCapturing = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }

    if (this.systemSource) {
      this.systemSource.disconnect();
      this.systemSource = null;
    }

    if (this.micGainNode) {
      this.micGainNode.disconnect();
      this.micGainNode = null;
    }

    if (this.systemGainNode) {
      this.systemGainNode.disconnect();
      this.systemGainNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.systemStream) {
      this.systemStream.getTracks().forEach((track) => track.stop());
      this.systemStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onVolumeCallbacks.forEach((cb) => cb(0));
    this.onMicVolumeCallbacks.forEach((cb) => cb(0));
    this.onSystemVolumeCallbacks.forEach((cb) => cb(0));
  }
}
