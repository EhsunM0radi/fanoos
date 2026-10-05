export class BrowserAudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isCapturing: boolean = false;
  private onChunkCallbacks: ((chunk: ArrayBuffer) => void)[] = [];
  private onVolumeCallbacks: ((volume: number) => void)[] = [];

  public get capturing(): boolean {
    return this.isCapturing;
  }

  public onChunk(cb: (chunk: ArrayBuffer) => void) {
    this.onChunkCallbacks.push(cb);
  }

  public onVolume(cb: (volume: number) => void) {
    this.onVolumeCallbacks.push(cb);
  }

  public async getDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  public async start(deviceId?: string): Promise<void> {
    if (this.isCapturing) return;

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

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Deepgram Nova-3 expects 16kHz mono 16-bit PCM
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    // Buffer size 2048 or 4096 (~128ms or ~256ms at 16kHz)
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
      this.onVolumeCallbacks.forEach((cb) => cb(volume));

      // Convert Float32Array to 16-bit Linear PCM Little-Endian
      const pcmBuffer = new ArrayBuffer(inputData.length * 2);
      const view = new DataView(pcmBuffer);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp between -1 and 1
        const s = Math.max(-1, Math.min(1, inputData[i]));
        // Scale to 16-bit signed integer (-32768 to 32767)
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }

      // Dispatch PCM chunk to subscribers
      this.onChunkCallbacks.forEach((cb) => cb(pcmBuffer));
    };

    source.connect(this.processor);
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

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onVolumeCallbacks.forEach((cb) => cb(0));
  }
}
