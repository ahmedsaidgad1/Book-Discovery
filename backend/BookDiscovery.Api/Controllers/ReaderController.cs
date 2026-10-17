using System.Security.Claims;
using BookDiscovery.Api.Data;
using BookDiscovery.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookDiscovery.Api.Controllers;

[ApiController, Authorize, Route("api/reader")]
public class ReaderController(AppDbContext db) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public record RatingRequest(int Score);
    public record ReadingStatusRequest(string Status);
    public record InterestsRequest(List<int> GenreIds);

    [HttpPut("books/{bookId:int}/rating")]
    public async Task<IActionResult> Rate(int bookId, RatingRequest req)
    {
        if (req.Score is < 1 or > 5) return BadRequest(new { message = "Score must be between 1 and 5." });
        if (!await db.Books.AnyAsync(b => b.Id == bookId)) return NotFound(new { message = "Book not found." });
        var rating = await db.Ratings.SingleOrDefaultAsync(r => r.UserId == UserId && r.BookId == bookId);
        if (rating is null) db.Ratings.Add(new Rating { UserId = UserId, BookId = bookId, Score = req.Score });
        else { rating.Score = req.Score; rating.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
        return Ok(new { bookId, score = req.Score });
    }

    [HttpPut("books/{bookId:int}/reading-status")]
    public async Task<IActionResult> SetStatus(int bookId, ReadingStatusRequest req)
    {
        var allowed = new[] { "WantToRead", "Reading", "Finished" };
        if (!allowed.Contains(req.Status)) return BadRequest(new { message = "Status must be WantToRead, Reading, or Finished." });
        if (!await db.Books.AnyAsync(b => b.Id == bookId)) return NotFound();
        var item = await db.ReadingListItems.SingleOrDefaultAsync(x => x.UserId == UserId && x.BookId == bookId);
        if (item is null) db.ReadingListItems.Add(new ReadingListItem { UserId = UserId, BookId = bookId, Status = req.Status });
        else item.Status = req.Status;
        await db.SaveChangesAsync();
        return Ok(new { bookId, status = req.Status });
    }

    [HttpGet("reading-list")]
    public async Task<IActionResult> ReadingList()
    {
        var items = await db.ReadingListItems.Where(x => x.UserId == UserId)
            .Join(db.Books.Include(b => b.Genre), i => i.BookId, b => b.Id,
                (i, b) => new { b.Id, b.Title, b.TitleAr, b.Author, i.Status, i.AddedAt })
            .OrderByDescending(x => x.AddedAt).ToListAsync();
        return Ok(items);
    }

    [HttpPut("interests")]
    public async Task<IActionResult> SetInterests(InterestsRequest req)
    {
        var ids = req.GenreIds.Distinct().ToList();
        var valid = await db.Genres.Where(g => ids.Contains(g.Id)).Select(g => g.Id).ToListAsync();
        if (valid.Count != ids.Count) return BadRequest(new { message = "One or more genres are invalid." });
        var old = db.UserGenres.Where(x => x.UserId == UserId);
        db.UserGenres.RemoveRange(old);
        db.UserGenres.AddRange(valid.Select(id => new UserGenre { UserId = UserId, GenreId = id }));
        await db.SaveChangesAsync();
        return Ok(new { genreIds = valid });
    }

    [HttpGet("/api/recommendations")]
    public async Task<IActionResult> Recommendations()
    {
        var interests = await db.UserGenres.Where(x => x.UserId == UserId).Select(x => x.GenreId).ToListAsync();
        var rated = await db.Ratings.Where(x => x.UserId == UserId).Select(x => x.BookId).ToListAsync();
        var listed = await db.ReadingListItems.Where(x => x.UserId == UserId).Select(x => x.BookId).ToListAsync();
        var excluded = rated.Concat(listed).Distinct().ToList();
        var query = db.Books.Include(b => b.Genre).Include(b => b.Ratings).AsQueryable();
        if (interests.Count > 0) query = query.Where(b => interests.Contains(b.GenreId));
        var books = await query.Where(b => !excluded.Contains(b.Id))
            .OrderByDescending(b => b.Ratings.Count == 0 ? 0 : b.Ratings.Average(r => r.Score))
            .ThenBy(b => b.Title).Take(10)
            .Select(b => new { b.Id, b.Title, b.TitleAr, b.Author, b.Description, b.DescriptionAr,
                Genre = b.Genre == null ? null : new { b.Genre.Name, b.Genre.NameAr },
                Reason = interests.Contains(b.GenreId) ? "Matches your interests" : "Popular discovery",
                AverageRating = b.Ratings.Any() ? b.Ratings.Average(r => r.Score) : 0 })
            .ToListAsync();
        return Ok(books);
    }
}
