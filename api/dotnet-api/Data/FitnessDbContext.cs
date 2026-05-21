using Microsoft.EntityFrameworkCore;
using FitnessApi.Models;

namespace FitnessApi.Data;

/// <summary>
/// Entity Framework Core database context for the Fitness Tracker API.
/// </summary>
public class FitnessDbContext : DbContext
{
    public FitnessDbContext(DbContextOptions<FitnessDbContext> options) : base(options) { }

    /// <summary>Users table.</summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>Workouts table.</summary>
    public DbSet<Workout> Workouts => Set<Workout>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        modelBuilder.Entity<Workout>(entity =>
        {
            entity.HasOne(w => w.User)
                  .WithMany(u => u.Workouts)
                  .HasForeignKey(w => w.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.Property(w => w.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Seed data — passwords are SHA256 hash of "Password123!" for demo purposes
        // In production, use BCrypt or similar. These are pre-computed hashes for seeding only.
        var seedPasswordHash = "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f";

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = 1,
                Email = "alice@example.com",
                PasswordHash = seedPasswordHash,
                DisplayName = "Alice Johnson",
                CreatedAt = new DateTime(2025, 1, 15, 10, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 2,
                Email = "bob@example.com",
                PasswordHash = seedPasswordHash,
                DisplayName = "Bob Smith",
                CreatedAt = new DateTime(2025, 2, 20, 14, 30, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = 3,
                Email = "charlie@example.com",
                PasswordHash = seedPasswordHash,
                DisplayName = "Charlie Davis",
                CreatedAt = new DateTime(2025, 3, 10, 8, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Workout>().HasData(
            new Workout
            {
                Id = 1, UserId = 1, ExerciseType = "Running",
                DurationMinutes = 30, Notes = "Morning jog in the park",
                Date = new DateTime(2025, 6, 1, 7, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 1, 7, 30, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 2, UserId = 1, ExerciseType = "Weightlifting",
                DurationMinutes = 45, Notes = "Upper body day",
                Date = new DateTime(2025, 6, 2, 18, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 2, 18, 45, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 3, UserId = 1, ExerciseType = "Cycling",
                DurationMinutes = 60, Notes = "Long ride through downtown",
                Date = new DateTime(2025, 6, 3, 9, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 3, 10, 0, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 4, UserId = 2, ExerciseType = "Swimming",
                DurationMinutes = 40, Notes = "Laps at the community pool",
                Date = new DateTime(2025, 6, 1, 12, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 1, 12, 40, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 5, UserId = 2, ExerciseType = "Yoga",
                DurationMinutes = 50, Notes = "Vinyasa flow session",
                Date = new DateTime(2025, 6, 2, 6, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 2, 6, 50, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 6, UserId = 2, ExerciseType = "Running",
                DurationMinutes = 25, Notes = "Quick treadmill run",
                Date = new DateTime(2025, 6, 4, 17, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 4, 17, 25, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 7, UserId = 3, ExerciseType = "HIIT",
                DurationMinutes = 20, Notes = "Tabata intervals",
                Date = new DateTime(2025, 6, 1, 16, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 1, 16, 20, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 8, UserId = 3, ExerciseType = "Weightlifting",
                DurationMinutes = 55, Notes = "Leg day — squats and deadlifts",
                Date = new DateTime(2025, 6, 2, 10, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 2, 10, 55, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 9, UserId = 3, ExerciseType = "Cycling",
                DurationMinutes = 35, Notes = "Stationary bike intervals",
                Date = new DateTime(2025, 6, 3, 7, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 3, 7, 35, 0, DateTimeKind.Utc)
            },
            new Workout
            {
                Id = 10, UserId = 1, ExerciseType = "Yoga",
                DurationMinutes = 45, Notes = "Restorative session",
                Date = new DateTime(2025, 6, 4, 20, 0, 0, DateTimeKind.Utc),
                CreatedAt = new DateTime(2025, 6, 4, 20, 45, 0, DateTimeKind.Utc)
            }
        );
    }
}
