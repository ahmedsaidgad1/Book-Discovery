using System.ComponentModel.DataAnnotations;

namespace BookDiscovery.Api.Models;

public class User
{
    public int Id { get; set; }
    [MaxLength(80)] public string Name { get; set; } = "";
    [MaxLength(200)] public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    [MaxLength(500)] public string? Bio { get; set; }
    [MaxLength(5)] public string PreferredLanguage { get; set; } = "en";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<UserGenre> Interests { get; set; } = new();
    public List<Rating> Ratings { get; set; } = new();
    public List<ReadingListItem> ReadingListItems { get; set; } = new();
}

public class Book
{
    public int Id { get; set; }
    [MaxLength(200)] public string Title { get; set; } = "";
    [MaxLength(200)] public string TitleAr { get; set; } = "";
    [MaxLength(120)] public string Author { get; set; } = "";
    [MaxLength(2000)] public string Description { get; set; } = "";
    [MaxLength(2000)] public string DescriptionAr { get; set; } = "";
    [MaxLength(5)] public string Language { get; set; } = "en";
    public int? PublishedYear { get; set; }
    public int GenreId { get; set; }
    public Genre? Genre { get; set; }
    public List<Rating> Ratings { get; set; } = new();
    public List<ReadingListItem> ReadingListItems { get; set; } = new();
}

public class Genre
{
    public int Id { get; set; }
    [MaxLength(80)] public string Name { get; set; } = "";
    [MaxLength(80)] public string NameAr { get; set; } = "";
    public List<Book> Books { get; set; } = new();
}

public class UserGenre
{
    public int UserId { get; set; }
    public User? User { get; set; }
    public int GenreId { get; set; }
    public Genre? Genre { get; set; }
}

public class Rating
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int BookId { get; set; }
    public Book? Book { get; set; }
    [Range(1, 5)] public int Score { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class ReadingListItem
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int BookId { get; set; }
    public Book? Book { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "WantToRead";
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
