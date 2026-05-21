namespace FitnessApi.Models;

/// <summary>
/// DTO returned after successful authentication.
/// </summary>
public class LoginResponse
{
    /// <summary>JWT access token.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>Token expiration time in UTC.</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Authenticated user's ID.</summary>
    public int UserId { get; set; }

    /// <summary>Authenticated user's display name.</summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Authenticated user's email.</summary>
    public string Email { get; set; } = string.Empty;
}
