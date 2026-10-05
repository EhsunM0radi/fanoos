using System;

namespace InterviewAssistant.Models;

public class VisionResult
{
    public bool Success { get; set; }
    public string Summary { get; set; } = string.Empty;
    public double OptimalOverlayX { get; set; }
    public double OptimalOverlayY { get; set; }
    public double OptimalOverlayWidth { get; set; }
    public double OptimalOverlayHeight { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
