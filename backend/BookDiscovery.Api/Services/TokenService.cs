using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BookDiscovery.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace BookDiscovery.Api.Services;

public class TokenService(IConfiguration config)
{
    public string Create(User user)
    {
        var section = config.GetSection("Jwt");
        var claims = new[] {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email)
        };
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(section["Key"]!));
        var token = new JwtSecurityToken(section["Issuer"], section["Audience"], claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
