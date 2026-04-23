namespace TokenService.Models;

public class TokenRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class TokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresIn { get; set; } = 3600;
    public string Username { get; set; } = string.Empty;
}

public class IntrospectResponse
{
    public bool Active { get; set; }
    public string Sub { get; set; } = string.Empty;
}
