export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence?: number;
  timestamp: string;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface AppSettings {
  deepgramApiKey: string;
  provider: string;
  model: string;
  language: string;
  interimResults: boolean;
  smartFormatting: boolean;
  endpointingMs: number;
  selectedDeviceId: string;
  captureMode: 'Microphone' | 'SystemAudio' | 'Combined';
  overlayOpacity: number;
  overlayFontSize: number;
  alwaysOnTop: boolean;
  saveAudio: boolean;
  saveTranscript: boolean;
  saveScreenshots: boolean;
  screenCapture: boolean;
}

export interface CopilotAnswer {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  isStreaming: boolean;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
