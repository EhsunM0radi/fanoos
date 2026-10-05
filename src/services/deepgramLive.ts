import { TranscriptEvent, ConnectionState } from '../types';

export class DeepgramLiveClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private apiKey: string = '';
  private onTranscriptCallbacks: ((evt: TranscriptEvent) => void)[] = [];
  private onStateChangeCallbacks: ((state: ConnectionState) => void)[] = [];

  constructor() {}

  public getState(): ConnectionState {
    return this.state;
  }

  public onTranscript(cb: (evt: TranscriptEvent) => void) {
    this.onTranscriptCallbacks.push(cb);
  }

  public onStateChange(cb: (state: ConnectionState) => void) {
    this.onStateChangeCallbacks.push(cb);
  }

  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChangeCallbacks.forEach((cb) => cb(newState));
    }
  }

  public connect(
    apiKey: string,
    options: {
      model?: string;
      language?: string;
      interimResults?: boolean;
      smartFormatting?: boolean;
      endpointingMs?: number;
    } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.apiKey = apiKey.trim();
      if (!this.apiKey) {
        this.setState('error');
        return reject(new Error('Deepgram API Key is required'));
      }

      this.setState('connecting');

      const model = options.model || 'nova-3';
      const language = options.language || 'en';
      const interim = options.interimResults !== false ? 'true' : 'false';
      const smartFormat = options.smartFormatting !== false ? 'true' : 'false';
      const endpointing = options.endpointingMs || 300;

      const url = `wss://api.deepgram.com/v1/listen?model=${model}&language=${language}&encoding=linear16&sample_rate=16000&channels=1&interim_results=${interim}&smart_format=${smartFormat}&endpointing=${endpointing}`;

      try {
        // Deepgram supports passing the API key in the Sec-WebSocket-Protocol or query parameter / header
        // For browsers, Sec-WebSocket-Protocol: ['token', apiKey] is Deepgram's standard browser authentication!
        this.ws = new WebSocket(url, ['token', this.apiKey]);

        this.ws.onopen = () => {
          this.setState('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.channel?.alternatives?.[0]) {
              const alt = data.channel.alternatives[0];
              const transcript = alt.transcript?.trim();
              if (transcript) {
                const isFinal = Boolean(data.is_final);
                const speechFinal = Boolean(data.speech_final);
                const confidence = alt.confidence;

                const evt: TranscriptEvent = {
                  text: transcript,
                  isFinal: isFinal || speechFinal,
                  speechFinal: speechFinal,
                  confidence: confidence,
                  timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                };

                this.onTranscriptCallbacks.forEach((cb) => cb(evt));
              }
            }
          } catch (err) {
            console.warn('Error parsing Deepgram message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('Deepgram WebSocket error:', err);
          this.setState('error');
          reject(err);
        };

        this.ws.onclose = () => {
          if (this.state === 'connected') {
            this.setState('disconnected');
          }
        };
      } catch (err) {
        this.setState('error');
        reject(err);
      }
    });
  }

  public sendAudio(chunk: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.state === 'connected') {
      this.ws.send(chunk);
    }
  }

  public disconnect(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        // Send Deepgram close stream frame
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
        this.ws.close();
      }
      this.ws = null;
    }
    this.setState('disconnected');
  }
}
