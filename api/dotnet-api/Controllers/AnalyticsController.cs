using FitnessApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitnessApi.Controllers;

/// <summary>
/// Provides analytics and summary data for workouts.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly FitnessDbContext _db;

    public AnalyticsController(FitnessDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Get a summary of workout analytics: total workouts, average duration, current streak, and longest streak.
    /// </summary>
    /// <param name="userId">Optional user ID to scope the summary.</param>
    /// <returns>Workout analytics summary.</returns>
    /// <response code="200">Returns the analytics summary.</response>
    [HttpGet("summary")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary([FromQuery] int? userId)
    {
        var query = _db.Workouts.AsQueryable();
        if (userId.HasValue)
            query = query.Where(w => w.UserId == userId.Value);

        var workouts = await query.OrderBy(w => w.Date).ToListAsync();

        var totalWorkouts = workouts.Count;
        var avgDuration = totalWorkouts > 0 ? workouts.Average(w => w.DurationMinutes) : 0;

        // Calculate streaks based on consecutive days with workouts
        var currentStreak = 0;
        var longestStreak = 0;

        if (workouts.Count > 0)
        {
            var workoutDates = workouts
                .Select(w => w.Date.Date)
                .Distinct()
                .OrderBy(d => d)
                .ToList();

            var streak = 1;
            for (int i = 1; i < workoutDates.Count; i++)
            {
                if ((workoutDates[i] - workoutDates[i - 1]).Days == 1)
                {
                    streak++;
                }
                else
                {
                    longestStreak = Math.Max(longestStreak, streak);
                    streak = 1;
                }
            }
            longestStreak = Math.Max(longestStreak, streak);

            // Current streak: count backwards from the most recent workout date
            var today = DateTime.UtcNow.Date;
            var lastDate = workoutDates.Last();
            if ((today - lastDate).Days <= 1)
            {
                currentStreak = 1;
                for (int i = workoutDates.Count - 2; i >= 0; i--)
                {
                    if ((workoutDates[i + 1] - workoutDates[i]).Days == 1)
                        currentStreak++;
                    else
                        break;
                }
            }
        }

        var exerciseBreakdown = workouts
            .GroupBy(w => w.ExerciseType)
            .Select(g => new
            {
                ExerciseType = g.Key,
                Count = g.Count(),
                TotalMinutes = g.Sum(w => w.DurationMinutes),
                AvgMinutes = Math.Round(g.Average(w => w.DurationMinutes), 1)
            })
            .OrderByDescending(x => x.Count)
            .ToList();

        return Ok(new
        {
            TotalWorkouts = totalWorkouts,
            AverageDurationMinutes = Math.Round(avgDuration, 1),
            CurrentStreak = currentStreak,
            LongestStreak = longestStreak,
            ExerciseBreakdown = exerciseBreakdown
        });
    }

    /// <summary>
    /// Get a weekly breakdown of workouts for the past 8 weeks.
    /// </summary>
    /// <param name="userId">Optional user ID to scope the report.</param>
    /// <returns>Weekly workout data.</returns>
    /// <response code="200">Returns weekly workout data.</response>
    [HttpGet("weekly")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWeekly([FromQuery] int? userId)
    {
        var query = _db.Workouts.AsQueryable();
        if (userId.HasValue)
            query = query.Where(w => w.UserId == userId.Value);

        var eightWeeksAgo = DateTime.UtcNow.Date.AddDays(-56);
        var workouts = await query
            .Where(w => w.Date >= eightWeeksAgo)
            .OrderBy(w => w.Date)
            .ToListAsync();

        var weeklyData = new List<object>();
        for (int i = 0; i < 8; i++)
        {
            var weekStart = eightWeeksAgo.AddDays(i * 7);
            var weekEnd = weekStart.AddDays(7);

            var weekWorkouts = workouts
                .Where(w => w.Date >= weekStart && w.Date < weekEnd)
                .ToList();

            weeklyData.Add(new
            {
                WeekStart = weekStart,
                WeekEnd = weekEnd.AddDays(-1),
                WorkoutCount = weekWorkouts.Count,
                TotalMinutes = weekWorkouts.Sum(w => w.DurationMinutes),
                AverageMinutes = weekWorkouts.Count > 0
                    ? Math.Round(weekWorkouts.Average(w => w.DurationMinutes), 1)
                    : 0,
                ExerciseTypes = weekWorkouts
                    .Select(w => w.ExerciseType)
                    .Distinct()
                    .ToList()
            });
        }

        return Ok(new { Weeks = weeklyData });
    }
}
