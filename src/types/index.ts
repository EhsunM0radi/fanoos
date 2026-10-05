export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence?: number;
  speaker?: string;
  timestamp: string;
  timestampMs?: number;
}

export interface TranscriptParagraph {
  id: string;
  text: string;
  speaker: string;
  startTime: string;
  endTime: string;
  timestampMs: number;
  segments: TranscriptEvent[];
  confidence?: number;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface CandidateProfile {
  name: string;
  experience: string;
  mainSkills: string;
  currentRole: string;
  importantProjects: string;
  preferredAnswerStyle: 'Concise' | 'Natural' | 'Detailed';
}

export interface LLMSessionMetrics {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  averageTtftMs: number;
  lastTtftMs: number;
  averageResponseTimeSeconds: number;
  estimatedCostUsd: number;
}

export interface AppSettings {
  // STT Settings
  deepgramApiKey: string;
  provider: string;
  model: string;
  language: string;
  interimResults: boolean;
  smartFormatting: boolean;
  endpointingMs: number;

  // Audio Settings
  selectedDeviceId: string;
  captureMode: 'Microphone' | 'SystemAudio' | 'Combined';

  // Overlay Settings
  overlayOpacity: number;
  overlayFontSize: number;
  alwaysOnTop: boolean;
  autoScrollToBottom: boolean;

  // LLM Engine Settings (Sections 15-30)
  llmProvider: 'DeepSeek' | 'Gemini' | 'OpenAI' | 'OpenRouter';
  llmModel: string;
  llmApiKey: string;
  llmTriggerMode: 'Automatic' | 'SpeechFinal' | 'QuestionDetection' | 'Debounced' | 'Manual';
  llmDebounceMs: number;
  llmMinTriggerLength: number;
  llmMaxRequestsPerMinute: number;
  llmMinTimeBetweenRequestsMs: number;
  llmMaxConcurrentRequests: number;
  llmMaxContextTokens: number;
  llmMaxOutputTokens: number;
  llmTemperature: number;
  llmAnswerStyle: 'Concise' | 'Natural' | 'Detailed';

  // Candidate Profile (Section 21)
  candidateName: string;
  candidateRole: string;
  candidateExperience: string;
  candidateSkills: string;
  candidateProjects: string;

  // Cost Controls (Section 24)
  llmMaxSessionRequests: number;
  llmStopWhenLimitReached: boolean;
  llmMaxEstimatedCostUsd: number;

  // Privacy Defaults (Section 37)
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
