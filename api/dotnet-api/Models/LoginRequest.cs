using System.ComponentModel.DataAnnotations;

namespace FitnessApi.Models;

/// <summary>
/// DTO for user login requests.
/// </summary>
public class LoginRequest
{
    /// <summary>User's email address.</summary>
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>User's plaintext password.</summary>
    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// DTO for user registration requests.
/// </summary>
public class RegisterRequest
{
    /// <summary>Desired email address.</summary>
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>Desired password (min 6 characters).</summary>
    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    /// <summary>Display name shown in the app.</summary>
    [Required]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;
}
