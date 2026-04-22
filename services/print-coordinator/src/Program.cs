using PrintCoordinator.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<TokenVaultService>();

var branchAgentUrl = builder.Configuration["BranchAgentUrl"]
    ?? "http://branch-agent:8080";

builder.Services.AddHttpClient("branch-agent", client =>
{
    client.BaseAddress = new Uri(branchAgentUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

// Purge expired vault entries every minute
builder.Services.AddHostedService<VaultCleanupService>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "print-coordinator" }));

app.Run();

public partial class Program { }

public class VaultCleanupService(TokenVaultService vault, ILogger<VaultCleanupService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            vault.PurgeExpired();
            logger.LogDebug("Vault cleanup completed");
        }
    }
}
