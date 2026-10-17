using BookDiscovery.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BookDiscovery.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<UserGenre> UserGenres => Set<UserGenre>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<ReadingListItem> ReadingListItems => Set<ReadingListItem>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>().HasIndex(x => x.Email).IsUnique();
        model.Entity<Rating>().HasIndex(x => new { x.UserId, x.BookId }).IsUnique();
        model.Entity<UserGenre>().HasKey(x => new { x.UserId, x.GenreId });
        model.Entity<UserGenre>().HasOne(x => x.User).WithMany(x => x.Interests).HasForeignKey(x => x.UserId);
        model.Entity<UserGenre>().HasOne(x => x.Genre).WithMany().HasForeignKey(x => x.GenreId);
        model.Entity<ReadingListItem>().HasIndex(x => new { x.UserId, x.BookId }).IsUnique();
        model.Entity<Book>().HasOne(x => x.Genre).WithMany(x => x.Books).HasForeignKey(x => x.GenreId);
    }
}
