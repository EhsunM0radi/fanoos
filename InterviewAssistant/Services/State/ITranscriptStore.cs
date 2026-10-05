using System;
using System.Collections.Generic;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.State;

public interface ITranscriptStore
{
    string CurrentInterim { get; }
    IReadOnlyList<TranscriptEvent> FinalSegments { get; }
    IReadOnlyList<TranscriptParagraph> GroupedParagraphs { get; }

    event EventHandler? StoreChanged;

    void UpdateInterim(TranscriptEvent transcript);
    void AddFinal(TranscriptEvent transcript);
    void Clear();
    string ExportTranscriptText();
}
