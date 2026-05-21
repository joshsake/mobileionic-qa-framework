using System.ComponentModel.DataAnnotations;

namespace FitnessApi.Models;

/// <summary>
/// Represents a registered user in the fitness tracker system.
/// </summary>
public class User
{
    /// <summary>Unique identifier for the user.</summary>
    public int Id { get; set; }

    /// <summary>User's email address (used for login).</summary>
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>BCrypt-hashed password.</summary>
    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>User's display name shown in the app.</summary>
    [Required]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>Timestamp when the user account was created.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Navigation property for the user's workouts.</summary>
    public ICollection<Workout> Workouts { get; set; } = new List<Workout>();
}
