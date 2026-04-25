# OG Facebook — Audit & Task List

Generated: 2026-04-25

---

## Repository State Summary

The frontend is **~95% complete** — routing, pages, components, state management, and UI are all present and well-structured. The **entire backend API layer is missing** from the repository and must be rebuilt. The database schema (`db/schema.ts`) exists and is well-designed, but connection logic, migrations runner, and all server-side code are absent.

---

## Priority 1 — Critical: Rebuild Backend API

These are blockers. The app cannot run at all without them.

### 1.1 Server Entry Point
- [ ] Create `api/boot.ts` — Hono app initialization, attaches middleware and tRPC handler, starts `@hono/node-server` on port 3000
- [ ] Create `api/trpc.ts` — Initialize tRPC instance (`initTRPC`) with context type and SuperJSON transformer
- [ ] Create `api/context.ts` — Build tRPC context from incoming `HonoRequest`: extract session cookie, decode JWT, attach `db` and `user` to context
- [ ] Create `api/router.ts` — Root tRPC router that merges all sub-routers; export `AppRouter` type (consumed by `providers/trpc.tsx`)

### 1.2 Database Connection
- [ ] Create `db/index.ts` — Drizzle + MySQL2 connection pool; read `DATABASE_URL` from env
- [ ] Create `db/migrations/` runner — `drizzle-kit push` or migration apply script for CI/CD
- [ ] Move hardcoded DB credentials out of `seed.mjs` into `.env` / environment variables
- [ ] Add `.env.example` documenting all required environment variables (`DATABASE_URL`, `JWT_SECRET`, `AWS_*`, `SMTP_*`)

### 1.3 Auth Router (`api/routes/auth.ts`)
Procedures to implement — all inferred from frontend tRPC calls:

| Procedure | Type | Description |
|---|---|---|
| `ogAuth.me` | query | Return current user from JWT cookie; return `null` if unauthenticated |
| `ogAuth.login` | mutation | Verify email + bcrypt password hash; issue HttpOnly JWT cookie |
| `ogAuth.logout` | mutation | Clear JWT cookie |
| `ogAuth.sendVerificationCode` | mutation | Generate 6-digit code, store in `emailVerifications`, send via SMTP |
| `ogAuth.verifyEmail` | mutation | Check code + expiry; mark email as verified |
| `ogAuth.signup` | mutation | Validate `.edu` email, hash password, insert user, return JWT cookie |

- [ ] Implement all six procedures above
- [ ] Enforce `.edu` email domain validation server-side (currently only client-side)
- [ ] Set `emailVerified = true` on successful verification
- [ ] JWT: sign with `jose`, store as `HttpOnly; Secure; SameSite=Lax` cookie
- [ ] Implement code expiry cleanup (remove expired rows from `emailVerifications`)

### 1.4 User Router (`api/routes/user.ts`)

| Procedure | Type | Description |
|---|---|---|
| `user.getById` | query | Fetch user by ID; omit `passwordHash` |
| `user.updateProfile` | mutation | Update `bio`, `major`, `hometown`; auth required |
| `user.search` | query | Full-text or LIKE search on `name` field |
| `user.listByCollege` | query | Return users sharing `college` with current user |
| `user.deleteAccount` | mutation | Hard-delete current user and all related rows |

- [ ] Implement all five procedures
- [ ] Never return `passwordHash` in any user query response
- [ ] `updateProfile` must verify the caller owns the record (protect against IDOR)
- [ ] `deleteAccount` should cascade: posts, friendships, likes, comments, emailVerifications

### 1.5 Post Router (`api/routes/post.ts`)

| Procedure | Type | Description |
|---|---|---|
| `post.listFeed` | infinite query | Cursor-based pagination; order by `createdAt DESC`; include author, like count, comment count |
| `post.listByUser` | query | Posts authored by a specific user ID |
| `post.create` | mutation | Insert post; enforce 2000-char limit server-side |
| `post.delete` | mutation | Delete post; verify caller is author |

- [ ] Implement all four procedures
- [ ] `listFeed` — restrict to posts from friends + self (social graph filtering) or all-college feed (decide scope)
- [ ] `post.delete` — return `403` if caller is not the post author

### 1.6 Friendship Router (`api/routes/friendship.ts`)

| Procedure | Type | Description |
|---|---|---|
| `friendship.listFriends` | query | Accepted friendships for current user |
| `friendship.listRequests` | query | Incoming pending requests |
| `friendship.listPending` | query | Outgoing pending requests |
| `friendship.isFriend` | query | Check relationship status between two users |
| `friendship.listMutualFriends` | query | Intersection of two users' friend lists |
| `friendship.request` | mutation | Insert pending friendship row |
| `friendship.accept` | mutation | Update status to `accepted`; verify caller is addressee |
| `friendship.reject` | mutation | Delete pending row; verify caller is addressee |
| `friendship.remove` | mutation | Delete accepted friendship row |

- [ ] Implement all nine procedures
- [ ] Prevent duplicate requests (unique index already in schema; handle constraint error gracefully)
- [ ] Prevent self-friending

### 1.7 Like Router (`api/routes/like.ts`)

| Procedure | Type | Description |
|---|---|---|
| `like.toggle` | mutation | Insert like if not exists; delete if exists; return new state |
| `like.countByPost` | query | Return like count for a post (used internally by `listFeed`) |

- [ ] Implement toggle with upsert/delete logic
- [ ] Handle unique constraint on `(userId, postId)` gracefully

### 1.8 Comment Router (`api/routes/comment.ts`)

| Procedure | Type | Description |
|---|---|---|
| `comment.create` | mutation | Insert comment with auth check |
| `comment.listByPost` | query | Return comments for a post with author info |
| `comment.delete` | mutation | Delete comment; verify caller is author |

- [ ] Implement all three procedures
- [ ] Add server-side character limit for comments

---

## Priority 2 — Incomplete Features (Frontend + Backend)

### 2.1 Delete Account (Settings page)
- [ ] `Settings.tsx:156` — `onClick` handler is missing on the "Delete Account" `Button`; wire up `user.deleteAccount` tRPC mutation
- [ ] Add confirmation dialog before deletion (shadcn `AlertDialog` is available)
- [ ] On success, clear cookie and redirect to `/`

### 2.2 Avatar / Profile Picture Upload
- [ ] The `avatarUrl` column exists in the DB schema but there is no upload UI
- [ ] Add an "Upload Photo" button on the Profile page edit modal
- [ ] Create a tRPC procedure `user.getAvatarUploadUrl` that returns a pre-signed S3 PUT URL
- [ ] After S3 upload succeeds client-side, call `user.updateProfile` to save the returned S3 object URL to `avatarUrl`
- [ ] The AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) is already installed

### 2.3 Email Delivery
- [ ] No email-sending implementation exists anywhere
- [ ] Add SMTP client (e.g., `nodemailer` or `@sendgrid/mail`) to send the 6-digit verification code
- [ ] Create `api/lib/email.ts` with a `sendVerificationEmail(to, code)` helper
- [ ] Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` to `.env.example`
- [ ] Design a simple HTML email template for the verification code

### 2.4 Comment Deletion (Frontend)
- [ ] `PostCard.tsx` renders comments but provides no delete button for own comments
- [ ] Add a delete icon (Lucide `Trash2`) next to own comments; call `comment.delete` mutation

### 2.5 Post Images / Media
- [ ] Schema has no `mediaUrl` column yet — add optional `imageUrl` text column to `posts`
- [ ] Update `PostComposer.tsx` to accept an optional image attachment
- [ ] Use same S3 pre-signed URL pattern as avatar upload

---

## Priority 3 — Bugs & Code Issues

### 3.1 Variable Declaration Order (`Profile.tsx`)
- [ ] `Profile.tsx:58` — `utils` (from `trpc.useUtils()`) is referenced before it is declared on line ~75; move the `const utils = trpc.useUtils()` call above its first usage

### 3.2 Unused `Home.tsx` Page
- [ ] `pages/Home.tsx` is a 20-line placeholder template that is never referenced in the router; either implement it or delete it

### 3.3 `tsconfig.server.json` References Missing Path
- [ ] `tsconfig.server.json` references `api/boot.ts` which doesn't exist; this will cause `tsc` to fail until the API is rebuilt

### 3.4 Seed Script Credentials
- [ ] `seed.mjs` contains a hardcoded Aliyun PolarDB connection string with credentials embedded; replace with `process.env.DATABASE_URL` lookup

### 3.5 Client-Side Only `.edu` Validation
- [ ] `.edu` domain check exists in `Signup.tsx` but must also be enforced in `ogAuth.signup` and `ogAuth.sendVerificationCode` server-side procedures

---

## Priority 4 — Security Hardening

- [ ] **Password policy** — Enforce minimum length (8+ chars) and complexity server-side in `ogAuth.signup`; currently only client-side
- [ ] **Rate limiting** — Add per-IP rate limiting on `sendVerificationCode` and `login` to prevent brute-force and code enumeration; consider `hono-rate-limiter` or Redis-backed limiter
- [ ] **JWT expiry** — Set a reasonable expiry (e.g., 7 days) on JWTs; implement refresh-token pattern or sliding session if needed
- [ ] **CORS** — Configure Hono CORS middleware to restrict `Access-Control-Allow-Origin` to known origins in production
- [ ] **Helmet-equivalent headers** — Add security headers (CSP, X-Frame-Options, HSTS, etc.) via Hono middleware
- [ ] **IDOR on profile edits** — `user.updateProfile` must check `ctx.user.id === input.id`; never trust client-supplied user IDs
- [ ] **Expired verification codes** — Periodically clean `emailVerifications` rows past `expiresAt`; add a cron or lazy-delete on lookup
- [ ] **SQL injection** — Drizzle's parameterized queries protect against this by default; avoid raw SQL strings in any future additions
- [ ] **Content length enforcement** — Validate `post.content` ≤ 2000 chars and `comment.content` limits server-side, not just in UI

---

## Priority 5 — Missing Features (New Work)

### 5.1 Notifications
- [ ] Add `notifications` table to schema: `(id, userId, type, payload JSON, readAt, createdAt)`
- [ ] Emit notifications on: new friend request, accepted request, like on post, comment on post
- [ ] Add notification bell icon to `OGHeader.tsx` with unread count badge
- [ ] `notification.listUnread` and `notification.markRead` tRPC procedures

### 5.2 Direct Messaging
- [ ] Add `messages` table: `(id, senderId, recipientId, content, createdAt)`
- [ ] Message inbox page at `/messages`
- [ ] `message.send`, `message.listThread`, `message.listInbox` procedures
- [ ] Optional: WebSocket / SSE for real-time delivery (Hono supports SSE natively)

### 5.3 Post Search
- [ ] Add search bar on the Feed page
- [ ] `post.search` tRPC procedure with full-text MySQL `MATCH ... AGAINST` or LIKE fallback
- [ ] Filter feed by keyword

### 5.4 User Blocking / Reporting
- [ ] Add `blocks` table: `(blockerId, blockedId, createdAt)`
- [ ] `user.block` and `user.unblock` mutations
- [ ] Filter blocked users from search results, feed, and friend suggestions
- [ ] Add `reports` table for content moderation queue

### 5.5 OAuth / Social Login
- [ ] Schema already has `unionId` column for third-party identity providers
- [ ] Add Google OAuth flow via Hono middleware (restrict to `@*.edu` Google Workspace accounts)
- [ ] Map Google `sub` claim to `unionId`

### 5.6 Admin Dashboard
- [ ] Role column (`user` | `admin`) already exists in the schema
- [ ] Add `/admin` route protected by role check
- [ ] Admin views: user list, post moderation queue, report review

### 5.7 Feed Scope Toggle
- [ ] Currently unclear whether the feed shows posts from friends-only or all campus users
- [ ] Add a toggle on the Feed page: "Friends" vs. "My Campus"
- [ ] `post.listFeed` should accept a `scope: "friends" | "campus"` input parameter

### 5.8 Pagination on Friends / Search
- [ ] `user.listByCollege` and `user.search` should return paginated results instead of unbounded lists

---

## Priority 6 — Developer Experience & Infrastructure

### 6.1 Environment Configuration
- [ ] Create `.env.example` with all required keys:
  ```
  DATABASE_URL=mysql://user:pass@host:3306/ogfacebook
  JWT_SECRET=change-me-in-production
  AWS_REGION=
  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  S3_BUCKET=
  SMTP_HOST=
  SMTP_PORT=587
  SMTP_USER=
  SMTP_PASS=
  SMTP_FROM=noreply@og.edu
  NODE_ENV=development
  ```
- [ ] Add `.env` to `.gitignore` (verify it is already excluded)

### 6.2 Testing
- [ ] `vitest.config.ts` exists but there are **zero test files** in the repository
- [ ] Add unit tests for auth utilities (JWT sign/verify, bcrypt hash/compare)
- [ ] Add integration tests for critical tRPC procedures (auth, post CRUD, friendship flow)
- [ ] Add a `test:ci` script to `package.json`

### 6.3 Linting & Formatting
- [ ] `eslint.config.js` and `prettier` are configured; add a pre-commit hook (`husky` + `lint-staged`) to enforce on commit
- [ ] Run `eslint --fix` across the codebase to clear any existing violations

### 6.4 Error Handling
- [ ] Add a global tRPC error formatter in `api/trpc.ts` to normalize error shapes and avoid leaking stack traces in production
- [ ] Add a Hono `onError` handler for uncaught exceptions
- [ ] Surface user-friendly toast messages for common errors (network failure, session expired)

### 6.5 Logging
- [ ] Add structured logging (e.g., `pino`) in the API layer for request/response tracing and error reporting
- [ ] Log auth failures (failed login attempts) for security auditing

### 6.6 Docker & Deployment
- [ ] `Dockerfile` exists but the `api/boot.ts` it references is missing; it will fail to build until the API is rebuilt
- [ ] Add `docker-compose.yml` for local development with MySQL service wired up
- [ ] Add health-check endpoint `GET /health` returning `{ status: "ok" }`
- [ ] Add `HEALTHCHECK` directive to `Dockerfile`

### 6.7 Database Migrations Workflow
- [ ] Document the `drizzle-kit generate` → `drizzle-kit migrate` workflow in `README.md`
- [ ] Add `npm run db:migrate` and `npm run db:seed` scripts to `package.json`

### 6.8 README Updates
- [ ] `README.md` describes a basic setup but is incomplete
- [ ] Add: full local dev setup, environment variable reference, DB migration steps, S3 setup, SMTP setup

---

## Priority 7 — UI / UX Improvements

- [ ] **Cover photo upload** — Profile page shows a static gray gradient; add an optional cover photo upload (S3) similar to avatar
- [ ] **Post timestamps** — Display full date on hover (tooltip) over relative timestamps ("5m ago")
- [ ] **Empty states** — Feed, Friends, and Requests tabs show no visual feedback when empty; add illustrated empty-state messages
- [ ] **Optimistic UI** — Like toggle and comment submit could use React Query optimistic updates for instant feedback instead of waiting for server round-trip
- [ ] **Infinite scroll** — Feed uses `fetchNextPage` but requires a manual "Load more" click; consider auto-triggering on scroll with an `IntersectionObserver`
- [ ] **Mobile nav** — `OGHeader.tsx` has a mobile menu toggle button but the dropdown/drawer is not implemented
- [ ] **Character counter color** — `PostComposer.tsx` shows a character counter but it doesn't change color as the limit approaches; add yellow at 1800 and red at 1950+
- [ ] **Accessibility** — Audit focus management in modals, ensure all interactive elements have `aria-label`s, check color contrast ratios for the blue `#3B5998` on white backgrounds

---

## Summary Table

| Priority | Category | Tasks |
|---|---|---|
| 1 | Backend API (blockers) | ~35 procedures across 6 routers + server setup |
| 2 | Incomplete frontend features | 5 areas (delete account, avatar upload, email, comment delete, post images) |
| 3 | Bugs & code issues | 5 items |
| 4 | Security hardening | 9 items |
| 5 | New features | 8 features |
| 6 | Dev experience & infra | 8 areas |
| 7 | UI/UX improvements | 8 items |

**Total estimated tasks: ~78 discrete action items**

The single highest-leverage action is rebuilding the `api/` directory — once that exists, the frontend (which is already production-quality) will come to life immediately.
