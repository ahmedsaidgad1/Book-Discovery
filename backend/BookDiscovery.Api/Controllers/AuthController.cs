using System.ComponentModel.DataAnnotations;
using BookDiscovery.Api.Data;
using BookDiscovery.Api.Models;
using BookDiscovery.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace BookDiscovery.Api.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    private readonly PasswordHasher<User> _hasher = new();

    public record RegisterRequest([Required, MaxLength(80)] string Name, [Required, EmailAddress, MaxLength(200)] string Email, [Required, MinLength(8)] string Password);
    public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(x => x.Email == email))
            return Conflict(new { message = "Email already registered." });

        var user = new User { Name = req.Name.Trim(), Email = email };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is SqlException { Number: 2601 or 2627 })
        {
            // The unique email index is the final safeguard if concurrent requests race.
            return Conflict(new { message = "Email already registered." });
        }

        return Ok(new { token = tokens.Create(user), user = new { user.Id, user.Name, user.Email } });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email);
        if (user is null || _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Invalid email or password." });
        return Ok(new { token = tokens.Create(user), user = new { user.Id, user.Name, user.Email } });
    }
}
