using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using TokenService.Models;
using Xunit;

namespace TokenService.Tests;

public class TokenControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TokenControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task IssueToken_WithUsername_ReturnsToken()
    {
        var response = await _client.PostAsJsonAsync("/connect/token",
            new TokenRequest { Username = "demo", Password = "any" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<TokenResponse>();
        result!.AccessToken.Should().NotBeNullOrEmpty();
        result.TokenType.Should().Be("Bearer");
        result.Username.Should().Be("demo");
    }

    [Fact]
    public async Task IssueToken_WithoutUsername_ReturnsBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/connect/token",
            new TokenRequest { Username = "", Password = "pass" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Introspect_WithValidToken_ReturnsActive()
    {
        // Issue a token first
        var issueResp = await _client.PostAsJsonAsync("/connect/token",
            new TokenRequest { Username = "testuser", Password = "pass" });
        var issued = await issueResp.Content.ReadFromJsonAsync<TokenResponse>();

        var response = await _client.PostAsJsonAsync("/connect/introspect", issued!.AccessToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<IntrospectResponse>();
        result!.Active.Should().BeTrue();
        result.Sub.Should().Be("testuser");
    }

    [Fact]
    public async Task Introspect_WithUnknownToken_ReturnsInactive()
    {
        var response = await _client.PostAsJsonAsync("/connect/introspect", "not-a-real-token");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<IntrospectResponse>();
        result!.Active.Should().BeFalse();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
