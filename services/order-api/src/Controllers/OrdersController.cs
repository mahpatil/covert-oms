using Microsoft.AspNetCore.Mvc;
using OrderApi.Models;
using System.Collections.Concurrent;
using System.Net.Http.Json;

namespace OrderApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, PrintJob> _jobs = new();
    private static readonly List<Branch> _branches =
    [
        new() { Id = "lon-1", Name = "Covert London City",      City = "London" },
        new() { Id = "man-1", Name = "Covert Manchester",       City = "Manchester" },
        new() { Id = "edi-1", Name = "Covert Edinburgh",        City = "Edinburgh" },
        new() { Id = "bir-1", Name = "Covert Birmingham",       City = "Birmingham" },
    ];

    private readonly HttpClient _coordinator;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(IHttpClientFactory factory, ILogger<OrdersController> logger)
    {
        _coordinator = factory.CreateClient("print-coordinator");
        _logger = logger;
    }

    [HttpGet("/api/branches")]
    public IActionResult GetBranches() => Ok(_branches);

    [HttpPost]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> SubmitJob([FromForm] SubmitJobRequest request, IFormFile? document)
    {
        if (string.IsNullOrWhiteSpace(request.DocumentName))
            return BadRequest("DocumentName is required.");

        if (!_branches.Any(b => b.Id == request.BranchId))
            return BadRequest($"Unknown branch: {request.BranchId}");

        if (document is null)
            return BadRequest("Document is required.");

        // Read bytes before fire-and-forget: IFormFile stream is only valid during the request lifetime.
        using var ms = new MemoryStream();
        await document.CopyToAsync(ms);
        var documentBytes = ms.ToArray();

        var job = new PrintJob
        {
            DocumentName = request.DocumentName,
            BranchId = request.BranchId,
            Settings = request.Settings,
            Status = JobStatus.Coordinating
        };
        _jobs[job.Id] = job;

        _logger.LogInformation("Job {JobId} created for branch {BranchId}", job.Id, job.BranchId);

        // Hand off to print-coordinator — fire and update status asynchronously.
        _ = ForwardToCoordinatorAsync(job, documentBytes);

        return Accepted(new { job.Id, job.Status });
    }

    [HttpGet]
    public IActionResult ListJobs() => Ok(_jobs.Values.OrderByDescending(j => j.CreatedAt));

    [HttpGet("{id}")]
    public IActionResult GetJob(string id)
    {
        if (!_jobs.TryGetValue(id, out var job))
            return NotFound();
        return Ok(job);
    }

    private async Task ForwardToCoordinatorAsync(PrintJob job, byte[] documentBytes)
    {
        try
        {
            var payload = new
            {
                JobId = job.Id,
                job.BranchId,
                job.DocumentName,
                DocumentBase64 = Convert.ToBase64String(documentBytes),
                job.Settings
            };

            var response = await _coordinator.PostAsJsonAsync("/internal/jobs", payload);
            job.Status = response.IsSuccessStatusCode ? JobStatus.Printing : JobStatus.Failed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to forward job {JobId} to coordinator", job.Id);
            job.Status = JobStatus.Failed;
        }
    }
}
