# Fable

**Intergenerational storytelling for Kinyarwanda language and cultural continuity.**

Fable is a family-centered web app that connects parents, learners, and elders through shared stories. Elders record and craft narratives; parents manage the household; kids explore stories in a reader-friendly experience—including optional immersive 3D playback with character animation and lip sync.

## Features

- **Role-based family accounts** — Parent, Learner (kid), and Elder (author) profiles with separate dashboards and permissions
- **Parental invitation system** — Kids and elders join via one-time, expiring invitation codes; parents approve pending learners
- **Story creation** — Manual authoring, quick-story flows, and AI-assisted generation (Claude)
- **Sentence-level audio** — Elders record narration per sentence; audio stored in Supabase Storage
- **Kinyarwanda support** — Bilingual sentence fields and theme labels for heritage language learning
- **Immersive 3D playback** — Three.js scenes with environments, characters, and mouth-sync timing
- **Offline-first architecture** — RxDB schema for local sync (PWA-oriented design)

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Framework | [Next.js 16](https://nextjs.org), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | [NextAuth v5](https://authjs.dev), Supabase Auth |
| Database | Supabase (PostgreSQL) |
| 3D / Immersive | Three.js, React Three Fiber, `@react-three/drei` |
| AI | Anthropic Claude (story generation & expansion) |
| State | Zustand, TanStack React Query |
| Offline | RxDB |

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Optional — AI story generation
ANTHROPIC_API_KEY=sk-ant-...
```

For production deployment, see `.env.production.example`.

### 3. Set up the database

Run the SQL migrations in your Supabase SQL Editor, in order:

1. Base auth & household tables (see [SETUP_GUIDE.md](./SETUP_GUIDE.md) for the full schema)
2. [`supabase/auth_schema.sql`](./supabase/auth_schema.sql) — account status, role normalization
3. [`supabase/stories_schema.sql`](./supabase/stories_schema.sql) — stories, sentences, audio, interaction logs
4. [`supabase/immersive_schema.sql`](./supabase/immersive_schema.sql) — 3D environments, characters, animation data

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Roles & Routes

| Role | Sign up | Home route | Capabilities |
|------|---------|------------|--------------|
| **Parent** | [`/auth/signup`](http://localhost:3000/auth/signup) | `/parent/dashboard` | Manage family, invite members, create stories |
| **Learner** | [`/auth/onboard`](http://localhost:3000/auth/onboard) (invitation code) | `/kid/library` | Read and explore family stories |
| **Elder** | [`/auth/onboard`](http://localhost:3000/auth/onboard) (invitation code) | `/elder/dashboard` | Create, edit, and record stories |

Common routes:

| Route | Description |
|-------|-------------|
| `/auth/signin` | Sign in (all roles) |
| `/parent/family` | Invite and manage household members |
| `/parent/create-story` | Parent story creation |
| `/parent/quick-story` | Quick AI story flow |
| `/elder/create-story` | Elder story studio |
| `/elder/story/[id]/edit-sentences` | Sentence editing and audio recording |
| `/kid/story/[id]` | Story reader for learners |
| `/kid/story/[id]/immersive` | Immersive 3D story playback |

Middleware enforces role-based access on `/parent/*`, `/kid/*`, and `/elder/*` routes.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # REST endpoints (stories, auth, Claude, parent)
│   ├── auth/             # Sign in, sign up, onboarding
│   ├── parent/           # Parent dashboard and story tools
│   ├── kid/              # Learner library and story reader
│   └── elder/            # Elder dashboard and story studio
├── components/
│   ├── immersive/        # 3D canvas, characters, setup wizard
│   └── story/            # Reader, preview, audio recorder
├── lib/
│   ├── immersive/        # 3D presets, lip sync, server helpers
│   ├── supabase.ts       # Database and auth helpers
│   └── claude.ts         # AI story generation
├── auth.ts               # NextAuth configuration
└── middleware.ts         # Route protection and role redirects

supabase/                 # SQL migration scripts
```

## API Overview

Key API routes under `src/app/api/`:

- `POST /api/auth/signup`, `/api/auth/onboard` — Account creation
- `GET|POST /api/stories` — List and create stories
- `GET|PATCH /api/stories/[id]` — Story detail and updates
- `POST /api/claude/generate-story`, `/api/claude/expand-story` — AI generation
- `POST /api/parent/invite`, `/api/parent/approve` — Family management
- `GET|PUT /api/stories/[id]/immersive` — Immersive story configuration

See [SUPABASE_API_REFERENCE.md](./SUPABASE_API_REFERENCE.md) for database function details.

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Additional Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) — Full auth and Supabase setup walkthrough
- [FAMILY_ROLES_GUIDE.md](./FAMILY_ROLES_GUIDE.md) — Invitation flow and role permissions
- [PARENTAL_CONSENT_GUIDE.md](./PARENTAL_CONSENT_GUIDE.md) — Parent-controlled account creation
- [SUPABASE_API_REFERENCE.md](./SUPABASE_API_REFERENCE.md) — Supabase helper functions

## Deployment

The app is configured for [Railway](https://railway.app) (see `.railwayrc.json`). Set the environment variables from `.env.production.example` in your hosting dashboard and run:

```bash
npm run build && npm run start
```
