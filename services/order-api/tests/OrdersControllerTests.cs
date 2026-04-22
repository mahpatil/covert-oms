using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using OrderApi.Models;
using Xunit;

namespace OrderApi.Tests;

public class OrdersControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
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
    public async Task SubmitJob_WithValidRequest_ReturnsAccepted()
    {
        var request = new SubmitJobRequest
        {
            DocumentName = "confidential.pdf",
            BranchId = "lon-1",
            DocumentBase64 = Convert.ToBase64String("test document content"u8.ToArray()),
            Settings = new PrintSettings { Copies = 1, Colour = false, PaperSize = "A4" }
        };

        var response = await _client.PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var result = await response.Content.ReadFromJsonAsync<dynamic>();
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task SubmitJob_WithUnknownBranch_ReturnsBadRequest()
    {
        var request = new SubmitJobRequest
        {
            DocumentName = "test.pdf",
            BranchId = "unknown-branch",
            DocumentBase64 = "dGVzdA=="
        };

        var response = await _client.PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task SubmitJob_WithMissingDocumentName_ReturnsBadRequest()
    {
        var request = new SubmitJobRequest
        {
            DocumentName = "",
            BranchId = "lon-1"
        };

        var response = await _client.PostAsJsonAsync("/api/orders", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
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
