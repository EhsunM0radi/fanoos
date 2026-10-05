import { AppSettings, LLMSessionMetrics, CopilotAnswer } from '../types';

export class ClientLLMRequestScheduler {
  private activeAbortController: AbortController | null = null;
  private requestTimestamps: number[] = [];
  private lastRequestCompletedTime: number = 0;
  private recentQuestionFingerprints = new Map<string, number>();
  private debounceTimer: number | null = null;

  public metrics: LLMSessionMetrics = {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    averageTtftMs: 0,
    lastTtftMs: 0,
    averageResponseTimeSeconds: 0,
    estimatedCostUsd: 0,
  };

  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      averageTtftMs: 0,
      lastTtftMs: 0,
      averageResponseTimeSeconds: 0,
      estimatedCostUsd: 0,
    };
    this.notify();
  }

  public cancelActive() {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  public async scheduleTrigger(
    question: string,
    contextLines: string[],
    settings: AppSettings,
    triggerSource: 'Automatic' | 'SpeechFinal' | 'QuestionDetection' | 'Debounced' | 'Manual',
    onAnswerUpdate: (answer: CopilotAnswer) => void
  ): Promise<boolean> {
    const cleanQ = question.trim();

    // 1. Min Length Check
    if (cleanQ.length < settings.llmMinTriggerLength && triggerSource !== 'Manual') {
      return false;
    }

    // 2. Duplicate Question Prevention (Fingerprint hash)
    const normalized = cleanQ.toLowerCase().replace(/[^a-z0-9]/g, '');
    const now = Date.now();
    const lastSeen = this.recentQuestionFingerprints.get(normalized);
    if (lastSeen && now - lastSeen < 30000 && triggerSource !== 'Manual') {
      console.warn('[LLM Scheduler] Duplicate question ignored within 30s window:', cleanQ);
      return false;
    }
    this.recentQuestionFingerprints.set(normalized, now);

    // 3. Rate Limit: Requests per minute
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60000);
    if (this.requestTimestamps.length >= settings.llmMaxRequestsPerMinute && triggerSource !== 'Manual') {
      console.warn(`[LLM Scheduler] Rate limit reached: ${this.requestTimestamps.length}/${settings.llmMaxRequestsPerMinute} per min`);
      return false;
    }

    // 4. Rate Limit: Min Time Between Requests
    const timeSinceLast = now - this.lastRequestCompletedTime;
    if (timeSinceLast < settings.llmMinTimeBetweenRequestsMs && triggerSource !== 'Manual') {
      console.warn(`[LLM Scheduler] Throttling: ${timeSinceLast}ms < ${settings.llmMinTimeBetweenRequestsMs}ms`);
      return false;
    }

    // 5. Cost Control: Max Session Requests
    if (settings.llmMaxSessionRequests > 0 && this.metrics.totalRequests >= settings.llmMaxSessionRequests) {
      if (settings.llmStopWhenLimitReached) {
        console.warn('[LLM Scheduler] Session request limit reached.');
        return false;
      }
    }

    // 6. Debounce if applicable
    if (triggerSource === 'Debounced' && settings.llmDebounceMs > 0) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      return new Promise((resolve) => {
        this.debounceTimer = window.setTimeout(async () => {
          this.debounceTimer = null;
          const res = await this.executeLLMRequest(cleanQ, contextLines, settings, onAnswerUpdate);
          resolve(res);
        }, settings.llmDebounceMs);
      });
    }

    return this.executeLLMRequest(cleanQ, contextLines, settings, onAnswerUpdate);
  }

  private async executeLLMRequest(
    question: string,
    contextLines: string[],
    settings: AppSettings,
    onAnswerUpdate: (answer: CopilotAnswer) => void
  ): Promise<boolean> {
    // Cancel obsolete previous generation
    this.cancelActive();

    this.activeAbortController = new AbortController();
    const signal = this.activeAbortController.signal;

    const answerId = Date.now().toString();
    const startTime = performance.now();
    let firstTokenReceived = false;
    let accumulatedText = '';
    let totalOutputTokens = 0;

    // Record request timestamp
    this.requestTimestamps.push(Date.now());
    this.metrics.totalRequests++;

    onAnswerUpdate({
      id: answerId,
      question,
      answer: '',
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    });

    try {
      const response = await fetch('/api/copilot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          question,
          context: contextLines.slice(-5),
          candidateProfile: {
            role: settings.candidateRole,
            skills: settings.candidateSkills,
            experience: settings.candidateExperience,
            projects: settings.candidateProjects,
          },
          answerStyle: settings.llmAnswerStyle,
          maxTokens: settings.llmMaxOutputTokens,
          temperature: settings.llmTemperature,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Copilot request failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                if (!firstTokenReceived) {
                  firstTokenReceived = true;
                  const ttft = Math.round(performance.now() - startTime);
                  this.metrics.lastTtftMs = ttft;
                  this.metrics.averageTtftMs =
                    this.metrics.totalRequests === 1
                      ? ttft
                      : Math.round((this.metrics.averageTtftMs + ttft) / 2);
                  this.notify();
                }

                accumulatedText += data.text;
                totalOutputTokens += Math.max(1, Math.round(data.text.length / 4));

                onAnswerUpdate({
                  id: answerId,
                  question,
                  answer: accumulatedText,
                  timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
                  isStreaming: true,
                });
              }

              if (data.done) {
                onAnswerUpdate({
                  id: answerId,
                  question,
                  answer: accumulatedText,
                  timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
                  isStreaming: false,
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      const elapsedSec = (performance.now() - startTime) / 1000;
      this.metrics.totalOutputTokens += totalOutputTokens;
      this.metrics.totalInputTokens += Math.round(question.length / 4) + 120;
      this.metrics.averageResponseTimeSeconds =
        this.metrics.totalRequests === 1
          ? parseFloat(elapsedSec.toFixed(2))
          : parseFloat(((this.metrics.averageResponseTimeSeconds + elapsedSec) / 2).toFixed(2));

      // Estimated cost calculation ($0.15/1M input, $0.30/1M output)
      const cost =
        (this.metrics.totalInputTokens / 1000000) * 0.15 +
        (this.metrics.totalOutputTokens / 1000000) * 0.3;
      this.metrics.estimatedCostUsd = parseFloat(cost.toFixed(4));
      this.notify();

      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[LLM Scheduler] Previous request aborted for newer question.');
        return false;
      }
      console.error('[LLM Scheduler] Stream generation failed:', err);
      return false;
    } finally {
      this.lastRequestCompletedTime = Date.now();
    }
  }
}
