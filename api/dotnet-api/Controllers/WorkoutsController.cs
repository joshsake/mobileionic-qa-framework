using FitnessApi.Data;
using FitnessApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitnessApi.Controllers;

/// <summary>
/// CRUD operations for workout records.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class WorkoutsController : ControllerBase
{
    private readonly FitnessDbContext _db;

    public WorkoutsController(FitnessDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Get all workouts, optionally filtered by userId, date range.
    /// </summary>
    /// <param name="userId">Filter by user ID.</param>
    /// <param name="from">Filter workouts on or after this date (inclusive).</param>
    /// <param name="to">Filter workouts on or before this date (inclusive).</param>
    /// <returns>A list of workouts matching the filters.</returns>
    /// <response code="200">Returns the list of workouts.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<Workout>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = _db.Workouts.AsQueryable();

        if (userId.HasValue)
            query = query.Where(w => w.UserId == userId.Value);

        if (from.HasValue)
            query = query.Where(w => w.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(w => w.Date <= to.Value);

        var workouts = await query
            .OrderByDescending(w => w.Date)
            .ToListAsync();

        return Ok(workouts);
    }

    /// <summary>
    /// Get a single workout by its ID.
    /// </summary>
    /// <param name="id">The workout ID.</param>
    /// <returns>The workout record.</returns>
    /// <response code="200">Returns the workout.</response>
    /// <response code="404">Workout not found.</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Workout), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var workout = await _db.Workouts.FindAsync(id);
        if (workout == null)
            return NotFound(new { message = $"Workout with ID {id} not found." });

        return Ok(workout);
    }

    /// <summary>
    /// Create a new workout record.
    /// </summary>
    /// <param name="workout">The workout data.</param>
    /// <returns>The created workout.</returns>
    /// <response code="201">Workout created successfully.</response>
    /// <response code="400">Invalid workout data.</response>
    [HttpPost]
    [ProducesResponseType(typeof(Workout), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] Workout workout)
    {
        if (!await _db.Users.AnyAsync(u => u.Id == workout.UserId))
            return BadRequest(new { message = $"User with ID {workout.UserId} does not exist." });

        workout.Id = 0;
        workout.CreatedAt = DateTime.UtcNow;

        _db.Workouts.Add(workout);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = workout.Id }, workout);
    }

    /// <summary>
    /// Update an existing workout record.
    /// </summary>
    /// <param name="id">The workout ID to update.</param>
    /// <param name="updated">The updated workout data.</param>
    /// <returns>The updated workout.</returns>
    /// <response code="200">Workout updated successfully.</response>
    /// <response code="404">Workout not found.</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Workout), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] Workout updated)
    {
        var workout = await _db.Workouts.FindAsync(id);
        if (workout == null)
            return NotFound(new { message = $"Workout with ID {id} not found." });

        workout.ExerciseType = updated.ExerciseType;
        workout.DurationMinutes = updated.DurationMinutes;
        workout.Notes = updated.Notes;
        workout.Date = updated.Date;

        await _db.SaveChangesAsync();

        return Ok(workout);
    }

    /// <summary>
    /// Delete a workout record.
    /// </summary>
    /// <param name="id">The workout ID to delete.</param>
    /// <returns>No content on success.</returns>
    /// <response code="204">Workout deleted successfully.</response>
    /// <response code="404">Workout not found.</response>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var workout = await _db.Workouts.FindAsync(id);
        if (workout == null)
            return NotFound(new { message = $"Workout with ID {id} not found." });

        _db.Workouts.Remove(workout);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
