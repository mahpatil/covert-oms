using BranchAgent.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<MockPrinterService>();

var coordinatorUrl = builder.Configuration["PrintCoordinatorUrl"]
    ?? "http://print-coordinator:8080";

builder.Services.AddHttpClient("print-coordinator", client =>
{
    client.BaseAddress = new Uri(coordinatorUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "branch-agent" }));

app.Run();

public partial class Program { }
