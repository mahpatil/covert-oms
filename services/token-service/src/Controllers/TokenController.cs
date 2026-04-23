using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using TokenService.Models;

namespace TokenService.Controllers;

[ApiController]
public class TokenController : ControllerBase
{
    // username → (token, expiry)
    private static readonly ConcurrentDictionary<string, (string Token, DateTime Expiry)> _tokenByUser = new();
    // token → username
    private static readonly ConcurrentDictionary<string, (string Username, DateTime Expiry)> _userByToken = new();

    private static readonly TimeSpan _ttl = TimeSpan.FromHours(1);

    // Demo users — any password accepted for these usernames, or use "guest/guest"
    private static readonly HashSet<string> _knownUsers = new(StringComparer.OrdinalIgnoreCase)
    {
        "admin", "mahesh", "demo", "guest", "user"
    };

    private readonly ILogger<TokenController> _logger;

    public TokenController(ILogger<TokenController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// POST /connect/token
    /// Issues a dummy bearer token. Any password is accepted for known users.
    /// Unknown usernames also work — this is a demo.
    /// </summary>
    [HttpPost("/connect/token")]
    public IActionResult IssueToken([FromBody] TokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
            return BadRequest(new { error = "username_required" });

        var username = request.Username.Trim().ToLowerInvariant();
        var token = Guid.NewGuid().ToString("N");
        var expiry = DateTime.UtcNow.Add(_ttl);

        // Revoke any existing token for this user
        if (_tokenByUser.TryGetValue(username, out var old))
            _userByToken.TryRemove(old.Token, out _);

        _tokenByUser[username] = (token, expiry);
        _userByToken[token] = (username, expiry);

        _logger.LogInformation("Token issued for user {Username}", username);

        return Ok(new TokenResponse
        {
            AccessToken = token,
            TokenType = "Bearer",
            ExpiresIn = (int)_ttl.TotalSeconds,
            Username = username
        });
    }

    /// <summary>
    /// POST /connect/introspect
    /// Validates a token. Called by other services to check if a token is active.
    /// </summary>
    [HttpPost("/connect/introspect")]
    public IActionResult Introspect([FromBody] string token)
    {
        if (_userByToken.TryGetValue(token, out var entry) && DateTime.UtcNow <= entry.Expiry)
            return Ok(new IntrospectResponse { Active = true, Sub = entry.Username });

        return Ok(new IntrospectResponse { Active = false });
    }

    [HttpGet("/health")]
    public IActionResult Health() =>
        Ok(new { status = "healthy", service = "token-service" });
}
