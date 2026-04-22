using BranchAgent.Models;
using BranchAgent.Services;
using Microsoft.AspNetCore.Mvc;

namespace BranchAgent.Controllers;

[ApiController]
[Route("[controller]")]
public class PrintController : ControllerBase
{
    private readonly MockPrinterService _printer;
    private readonly HttpClient _coordinator;
    private readonly ILogger<PrintController> _logger;

    public PrintController(MockPrinterService printer, IHttpClientFactory factory, ILogger<PrintController> logger)
    {
        _printer = printer;
        _coordinator = factory.CreateClient("print-coordinator");
        _logger = logger;
    }

    /// <summary>
    /// Receives a print notification from print-coordinator.
    /// Uses the token to pull the document bytes — never receives them directly.
    /// </summary>
    [HttpPost("{branchId}")]
    public IActionResult Notify(string branchId, [FromBody] PrintNotification notification)
    {
        _logger.LogInformation("Branch {BranchId} received notification for job {JobId}", branchId, notification.JobId);

        // Fire-and-forget the actual print so we return quickly
        _ = PullAndPrintAsync(notification);

        return Accepted();
    }

    private async Task PullAndPrintAsync(PrintNotification notification)
    {
        try
        {
            // Pull the document using the token — bytes are never pushed to us
            var response = await _coordinator.GetAsync($"/internal/jobs/documents/{notification.Token}");
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to retrieve document for job {JobId}: {Status}",
                    notification.JobId, response.StatusCode);
                return;
            }

            var bytes = await response.Content.ReadAsByteArrayAsync();

            var result = _printer.Print(
                notification.JobId,
                bytes,
                notification.DocumentName,
                notification.Settings.Copies,
                notification.Settings.Colour);

            _logger.LogInformation("Job {JobId} printed: {Pages} pages, success={Success}",
                result.JobId, result.PagesProduced, result.Success);

            // bytes go out of scope here and are eligible for GC
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing print job {JobId}", notification.JobId);
        }
    }
}
