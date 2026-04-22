using FluentAssertions;
using PrintCoordinator.Services;
using Xunit;

namespace PrintCoordinator.Tests;

public class TokenVaultServiceTests
{
    [Fact]
    public void Store_ReturnsNonEmptyToken()
    {
        var vault = new TokenVaultService();
        var bytes = "hello"u8.ToArray();

        var token = vault.Store(bytes);

        token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Retrieve_WithValidToken_ReturnsBytesAndRemoves()
    {
        var vault = new TokenVaultService();
        var bytes = "secret document"u8.ToArray();
        var token = vault.Store(bytes);

        var retrieved = vault.Retrieve(token);

        retrieved.Should().Equal(bytes);
        // Second retrieval should return null — bytes are destroyed
        vault.Retrieve(token).Should().BeNull();
    }

    [Fact]
    public void Retrieve_WithUnknownToken_ReturnsNull()
    {
        var vault = new TokenVaultService();

        vault.Retrieve("nonexistent-token").Should().BeNull();
    }

    [Fact]
    public void Retrieve_WithExpiredToken_ReturnsNull()
    {
        // Use a 1 millisecond TTL so the token expires immediately
        var vault = new TokenVaultService(ttl: TimeSpan.FromMilliseconds(1));
        var token = vault.Store("data"u8.ToArray());

        Thread.Sleep(10); // Ensure expiry

        vault.Retrieve(token).Should().BeNull();
    }

    [Fact]
    public void IsValid_WithValidToken_ReturnsTrue()
    {
        var vault = new TokenVaultService();
        var token = vault.Store("data"u8.ToArray());

        vault.IsValid(token).Should().BeTrue();
    }

    [Fact]
    public void IsValid_WithExpiredToken_ReturnsFalse()
    {
        var vault = new TokenVaultService(ttl: TimeSpan.FromMilliseconds(1));
        var token = vault.Store("data"u8.ToArray());

        Thread.Sleep(10);

        vault.IsValid(token).Should().BeFalse();
    }

    [Fact]
    public void PurgeExpired_RemovesOnlyExpiredEntries()
    {
        var vault = new TokenVaultService(ttl: TimeSpan.FromMilliseconds(1));
        var expiredToken = vault.Store("expired"u8.ToArray());

        Thread.Sleep(10);

        var freshVault = new TokenVaultService(ttl: TimeSpan.FromMinutes(5));
        var freshToken = freshVault.Store("fresh"u8.ToArray());

        freshVault.PurgeExpired();

        freshVault.IsValid(freshToken).Should().BeTrue();
        vault.IsValid(expiredToken).Should().BeFalse();
    }
}
