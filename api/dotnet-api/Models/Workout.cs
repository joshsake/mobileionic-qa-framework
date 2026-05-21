using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FitnessApi.Models;

/// <summary>
/// Represents a single workout session logged by a user.
/// </summary>
public class Workout
{
    /// <summary>Unique identifier for the workout.</summary>
    public int Id { get; set; }

    /// <summary>Foreign key to the user who performed the workout.</summary>
    [Required]
    public int UserId { get; set; }

    /// <summary>Type of exercise performed (e.g., Running, Cycling, Weightlifting).</summary>
    [Required]
    [MaxLength(100)]
    public string ExerciseType { get; set; } = string.Empty;

    /// <summary>Duration of the workout in minutes.</summary>
    [Required]
    [Range(1, 1440)]
    public int DurationMinutes { get; set; }

    /// <summary>Optional notes about the workout.</summary>
    [MaxLength(500)]
    public string? Notes { get; set; }

    /// <summary>Date when the workout was performed.</summary>
    [Required]
    public DateTime Date { get; set; }

    /// <summary>Timestamp when the workout record was created.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Navigation property to the user who performed this workout.</summary>
    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}
