using System.Collections.Concurrent;

namespace PrintCoordinator.Services;

/// <summary>
/// Stores document bytes keyed by a short-lived token.
/// The branch-agent must present the token to retrieve bytes;
/// bytes are destroyed after the first successful retrieval.
/// This is the core confidentiality enforcement point.
/// </summary>
public class TokenVaultService
{
    private record VaultEntry(byte[] Bytes, DateTime ExpiresAt);

    private readonly ConcurrentDictionary<string, VaultEntry> _vault = new();
    private readonly TimeSpan _ttl;

    public TokenVaultService(TimeSpan? ttl = null)
    {
        _ttl = ttl ?? TimeSpan.FromMinutes(5);
    }

    public string Store(byte[] documentBytes)
    {
        var token = Guid.NewGuid().ToString("N");
        var entry = new VaultEntry(documentBytes, DateTime.UtcNow.Add(_ttl));
        _vault[token] = entry;
        return token;
    }

    /// <summary>
    /// Retrieves and destroys the document bytes for the given token.
    /// Returns null if the token is unknown or expired.
    /// </summary>
    public byte[]? Retrieve(string token)
    {
        if (!_vault.TryRemove(token, out var entry))
            return null;

        if (DateTime.UtcNow > entry.ExpiresAt)
            return null;

        return entry.Bytes;
    }

    public bool IsValid(string token)
    {
        if (!_vault.TryGetValue(token, out var entry))
            return false;
        return DateTime.UtcNow <= entry.ExpiresAt;
    }

    /// <summary>Purge expired entries. Call periodically to avoid memory growth.</summary>
    public void PurgeExpired()
    {
        var now = DateTime.UtcNow;
        foreach (var key in _vault.Keys)
        {
            if (_vault.TryGetValue(key, out var entry) && now > entry.ExpiresAt)
                _vault.TryRemove(key, out _);
        }
    }
}
