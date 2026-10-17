using System.Text;
using BookDiscovery.Api.Data;
using BookDiscovery.Api.Models;
using BookDiscovery.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<TokenService>();

var jwt = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwt["Key"]!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwt["Issuer"],
        ValidAudience = jwt["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddCors(o => o.AddPolicy("frontend", p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    if (!db.Books.Any())
    {
        var genres = new[]
        {
            new Genre { Name = "Fantasy", NameAr = "فانتازيا" },
            new Genre { Name = "Science", NameAr = "علوم" },
            new Genre { Name = "History", NameAr = "تاريخ" },
            new Genre { Name = "Mystery", NameAr = "غموض" },
            new Genre { Name = "Self-help", NameAr = "تنمية ذاتية" }
        };
        db.Genres.AddRange(genres);
        db.SaveChanges();
        var books = new[]
        {
            new Book { Title = "The Hobbit", TitleAr = "الهوبيت", Author = "J. R. R. Tolkien", Description = "A fantasy adventure.", DescriptionAr = "مغامرة في عالم خيالي.", Language = "en", GenreId = genres[0].Id, PublishedYear = 1937 },
            new Book { Title = "A Brief History of Time", TitleAr = "تاريخ موجز للزمان", Author = "Stephen Hawking", Description = "An introduction to cosmology.", DescriptionAr = "مقدمة مبسطة إلى علم الكون.", Language = "en", GenreId = genres[1].Id, PublishedYear = 1988 },
            new Book { Title = "Murder on the Orient Express", TitleAr = "جريمة في قطار الشرق السريع", Author = "Agatha Christie", Description = "A classic detective mystery.", DescriptionAr = "رواية بوليسية كلاسيكية.", Language = "en", GenreId = genres[3].Id, PublishedYear = 1934 },
            new Book { Title = "Atomic Habits", TitleAr = "العادات الذرية", Author = "James Clear", Description = "A practical guide to habits.", DescriptionAr = "دليل عملي لبناء العادات.", Language = "en", GenreId = genres[4].Id, PublishedYear = 2018 },
            new Book { Title = "The Silk Roads", TitleAr = "طرق الحرير", Author = "Peter Frankopan", Description = "A history of connections across Eurasia.", DescriptionAr = "قراءة في تاريخ طرق التجارة والحضارات.", Language = "en", GenreId = genres[2].Id, PublishedYear = 2015 }
        };
        db.Books.AddRange(books);
        db.SaveChanges();
    }
}
app.Run();
