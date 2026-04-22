namespace OrderApi.Models;

public class PrintJob
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string DocumentName { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public PrintSettings Settings { get; set; } = new();
    public JobStatus Status { get; set; } = JobStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PrintSettings
{
    public int Copies { get; set; } = 1;
    public bool Colour { get; set; } = false;
    public string PaperSize { get; set; } = "A4";
}

public enum JobStatus
{
    Pending,
    Coordinating,
    Printing,
    Done,
    Failed
}

public class SubmitJobRequest
{
    public string DocumentName { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public PrintSettings Settings { get; set; } = new();
    // In a real system this would be a file upload stream.
    // For the demo we accept a base64-encoded string.
    public string DocumentBase64 { get; set; } = string.Empty;
}

public class Branch
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
}
