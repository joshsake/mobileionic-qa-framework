using FitnessApi.Data;
using FitnessApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FitnessApi.Controllers;

/// <summary>
/// Operations for managing user profiles.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly FitnessDbContext _db;

    public UsersController(FitnessDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Get a user profile by ID.
    /// </summary>
    /// <param name="id">The user ID.</param>
    /// <returns>The user profile (password hash excluded).</returns>
    /// <response code="200">Returns the user profile.</response>
    /// <response code="404">User not found.</response>
    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _db.Users
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.DisplayName,
                u.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound(new { message = $"User with ID {id} not found." });

        return Ok(user);
    }

    /// <summary>
    /// Update a user's profile information.
    /// </summary>
    /// <param name="id">The user ID to update.</param>
    /// <param name="update">The updated profile data.</param>
    /// <returns>The updated user profile.</returns>
    /// <response code="200">User updated successfully.</response>
    /// <response code="404">User not found.</response>
    /// <response code="409">Email is already taken by another user.</response>
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, [FromBody] UserUpdateRequest update)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = $"User with ID {id} not found." });

        if (!string.IsNullOrWhiteSpace(update.Email) && update.Email != user.Email)
        {
            if (await _db.Users.AnyAsync(u => u.Email == update.Email && u.Id != id))
                return Conflict(new { message = "This email is already taken by another user." });

            user.Email = update.Email;
        }

        if (!string.IsNullOrWhiteSpace(update.DisplayName))
            user.DisplayName = update.DisplayName;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.DisplayName,
            user.CreatedAt
        });
    }
}

/// <summary>
/// DTO for updating a user profile.
/// </summary>
public class UserUpdateRequest
{
    /// <summary>Updated email address (optional).</summary>
    public string? Email { get; set; }

    /// <summary>Updated display name (optional).</summary>
    public string? DisplayName { get; set; }
}
