using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace InterviewAssistant.Models;

public class DeepgramResponse
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("channel_index")]
    public int[]? ChannelIndex { get; set; }

    [JsonPropertyName("duration")]
    public double Duration { get; set; }

    [JsonPropertyName("start")]
    public double Start { get; set; }

    [JsonPropertyName("is_final")]
    public bool IsFinal { get; set; }

    [JsonPropertyName("speech_final")]
    public bool SpeechFinal { get; set; }

    [JsonPropertyName("channel")]
    public DeepgramChannel? Channel { get; set; }
}

public class DeepgramChannel
{
    [JsonPropertyName("alternatives")]
    public List<DeepgramAlternative>? Alternatives { get; set; }
}

public class DeepgramAlternative
{
    [JsonPropertyName("transcript")]
    public string Transcript { get; set; } = string.Empty;

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("words")]
    public List<DeepgramWord>? Words { get; set; }
}

public class DeepgramWord
{
    [JsonPropertyName("word")]
    public string Word { get; set; } = string.Empty;

    [JsonPropertyName("start")]
    public double Start { get; set; }

    [JsonPropertyName("end")]
    public double End { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }
}
