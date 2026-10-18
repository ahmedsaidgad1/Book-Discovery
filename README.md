# Book Discovery

A bilingual book-discovery web app for exploring books, rating and reviewing titles, and managing a personal reading list. The interface supports Arabic/English, right-to-left layout, and light/dark themes.

> **Project status:** Educational MVP. Local functionality has been exercised during development, but the manual checklist below should be rerun before presenting a release as fully tested. Database schema migrations and production hardening remain future work.

## Features

- Register and sign in with JWT-based authentication
- Browse and search the book catalogue
- View book descriptions and reading/preview links
- Rate books from 1 to 5 stars
- Write and edit a review for a book
- Manage a personal reading list with **Want to read**, **Reading**, and **Finished** statuses
- Save preferred genres and receive interest-aware recommendations
- Restrict book creation to administrators
- Switch between Arabic and English, with RTL support
- Toggle light/dark theme

## Tech stack

- **Backend:** C#, .NET 8, ASP.NET Core Web API
- **Data:** Entity Framework Core, SQL Server
- **Authentication:** JWT bearer authentication
- **Frontend:** React 18, Vite
- **API exploration:** Swagger/OpenAPI in development

## Requirements

Install the following before running locally:

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20 or newer](https://nodejs.org/)
- SQL Server Express (the default connection string targets `.\SQLEXPRESS`) or another SQL Server instance

## Run locally (Windows PowerShell)

Run commands from the repository root unless a step says otherwise.

### 1. Configure the API

The API intentionally refuses to start without a JWT signing key of at least 32 UTF-8 bytes. Set a **local development-only** key in the current PowerShell session; use a unique secret stored in a secret manager/environment variable for any shared or deployed environment.

```powershell
$env:Jwt__Key = "Local-Development-Only-Key-Replace-With-Your-Own-32-Bytes-Minimum"
```

This environment variable is temporary for the current PowerShell session. Do not commit real secrets to Git.

The default SQL Server connection is configured in `backend/BookDiscovery.Api/appsettings.json` for `.\SQLEXPRESS` and database `BookDiscoveryDb`. If your SQL Server instance differs, set `ConnectionStrings__DefaultConnection` in the environment before starting the API.

### 2. Start the backend

Open a PowerShell terminal at the repository root:

```powershell
dotnet restore .\backend\BookDiscovery.Api\BookDiscovery.Api.csproj
dotnet run --project .\backend\BookDiscovery.Api\BookDiscovery.Api.csproj
```

Keep this terminal running. Open the Swagger page at the API address printed in the terminal, followed by `/swagger`. The frontend is configured to use `http://localhost:5080` by default; if the API starts on another port, set `VITE_API_URL` for the frontend to that API base URL.

### 3. Start the frontend

Open a **second** PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally [http://localhost:5173](http://localhost:5173)).

## Configuration reference

| Setting | Purpose |
| --- | --- |
| `Jwt__Key` | Required JWT signing secret (at least 32 UTF-8 bytes) |
| `Admin__Email` | Email address granted the administrator role |
| `ConnectionStrings__DefaultConnection` | SQL Server connection string |
| `VITE_API_URL` | Backend API base URL used by the frontend |

Use environment variables or a secret manager for secrets and deployment-specific settings. Never commit real credentials, tokens, or database passwords.

## Database notes

The current app uses `EnsureCreated()` for initial setup and contains startup SQL for the `BookReviews` table and book reading links. This is a development convenience, not a versioned schema migration workflow. The existing local database may already contain data; back it up before any schema changes. Do not run `Update-Database` against an existing database until a migration baseline has been reviewed and verified against the actual schema.

## Reading links and copyright

Reading links may open a preview, search page, publisher, or library rather than a downloadable full text. The app should not imply a book is freely downloadable unless the source explicitly confirms lawful access. Availability depends on the rights holder and region.

## Manual smoke-test checklist

- [ ] Register a test account and sign in
- [ ] Search for a title and browse the catalogue
- [ ] Add a book to the reading list, refresh, and confirm it persists
- [ ] Change a reading-list status and remove an item
- [ ] Save genre interests and confirm recommendations update
- [ ] Open a book reading/preview link
- [ ] Create a review, refresh, and verify it persists
- [ ] Edit the same review and confirm it is not duplicated
- [ ] Rate a book and verify the displayed rating/count
- [ ] Switch language and theme; check a narrow/mobile viewport
- [ ] Verify a non-admin user cannot create books
- [ ] Verify the API refuses to start when the JWT key is missing or too short

## Roadmap

- Introduce a safe, versioned EF Core migration workflow for existing databases
- Add automated backend and frontend tests
- Add rate limiting, account recovery/email verification, moderation/reporting, and privacy controls
- Add structured logging and deployment-specific configuration
- Capture current screenshots and document the API endpoints

## For reviewers

This repository demonstrates a full-stack learning project with a React frontend, ASP.NET Core API, SQL Server persistence, authentication, and book-related user workflows. Setup and smoke-test instructions are provided above. Production readiness is not claimed.
