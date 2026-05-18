using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

const long MaxBodySize = 52_428_800; // 50 MB

builder.WebHost.ConfigureKestrel(options =>
    options.Limits.MaxRequestBodySize = MaxBodySize);

builder.Services.Configure<FormOptions>(options =>
    options.MultipartBodyLengthLimit = MaxBodySize);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var coordinatorUrl = builder.Configuration["PrintCoordinatorUrl"]
    ?? "http://print-coordinator:8080";

var tokenServiceUrl = builder.Configuration["TokenServiceUrl"]
    ?? "http://token-service:8080";

builder.Services.AddHttpClient("print-coordinator", client =>
{
    client.BaseAddress = new Uri(coordinatorUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddHttpClient("token-service", client =>
{
    client.BaseAddress = new Uri(tokenServiceUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
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

// Bearer token validation middleware — skips /health and /swagger
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/health") || path.StartsWith("/swagger") || path.StartsWith("/api/branches"))
    {
        await next(context);
        return;
    }

    var auth = context.Request.Headers.Authorization.FirstOrDefault();
    var token = auth?.StartsWith("Bearer ") == true ? auth["Bearer ".Length..] : null;

    if (string.IsNullOrWhiteSpace(token))
    {
        context.Response.StatusCode = 401;
        await context.Response.WriteAsJsonAsync(new { error = "missing_token" });
        return;
    }

    var httpFactory = context.RequestServices.GetRequiredService<IHttpClientFactory>();
    var tokenClient = httpFactory.CreateClient("token-service");

    try
    {
        var introspect = await tokenClient.PostAsJsonAsync("/connect/introspect", token);
        var result = await introspect.Content.ReadFromJsonAsync<IntrospectResult>();

        if (result?.Active != true)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "invalid_token" });
            return;
        }

        context.Items["username"] = result.Sub;
    }
    catch
    {
        // If token-service is unreachable, fail open in dev, closed in prod
        var env = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
        if (!env.IsDevelopment())
        {
            context.Response.StatusCode = 503;
            await context.Response.WriteAsJsonAsync(new { error = "auth_unavailable" });
            return;
        }
    }

    await next(context);
});

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "order-api" }));

app.Run();

record IntrospectResult(bool Active, string Sub);

// Required for WebApplicationFactory in integration tests
public partial class Program { }
