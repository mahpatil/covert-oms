using BranchAgent.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BranchAgent.Tests;

public class MockPrinterServiceTests
{
    private readonly MockPrinterService _printer =
        new(NullLogger<MockPrinterService>.Instance);

    [Fact]
    public void Print_WithValidInput_ReturnsSuccess()
    {
        var bytes = "test document content"u8.ToArray();

        var result = _printer.Print("job-1", bytes, "test.pdf", copies: 1, colour: false);

        result.Success.Should().BeTrue();
        result.JobId.Should().Be("job-1");
        result.PagesProduced.Should().BeGreaterThan(0);
    }

    [Fact]
    public void Print_WithMultipleCopies_MultipliesPages()
    {
        var bytes = new byte[2000]; // ~2 pages
        var single = _printer.Print("job-2", bytes, "doc.pdf", copies: 1, colour: false);
        var multi = _printer.Print("job-3", bytes, "doc.pdf", copies: 3, colour: false);

        multi.PagesProduced.Should().Be(single.PagesProduced * 3);
    }

    [Fact]
    public void Print_SetsCompletedAtToRecentTime()
    {
        var before = DateTime.UtcNow;
        var result = _printer.Print("job-4", "data"u8.ToArray(), "file.pdf", 1, false);
        var after = DateTime.UtcNow;

        result.CompletedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        await using var app = new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>();
        var client = app.CreateClient();

        var response = await client.GetAsync("/health");

        response.StatusCode.Should().Be(System.Net.HttpStatusCode.OK);
    }
}
