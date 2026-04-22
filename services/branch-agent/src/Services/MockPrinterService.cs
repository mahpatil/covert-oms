namespace BranchAgent.Services;

/// <summary>
/// Simulates a physical printer. Logs receipt of document bytes and discards them.
/// In a real system this would call a printer driver API.
/// </summary>
public class MockPrinterService(ILogger<MockPrinterService> logger)
{
    public PrintResult Print(string jobId, byte[] documentBytes, string documentName, int copies, bool colour)
    {
        // Simulate print time
        var pagesToPrint = Math.Max(1, documentBytes.Length / 1000);
        logger.LogInformation(
            "PRINTING job={JobId} doc={DocName} pages≈{Pages} copies={Copies} colour={Colour} bytes={Bytes}",
            jobId, documentName, pagesToPrint, copies, colour, documentBytes.Length);

        // Document bytes are not stored — they are used only within this method scope
        // and will be collected by GC after return.
        return new PrintResult
        {
            JobId = jobId,
            Success = true,
            PagesProduced = pagesToPrint * copies,
            CompletedAt = DateTime.UtcNow
        };
    }
}

public class PrintResult
{
    public string JobId { get; set; } = string.Empty;
    public bool Success { get; set; }
    public int PagesProduced { get; set; }
    public DateTime CompletedAt { get; set; }
}
