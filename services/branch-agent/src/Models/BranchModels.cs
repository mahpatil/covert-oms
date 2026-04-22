namespace BranchAgent.Models;

public class PrintNotification
{
    public string JobId { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public PrintSettings Settings { get; set; } = new();
    public DateTime TokenExpiresAt { get; set; }
}

public class PrintSettings
{
    public int Copies { get; set; } = 1;
    public bool Colour { get; set; } = false;
    public string PaperSize { get; set; } = "A4";
}
