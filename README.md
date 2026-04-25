# OG — The Original Social Network for College Students

A Facebook-style social network restricted to verified `.edu` email addresses. Built with React 19, Hono, tRPC, Drizzle ORM, and MySQL.

---

## Test the App

**Local dev URL:** [http://localhost:3000](http://localhost:3000)

### Instant login with demo accounts

Run the seed script first (see setup below), then log in with any of these accounts. All use the same password:

| Name | Email | College |
|---|---|---|
| Alex Chen | `alex.chen@harvard.edu` | Harvard |
| Jordan Rivera | `j.rivera@stanford.edu` | Stanford |
| Taylor Park | `t.park@mit.edu` | MIT |
| Morgan Blake | `m.blake@yale.edu` | Yale |
| Casey Kim | `c.kim@berkeley.edu` | Berkeley |
| Riley O'Brien | `r.obrien@harvard.edu` | Harvard |
| Sam Patel | `s.patel@stanford.edu` | Stanford |
| Jamie Foster | `j.foster@mit.edu` | MIT |

**Password for all accounts:** `password123`

### Testing signup (no email server needed)

Since SMTP is not configured in development, verification codes are stored in the database but not emailed. Use the dev endpoint to retrieve the code:

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup) and enter a `.edu` email
2. Retrieve your code:
   ```
   GET http://localhost:3000/api/dev/verification-code?email=you@school.edu
   ```
3. Enter the returned `code` in the verification step

> This endpoint is **only available when `NODE_ENV` is not `production`**. It is not mounted in production builds.

You can also hit `http://localhost:3000/api/dev/seed-accounts` to see the full demo account list in JSON.

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- A MySQL database (local MySQL, PlanetScale, or any MySQL-compatible service)

### 1. Clone and install

```bash
git clone https://github.com/josiah1203/og-facebook.git
cd og-facebook
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```env
DATABASE_URL=mysql://user:password@localhost:3306/ogfacebook
APP_SECRET=any-long-random-string-here
```

The OAuth fields (`APP_ID`, `KIMI_AUTH_URL`, etc.) are only needed if you are using the Kimi platform OAuth login. For local testing with email/password they can be left blank.

### 3. Push the database schema

```bash
npm run db:push
```

### 4. (Optional) Seed demo data

```bash
npx tsx db/seed.ts
```

This creates 8 demo users, friendships, posts, likes, and comments.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with Hono API on port 3000 |
| `npm run build` | Build frontend + bundle API for production |
| `npm run start` | Run production build (`NODE_ENV=production node dist/boot.js`) |
| `npm run check` | TypeScript type-check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run db:push` | Push Drizzle schema to database (no migration files) |
| `npm run db:generate` | Generate SQL migration files |
| `npm run db:migrate` | Apply pending migrations |

---

## Project Structure

```
api/
  boot.ts          Server entry point (Hono app)
  router.ts        Root tRPC router
  context.ts       Request context builder (auth)
  middleware.ts    tRPC instance + auth middleware
  routers/         tRPC procedure routers
    og-auth.ts     Email/password auth (login, signup, verify)
    user.ts        User profile, search, delete
    post.ts        Feed, create, delete
    friendship.ts  Friend requests, accept, reject, list
    like.ts        Like toggle
    comment.ts     Comments
  kimi/            Kimi OAuth platform integration
  lib/             Utilities (env, cookies, JWT, HTTP)
  queries/         DB query helpers
  routes/
    dev.ts         Dev-only test helpers (not in production)

db/
  schema.ts        Drizzle table definitions
  relations.ts     Drizzle relations
  seed.ts          Demo data seeder

contracts/
  constants.ts     Shared constants (session, paths)
  errors.ts        Error factory helpers
  types.ts         Shared type re-exports

components/        React components (OGHeader, PostCard, FriendCard, …)
pages/             React pages (Feed, Profile, Friends, Settings, …)
providers/         tRPC + React Query client setup
hooks/             useAuth, use-mobile
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| API | Hono 4, tRPC 11 |
| Data fetching | TanStack Query 5 |
| ORM | Drizzle ORM |
| Database | MySQL (any MySQL-compatible) |
| Auth | JWT via `jose`, bcrypt, HttpOnly cookies |
| UI | Tailwind CSS 3, shadcn/ui (Radix primitives) |
| Validation | Zod 4 |
