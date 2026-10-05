using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using InterviewAssistant.Models;
using Microsoft.Extensions.Logging;

namespace InterviewAssistant.Services.Settings;

public class SettingsService : ISettingsService
{
    private readonly ILogger<SettingsService>? _logger;
    private AppSettings _currentSettings = new();
    private readonly string _settingsFilePath;

    public SettingsService(ILogger<SettingsService>? logger = null)
    {
        _logger = logger;
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var dir = Path.Combine(appData, "InterviewAssistant");
        _settingsFilePath = Path.Combine(dir, "settings.json");

        LoadSettingsSync();
    }

    private void LoadSettingsSync()
    {
        try
        {
            if (File.Exists(_settingsFilePath))
            {
                var json = File.ReadAllText(_settingsFilePath);
                var loaded = JsonSerializer.Deserialize<AppSettings>(json);
                if (loaded != null)
                {
                    _currentSettings = loaded;
                    return;
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to load settings file, using defaults.");
        }

        _currentSettings = new AppSettings();
    }

    public Task<AppSettings> GetSettingsAsync()
    {
        return Task.FromResult(_currentSettings);
    }

    public async Task SaveSettingsAsync(AppSettings settings)
    {
        _currentSettings = settings;
        try
        {
            var dir = Path.GetDirectoryName(_settingsFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(_settingsFilePath, json);
            _logger?.LogInformation("Settings saved successfully.");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error writing settings file.");
        }
    }

    public async Task UpdateOverlayGeometryAsync(double x, double y, double width, double height)
    {
        _currentSettings.OverlayX = x;
        _currentSettings.OverlayY = y;
        _currentSettings.OverlayWidth = width;
        _currentSettings.OverlayHeight = height;
        await SaveSettingsAsync(_currentSettings);
    }
}
