using BookDiscovery.Api.Data;
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
                Genre = x.Genre == null ? null : new { x.Genre.Id, x.Genre.Name, x.Genre.NameAr },
                AverageRating = x.Ratings.Any() ? x.Ratings.Average(r => r.Score) : 0,
                RatingCount = x.Ratings.Count
            }).SingleOrDefaultAsync();
        return b is null ? NotFound() : Ok(b);
    }

    [HttpGet("/api/genres")]
    public async Task<IActionResult> Genres() =>
        Ok(await db.Genres.OrderBy(g => g.Name).Select(g => new { g.Id, g.Name, g.NameAr }).ToListAsync());
}
