using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OrderApi.Models;
using Xunit;

namespace OrderApi.Tests;

public class OrdersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public OrdersControllerTests(WebApplicationFactory<Program> factory)
    {
        // Use Development environment so the auth middleware fails open when token-service is unreachable.
        _factory = factory.WithWebHostBuilder(b => b.UseEnvironment("Development"));
        _client = _factory.CreateClient();
        // Provide a fake token to satisfy the missing-token check; the token-service call will fail
        // gracefully in Development mode (fail open).
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "test-token");
    }

    private static MultipartFormDataContent BuildMultipart(
        string documentName = "test.pdf",
        string branchId = "lon-1",
        byte[]? fileBytes = null,
        string fileName = "test.pdf")
    {
        var content = new MultipartFormDataContent();
        content.Add(new StringContent(documentName), "documentName");
        content.Add(new StringContent(branchId), "branchId");
        content.Add(new StringContent("1"), "settings.Copies");
        content.Add(new StringContent("false"), "settings.Colour");
        content.Add(new StringContent("A4"), "settings.PaperSize");

        var fileContent = new ByteArrayContent(fileBytes ?? "test document content"u8.ToArray());
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "document", fileName);

        return content;
    }

    [Fact]
    public async Task GetBranches_ReturnsNonEmptyList()
    {
        var response = await _client.GetAsync("/api/branches");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var branches = await response.Content.ReadFromJsonAsync<List<Branch>>();
        branches.Should().NotBeEmpty();
    }

    [Fact]
    public async Task SubmitJob_WithValidMultipartRequest_ReturnsAccepted()
    {
        var response = await _client.PostAsync("/api/orders", BuildMultipart("confidential.pdf", "lon-1"));

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("id");
    }

    [Fact]
    public async Task SubmitJob_WithUnknownBranch_ReturnsBadRequest()
    {
        var response = await _client.PostAsync("/api/orders", BuildMultipart(branchId: "unknown-branch"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SubmitJob_WithMissingDocumentName_ReturnsBadRequest()
    {
        var response = await _client.PostAsync("/api/orders", BuildMultipart(documentName: ""));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SubmitJob_WithoutDocument_ReturnsBadRequest()
    {
        var content = new MultipartFormDataContent();
        content.Add(new StringContent("test.pdf"), "documentName");
        content.Add(new StringContent("lon-1"), "branchId");

        var response = await _client.PostAsync("/api/orders", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SubmitJob_WithDocumentExceedingLimit_ReturnsBadRequest()
    {
        // Configure a small limit (1 KB) to test enforcement without allocating 51 MB in CI.
        await using var limitedFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services =>
                services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 1024));
        });

        var client = limitedFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "test-token");

        var content = new MultipartFormDataContent();
        content.Add(new StringContent("big.pdf"), "documentName");
        content.Add(new StringContent("lon-1"), "branchId");

        var fileContent = new ByteArrayContent(new byte[2048]); // 2 KB exceeds 1 KB limit
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        content.Add(fileContent, "document", "big.pdf");

        var response = await client.PostAsync("/api/orders", content);

        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.RequestEntityTooLarge);
    }

    [Fact]
    public async Task GetJob_WithUnknownId_ReturnsNotFound()
    {
        var response = await _client.GetAsync("/api/orders/does-not-exist");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
