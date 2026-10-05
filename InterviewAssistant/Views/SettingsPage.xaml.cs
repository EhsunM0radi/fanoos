using InterviewAssistant.ViewModels;
using Microsoft.Maui.Controls;

namespace InterviewAssistant.Views;

public partial class SettingsPage : ContentPage
{
    public SettingsPage(SettingsViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
