namespace PrintCoordinator.Models;

public class IncomingJob
{
    public string JobId { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public string DocumentBase64 { get; set; } = string.Empty;
    public PrintSettings Settings { get; set; } = new();
}

public class PrintSettings
{
    public int Copies { get; set; } = 1;
    public bool Colour { get; set; } = false;
    public string PaperSize { get; set; } = "A4";
}

public class PrintNotification
{
    public string JobId { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public PrintSettings Settings { get; set; } = new();
    // Token expiry so the branch-agent knows how long it has to collect
    public DateTime TokenExpiresAt { get; set; }
}
