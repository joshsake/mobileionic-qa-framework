using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FitnessApi.Data;
using FitnessApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace FitnessApi.Controllers;

/// <summary>
/// Handles user authentication and registration.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly FitnessDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(FitnessDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    /// <summary>
    /// Authenticate a user and return a JWT token.
    /// </summary>
    /// <param name="request">Login credentials.</param>
    /// <returns>A JWT token and user info on success.</returns>
    /// <response code="200">Authentication successful.</response>
    /// <response code="401">Invalid email or password.</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var hash = HashPassword(request.Password);
        if (user.PasswordHash != hash)
            return Unauthorized(new { message = "Invalid email or password." });

        var token = GenerateJwtToken(user);

        return Ok(new LoginResponse
        {
            Token = token.Token,
            ExpiresAt = token.ExpiresAt,
            UserId = user.Id,
            DisplayName = user.DisplayName,
            Email = user.Email
        });
    }

    /// <summary>
    /// Register a new user account.
    /// </summary>
    /// <param name="request">Registration details.</param>
    /// <returns>The newly created user's token and info.</returns>
    /// <response code="201">User created successfully.</response>
    /// <response code="409">A user with this email already exists.</response>
    [HttpPost("register")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email))
            return Conflict(new { message = "A user with this email already exists." });

        var user = new User
        {
            Email = request.Email,
            PasswordHash = HashPassword(request.Password),
            DisplayName = request.DisplayName,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        return StatusCode(StatusCodes.Status201Created, new LoginResponse
        {
            Token = token.Token,
            ExpiresAt = token.ExpiresAt,
            UserId = user.Id,
            DisplayName = user.DisplayName,
            Email = user.Email
        });
    }

    private (string Token, DateTime ExpiresAt) GenerateJwtToken(User user)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddHours(double.Parse(jwtSettings["ExpiresInHours"] ?? "24"));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("displayName", user.DisplayName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    private static string HashPassword(string password)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
