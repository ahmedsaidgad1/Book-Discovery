# Book Discovery Platform

منصة ثنائية اللغة لاكتشاف الكتب، تقييمها، كتابة مراجعات عنها، وتنظيم قائمة القراءة مع ترشيحات حسب الاهتمامات.

## Technology
- .NET 8 / ASP.NET Core Web API
- Entity Framework Core + SQL Server
- React + Vite
- JWT authentication and role-based admin access
- Arabic / English UI, RTL support, light/dark theme

## Requirements
- .NET 8 SDK
- Node.js 20+
- SQL Server Express or SQL Server LocalDB

## Run locally

### Backend
From the repository root:

```powershell
dotnet restore .\backend\BookDiscovery.Api\BookDiscovery.Api.csproj
dotnet run --project .\backend\BookDiscovery.Api\BookDiscovery.Api.csproj
```

Swagger is available at the API URL printed in the terminal, followed by `/swagger`. The frontend default API URL is `http://localhost:5080`; if the API uses another port, set `VITE_API_URL` in the frontend environment before starting Vite.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the local Vite URL shown in the terminal (normally `http://localhost:5173`).

## Features
- Register and sign in
- Search and browse the book catalogue
- Book descriptions, reading source links, and previews
- 1–5 star ratings
- Text reviews: one editable review per user per book
- Personal reading list with Want to read / Reading / Finished states and removal
- Genre interests saved to the account
- Interest-aware book recommendations
- Admin-only book creation
- Arabic/English interface, RTL layout, and persistent theme preference

## Reading links and copyright
Reading links are supplied by the catalogue and may lead to a preview or publisher/library page rather than a downloadable PDF. The app must not imply that a book is a free PDF unless that has been verified. Seeded books under copyright use Google Books search/preview links; availability depends on the rights holder and region. Only add direct full-text links when the source explicitly provides lawful access.

## Database notes
The app currently uses `EnsureCreated()` for initial setup and creates the BookReviews table for existing local databases. This is a development convenience, not a substitute for a versioned EF Core migration workflow. Back up the database before schema changes. For a production deployment, add and apply migrations instead of relying on startup SQL.

## Security and deployment
- Never deploy with the development JWT key. Configure a long, random secret through the `Jwt__Key` environment variable and set `ASPNETCORE_ENVIRONMENT=Production`; startup will reject the placeholder key in Production.
- Configure `ConnectionStrings__DefaultConnection` through environment variables or a secret manager for deployment.
- Use HTTPS, least-privilege SQL credentials, and a specific frontend origin for CORS.
- Before public release, add rate limiting, account recovery/email verification, moderation/reporting, privacy controls, structured logging, and automated tests.
- Do not commit real credentials, tokens, or database passwords.

## Manual smoke-test checklist
1. Register a test account and sign in.
2. Search for a title and confirm both book sections render.
3. Add a book to the reading list; refresh and confirm it persists.
4. Change its status to Reading and Finished, then remove it.
5. Save genre interests and verify recommendations reload.
6. Open a book preview, save a review, refresh/reopen the book, and verify the review appears.
7. Update the same review and confirm there is only one review from that user for that book.
8. Rate a book and confirm the average/count update.
9. Switch language and theme, and check mobile width.
10. Verify non-admin users cannot create books and Production refuses the placeholder JWT key.

> This is an educational MVP. The source has been updated, but the checklist above must be run locally before calling the release tested.
