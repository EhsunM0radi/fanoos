using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using InterviewAssistant.Models;

namespace InterviewAssistant.Services.State;

/// <summary>
/// Lightweight in-memory state store for live interim and final speech transcripts.
/// Automatically groups consecutive final segments within a 4-second time window
/// into coherent, readable paragraphs.
/// </summary>
public class TranscriptStore : ITranscriptStore
{
    private readonly object _lock = new();
    private string _currentInterim = string.Empty;
    private readonly List<TranscriptEvent> _finalSegments = new();
    private readonly List<TranscriptParagraph> _groupedParagraphs = new();

    // Grouping threshold: segments arriving within 4 seconds of each other belong to the same paragraph
    public static readonly TimeSpan GroupingWindow = TimeSpan.FromSeconds(4);

    public string CurrentInterim
    {
        get
        {
            lock (_lock) return _currentInterim;
        }
    }

    public IReadOnlyList<TranscriptEvent> FinalSegments
    {
        get
        {
            lock (_lock) return _finalSegments.ToArray();
        }
    }

    public IReadOnlyList<TranscriptParagraph> GroupedParagraphs
    {
        get
        {
            lock (_lock) return _groupedParagraphs.ToArray();
        }
    }

    public event EventHandler? StoreChanged;

    public void UpdateInterim(TranscriptEvent transcript)
    {
        lock (_lock)
        {
            _currentInterim = transcript.Text;
        }
        StoreChanged?.Invoke(this, EventArgs.Empty);
    }

    public void AddFinal(TranscriptEvent transcript)
    {
        if (string.IsNullOrWhiteSpace(transcript.Text)) return;

        lock (_lock)
        {
            _currentInterim = string.Empty;
            _finalSegments.Add(transcript);

            // Automatic grouping into readable paragraphs
            var lastParagraph = _groupedParagraphs.LastOrDefault();
            bool shouldGroup = lastParagraph != null &&
                               (transcript.Timestamp - lastParagraph.EndTime) <= GroupingWindow &&
                               string.Equals(lastParagraph.Speaker, transcript.Speaker, StringComparison.OrdinalIgnoreCase);

            if (shouldGroup && lastParagraph != null)
            {
                // Append text with clean spacing
                var separator = lastParagraph.Text.EndsWith('.') || lastParagraph.Text.EndsWith('?') || lastParagraph.Text.EndsWith('!')
                    ? " "
                    : " ";
                lastParagraph.Text += separator + transcript.Text.Trim();
                lastParagraph.EndTime = transcript.Timestamp;
                lastParagraph.Segments.Add(transcript);
                
                // Recalculate average confidence
                var confidences = lastParagraph.Segments.Where(s => s.Confidence.HasValue).Select(s => s.Confidence!.Value).ToList();
                if (confidences.Count > 0)
                {
                    lastParagraph.AverageConfidence = confidences.Average();
                }
            }
            else
            {
                // Create a new paragraph block
                var newParagraph = new TranscriptParagraph
                {
                    Text = transcript.Text.Trim(),
                    Speaker = transcript.Speaker,
                    StartTime = transcript.Timestamp,
                    EndTime = transcript.Timestamp,
                    AverageConfidence = transcript.Confidence ?? 1.0,
                    Segments = new List<TranscriptEvent> { transcript }
                };
                _groupedParagraphs.Add(newParagraph);
            }
        }

        StoreChanged?.Invoke(this, EventArgs.Empty);
    }

    public void Clear()
    {
        lock (_lock)
        {
            _currentInterim = string.Empty;
            _finalSegments.Clear();
            _groupedParagraphs.Clear();
        }
        StoreChanged?.Invoke(this, EventArgs.Empty);
    }

    public string ExportTranscriptText()
    {
        lock (_lock)
        {
            var sb = new StringBuilder();
            sb.AppendLine("=======================================================");
            sb.AppendLine("         AI INTERVIEW ASSISTANT — SESSION TRANSCRIPT   ");
            sb.AppendLine("=======================================================");
            sb.AppendLine($"Exported: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            sb.AppendLine($"Total Paragraph Blocks: {_groupedParagraphs.Count}");
            sb.AppendLine($"Total Raw Segments: {_finalSegments.Count}");
            sb.AppendLine("-------------------------------------------------------");
            sb.AppendLine();

            if (_groupedParagraphs.Count == 0)
            {
                sb.AppendLine("[No transcript recorded for this session]");
                return sb.ToString();
            }

            foreach (var para in _groupedParagraphs)
            {
                var timeRange = para.StartTime == para.EndTime
                    ? $"{para.StartTime:HH:mm:ss}"
                    : $"{para.StartTime:HH:mm:ss} - {para.EndTime:HH:mm:ss}";

                sb.AppendLine($"[{timeRange}] {para.Speaker}:");
                sb.AppendLine(para.Text);
                sb.AppendLine();
            }

            sb.AppendLine("=======================================================");
            sb.AppendLine("End of Transcript.");
            return sb.ToString();
        }
    }
}
