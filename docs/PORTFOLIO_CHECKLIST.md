# Portfolio and Demo Checklist

Use this checklist before sharing Book Discovery with recruiters, classmates, or reviewers.

## 1. Recommended screenshots

Capture screenshots from the current running version. Do not use mockups as if they were screenshots of the working app.

- [ ] Catalogue/home page showing book cards and search
- [ ] Book details or preview link
- [ ] Reading list with statuses
- [ ] Ratings and review UI
- [ ] Genre interests/recommendations
- [ ] Arabic interface showing right-to-left layout
- [ ] Mobile/narrow viewport
- [ ] Swagger page showing the API documentation

Save selected images under `docs/screenshots/` and reference them from the root README using relative paths. Avoid screenshots containing personal information, real account details, tokens, or connection strings.

## 2. Short demo flow

A 2–3 minute walkthrough can follow this order:

1. Open the catalogue and search for a book.
2. Open a book and show its description and reading/preview link.
3. Sign in with a test account.
4. Add a book to the reading list and change its status.
5. Rate the book and add or edit a review.
6. Save genre interests and show recommendations.
7. Switch to Arabic and demonstrate RTL layout.
8. Briefly show the API in Swagger.

Use a dedicated test account and non-sensitive sample data. Do not expose administrator credentials or JWT secrets in the recording.

## 3. CV / portfolio wording

Use wording that reflects features you have personally verified. Example:

**Book Discovery — Full-Stack Web Application**  
Built a bilingual book-discovery application using React, Vite, ASP.NET Core Web API, Entity Framework Core, and SQL Server. Implemented JWT-based authentication, book search, ratings and reviews, personal reading lists, genre interests, and interest-aware recommendations. Added Arabic/English UI support with RTL layout and documented local setup and manual smoke tests.

If you have not re-tested a feature after recent changes, remove it from the final CV description until verified.

## 4. Before making the repository public

- [ ] Review repository visibility and confirm no secrets, personal data, or database backups are tracked.
- [ ] Check `.gitignore` excludes build outputs, `node_modules`, local environment files, and local database files.
- [ ] Confirm `appsettings.json` contains no real JWT key, credentials, or production connection string.
- [ ] Run the README setup instructions on a clean checkout if possible.
- [ ] Complete the manual smoke-test checklist in the root README.
- [ ] Add screenshots from the current app.
- [ ] State limitations honestly; do not describe the app as production-ready unless security, deployment, tests, and database migrations have been addressed.

## 5. Suggested repository description

Bilingual book discovery app built with React, ASP.NET Core Web API, and SQL Server. Includes search, ratings, reviews, reading lists, genre-based recommendations, and Arabic/English RTL support.
