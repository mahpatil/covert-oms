using Microsoft.AspNetCore.Mvc;
using PrintCoordinator.Models;
using PrintCoordinator.Services;
using System.Net.Http.Json;

namespace PrintCoordinator.Controllers;

[ApiController]
[Route("internal/[controller]")]
public class JobsController : ControllerBase
{
    private readonly TokenVaultService _vault;
    private readonly HttpClient _branchAgent;
    private readonly ILogger<JobsController> _logger;

    public JobsController(TokenVaultService vault, IHttpClientFactory factory, ILogger<JobsController> logger)
    {
        _vault = vault;
        _branchAgent = factory.CreateClient("branch-agent");
        _logger = logger;
    }

    /// <summary>
    /// Called by order-api. Stores document bytes, issues a token,
    /// notifies the branch-agent with the token (never the bytes).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AcceptJob([FromBody] IncomingJob job)
    {
        if (string.IsNullOrWhiteSpace(job.JobId) || string.IsNullOrWhiteSpace(job.BranchId))
            return BadRequest("JobId and BranchId are required.");

        byte[] documentBytes;
        try
        {
            documentBytes = Convert.FromBase64String(job.DocumentBase64);
        }
        catch
        {
            return BadRequest("DocumentBase64 is not valid base64.");
        }

        var token = _vault.Store(documentBytes);
        _logger.LogInformation("Job {JobId}: token issued, notifying branch {BranchId}", job.JobId, job.BranchId);

        var notification = new PrintNotification
        {
            JobId = job.JobId,
            Token = token,
            DocumentName = job.DocumentName,
            Settings = job.Settings,
            TokenExpiresAt = DateTime.UtcNow.AddMinutes(5)
        };

        _ = NotifyBranchAsync(job.BranchId, notification);

        return Accepted(new { job.JobId, Token = "issued" });
    }

    /// <summary>
    /// Called by branch-agent to retrieve the document bytes using the token.
    /// Bytes are destroyed after first retrieval.
    /// </summary>
    [HttpGet("documents/{token}")]
    public IActionResult RetrieveDocument(string token)
    {
        var bytes = _vault.Retrieve(token);
        if (bytes is null)
        {
            _logger.LogWarning("Document retrieval failed for token {Token} — expired or already used", token);
            return NotFound("Token not found or expired.");
        }

        _logger.LogInformation("Document retrieved for token {Token} — bytes purged", token);
        return File(bytes, "application/octet-stream");
    }

    private async Task NotifyBranchAsync(string branchId, PrintNotification notification)
    {
        try
        {
            var response = await _branchAgent.PostAsJsonAsync($"/print/{branchId}", notification);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Branch {BranchId} returned {Status}", branchId, response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to notify branch {BranchId}", branchId);
        }
    }
}
