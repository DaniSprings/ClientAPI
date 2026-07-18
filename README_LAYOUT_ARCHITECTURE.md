# ClientAPI Repository Overview

## Purpose
This repository contains the Node.js/Express backend for RevReview. It exposes health, auth, search, admin, car, model, and social-auth routes, and it centralizes middleware, services, and data access behind a small application bootstrap.

## File Layout

```text
ClientAPI/
├── package.json
├── railway.json
└── src/
    ├── API_Layout.txt
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── database.js
    │   └── env.js
    ├── controllers/
    │   ├── cars.controllers.js
    │   └── models.controllers.js
    ├── middleware/
    │   ├── authenticate.js
    │   ├── error-handler.js
    │   ├── not-found.js
    │   └── validate.js
    ├── repositories/
    │   ├── user.repository.js
    │   └── vehicle.repository.js
    ├── routes/
    │   ├── admin.routes.js
    │   ├── auth.routes.js
    │   ├── cars.routes.js
    │   ├── health.routes.js
    │   ├── models.routes.js
    │   ├── search.routes.js
    │   └── social.routes.js
    ├── services/
    │   ├── auth.service.js
    │   ├── email.service.js
    │   └── vehicle.service.js
    └── utils/
        ├── async-handler.js
        ├── http-error.js
        ├── mailer.js
        └── search.js
```

## Architecture Layout

The application starts in `src/server.js`, which creates the Express app from `src/app.js` and listens on the configured port. The bootstrap path is:

1. `server.js` loads environment values from `config/env.js`.
2. `app.js` creates the Express instance and registers core middleware.
3. Route modules are mounted under `/health`, `/api/models`, `/api/cars`, `/api/auth`, `/api/login`, `/api/search`, `/api/admin`, and `/auth`.
4. Route handlers delegate to controllers, services, repositories, and shared utilities.

The request pipeline is intentionally layered:

- Middleware first applies security and transport concerns such as `helmet`, CORS, rate limiting, compression, cookie parsing, and payload parsing.
- Route handlers keep HTTP concerns separate from business logic.
- Services encapsulate application rules such as authentication, vehicle logic, and email delivery.
- Repositories isolate persistence and query access.
- Shared utilities provide reusable error handling, async wrapping, HTTP errors, mailing helpers, and search helpers.

## Runtime Flow

Typical request flow:

`HTTP request -> Express middleware -> route module -> controller/service -> repository/external service -> response`

The health endpoint uses the database configuration layer to verify connectivity, while the search and admin routes rely on the app service layer and database-facing helpers. Email-related features are isolated in `services/email.service.js` and `utils/mailer.js` so notification logic stays out of the route handlers.

## External Concerns

- Supabase is used for read/write database access in the health and data-access layer.
- MySQL support is available through the `mysql2` dependency for any repository paths that require it.
- Mail delivery is handled through Nodemailer and Resend-backed configuration.
- Railway deployment settings live in `railway.json`.
