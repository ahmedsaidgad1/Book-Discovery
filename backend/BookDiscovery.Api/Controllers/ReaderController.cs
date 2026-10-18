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
    public record ReviewRequest([System.ComponentModel.DataAnnotations.Required, System.ComponentModel.DataAnnotations.MaxLength(1200)] string Content);

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
                (i, b) => new { b.Id, b.Title, b.TitleAr, b.Author, GenreId = b.GenreId, GenreName = b.Genre == null ? null : b.Genre.Name, GenreNameAr = b.Genre == null ? null : b.Genre.NameAr, i.Status, i.AddedAt })
            .OrderByDescending(x => x.AddedAt).ToListAsync();
        return Ok(items);
    }

    [HttpDelete("books/{bookId:int}/reading-status")]
    public async Task<IActionResult> RemoveFromReadingList(int bookId)
    {
        var item = await db.ReadingListItems.SingleOrDefaultAsync(x => x.UserId == UserId && x.BookId == bookId);
        if (item is null) return NotFound(new { message = "Reading-list item not found." });
        db.ReadingListItems.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("interests")]
    public async Task<IActionResult> GetInterests() =>
        Ok(await db.UserGenres.Where(x => x.UserId == UserId).Select(x => x.GenreId).ToListAsync());

    [HttpGet("books/{bookId:int}/reviews")]
    public async Task<IActionResult> Reviews(int bookId)
    {
        if (!await db.Books.AnyAsync(b => b.Id == bookId)) return NotFound(new { message = "Book not found." });
        var reviews = await db.BookReviews.Where(r => r.BookId == bookId)
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new { r.Id, r.UserId, UserName = r.User!.Name, r.Content, r.CreatedAt, r.UpdatedAt })
            .ToListAsync();
        return Ok(reviews);
    }

    [HttpPut("books/{bookId:int}/review")]
    public async Task<IActionResult> SaveReview(int bookId, ReviewRequest req)
    {
        var content = req.Content?.Trim() ?? "";
        if (content.Length == 0) return BadRequest(new { message = "Review cannot be empty." });
        if (content.Length > 1200) return BadRequest(new { message = "Review must be 1200 characters or fewer." });
        if (!await db.Books.AnyAsync(b => b.Id == bookId)) return NotFound(new { message = "Book not found." });
        var review = await db.BookReviews.SingleOrDefaultAsync(r => r.UserId == UserId && r.BookId == bookId);
        if (review is null) db.BookReviews.Add(new BookReview { UserId = UserId, BookId = bookId, Content = content });
        else { review.Content = content; review.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync();
        return Ok(new { bookId, content });
    }

    [HttpDelete("books/{bookId:int}/review")]
    public async Task<IActionResult> DeleteReview(int bookId)
    {
        var review = await db.BookReviews.SingleOrDefaultAsync(r => r.UserId == UserId && r.BookId == bookId);
        if (review is null) return NotFound(new { message = "Review not found." });
        db.BookReviews.Remove(review);
        await db.SaveChangesAsync();
        return NoContent();
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
            .Select(b => new { b.Id, b.Title, b.TitleAr, b.Author, b.Description, b.DescriptionAr, b.ReadingUrl, b.ReadingSource,
                Genre = b.Genre == null ? null : new { b.Genre.Id, b.Genre.Name, b.Genre.NameAr },
                Reason = interests.Contains(b.GenreId) ? "Matches your interests" : "Popular discovery",
                AverageRating = b.Ratings.Any() ? b.Ratings.Average(r => r.Score) : 0, RatingCount = b.Ratings.Count })
            .ToListAsync();
        return Ok(books);
    }
}
