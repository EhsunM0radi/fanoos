using InterviewAssistant.ViewModels;
using Microsoft.Maui.Controls;

namespace InterviewAssistant.Views;

public partial class OverlayPage : ContentPage
{
    public OverlayPage(OverlayViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
