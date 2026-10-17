# Book Discovery Platform — MVP

منصة ثنائية اللغة لاكتشاف الكتب، تقييمها، وتنظيم القراءة، مع ترشيحات أولية.

## Technology
- .NET 8 / ASP.NET Core Web API
- Entity Framework Core + SQL Server
- React + Vite
- JWT authentication
- Arabic / English UI

## Requirements
- .NET 8 SDK
- Node.js 20+
- SQL Server or SQL Server LocalDB

## Run the API
1. Open `backend/BookDiscovery.Api`.
2. Update `appsettings.json` connection string if needed.
3. Run:
   ```bash
   dotnet restore
   dotnet run
   ```
4. Swagger is available at the URL printed by the application (usually `/swagger`).

The API uses `EnsureCreated()` for easy first-run setup. For a production deployment, replace this with EF Core migrations.

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend expects the API at `http://localhost:5080`. If the API starts on another port, set `VITE_API_URL`.

## MVP features
- Register and login
- Browse/search books
- View book details
- Rate books
- Add books to a reading list
- Basic interest-based recommendations
- Arabic/English UI toggle
- Demo seed data

## Important
This is an educational MVP scaffold, not a production-ready service. Before public deployment:
- Configure secrets through environment variables / user secrets.
- Use HTTPS and a secure production database.
- Add rate limiting, email verification, password reset, moderation, privacy controls, logging, and comprehensive tests.
- Replace `EnsureCreated()` with migrations.
