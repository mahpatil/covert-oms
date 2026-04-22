var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var coordinatorUrl = builder.Configuration["PrintCoordinatorUrl"]
    ?? "http://print-coordinator:8080";

builder.Services.AddHttpClient("print-coordinator", client =>
{
    client.BaseAddress = new Uri(coordinatorUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "order-api" }));

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program { }
