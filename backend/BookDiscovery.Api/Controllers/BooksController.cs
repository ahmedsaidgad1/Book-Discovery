using System.ComponentModel.DataAnnotations;
using BookDiscovery.Api.Data;
using BookDiscovery.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookDiscovery.Api.Controllers;

[ApiController, Route("api/books")]
public class BooksController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? search, [FromQuery] int? genreId, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = db.Books.Include(b => b.Genre).Include(b => b.Ratings).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(b => b.Title.Contains(term) || b.TitleAr.Contains(term) || b.Author.Contains(term));
        }
        if (genreId.HasValue) query = query.Where(b => b.GenreId == genreId.Value);
        var total = await query.CountAsync();
        var items = await query.OrderBy(b => b.Title).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(b => new {
                b.Id, b.Title, b.TitleAr, b.Author, b.Description, b.DescriptionAr, b.Language, b.PublishedYear,
                b.ReadingUrl, b.ReadingSource,
                Genre = b.Genre == null ? null : new { b.Genre.Id, b.Genre.Name, b.Genre.NameAr },
                AverageRating = b.Ratings.Any() ? b.Ratings.Average(r => r.Score) : 0,
                RatingCount = b.Ratings.Count
            }).ToListAsync();
        return Ok(new { page, pageSize, total, items });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var b = await db.Books.Include(x => x.Genre).Include(x => x.Ratings).Where(x => x.Id == id)
            .Select(x => new {
                x.Id, x.Title, x.TitleAr, x.Author, x.Description, x.DescriptionAr, x.Language, x.PublishedYear,
                x.ReadingUrl, x.ReadingSource,
                Genre = x.Genre == null ? null : new { x.Genre.Id, x.Genre.Name, x.Genre.NameAr },
                AverageRating = x.Ratings.Any() ? x.Ratings.Average(r => r.Score) : 0,
                RatingCount = x.Ratings.Count
            }).SingleOrDefaultAsync();
        return b is null ? NotFound() : Ok(b);
    }

    [HttpGet("/api/genres")]
    public async Task<IActionResult> Genres() =>
        Ok(await db.Genres.OrderBy(g => g.Name).Select(g => new { g.Id, g.Name, g.NameAr }).ToListAsync());

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateBookRequest request)
    {
        if (!Uri.TryCreate(request.ReadingUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return BadRequest(new { message = "Reading URL must be a valid HTTP or HTTPS link." });
        if (!await db.Genres.AnyAsync(g => g.Id == request.GenreId))
            return BadRequest(new { message = "Please choose a valid genre." });

        var book = new Book
        {
            Title = request.Title.Trim(),
            TitleAr = request.TitleAr?.Trim() ?? "",
            Author = request.Author.Trim(),
            Description = request.Description?.Trim() ?? "",
            DescriptionAr = request.DescriptionAr?.Trim() ?? "",
            Language = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language.Trim(),
            PublishedYear = request.PublishedYear,
            GenreId = request.GenreId,
            ReadingUrl = uri.ToString(),
            ReadingSource = request.ReadingSource?.Trim()
        };
        db.Books.Add(book);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, new { book.Id, book.Title, book.ReadingUrl, book.ReadingSource });
    }
}

public sealed class CreateBookRequest
{
    [Required, MaxLength(200)] public string Title { get; set; } = "";
    [MaxLength(200)] public string? TitleAr { get; set; }
    [Required, MaxLength(120)] public string Author { get; set; } = "";
    [MaxLength(2000)] public string? Description { get; set; }
    [MaxLength(2000)] public string? DescriptionAr { get; set; }
    [MaxLength(5)] public string? Language { get; set; }
    [Range(1, 9999)] public int? PublishedYear { get; set; }
    [Range(1, int.MaxValue)] public int GenreId { get; set; }
    [Required, MaxLength(1000), Url] public string ReadingUrl { get; set; } = "";
    [MaxLength(150)] public string? ReadingSource { get; set; }
}
