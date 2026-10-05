using InterviewAssistant.ViewModels;
using Microsoft.Maui.Controls;

namespace InterviewAssistant.Views;

public partial class MainPage : ContentPage
{
    public MainPage(MainViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }
}
