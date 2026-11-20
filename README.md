# CareLoop (MERN)

Hospital appointment booking with digital queue tickets. No AI features.

## Run
Requires Node 18+ and MongoDB (local or Atlas).

    cd server && cp .env.example .env && npm install && npm run seed && npm run dev
    cd client && npm install && npm run dev

API: http://localhost:5000  App: http://localhost:5173

Seeded logins (password Password123): staff@careloop.test, admin@careloop.test.
Patients register in the app. Change these before any real deployment.

## Status
Not installed or run when generated (no network in the build sandbox). Server files pass a syntax check only.
