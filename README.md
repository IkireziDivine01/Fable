# Fable

**Intergenerational storytelling for Kinyarwanda language and cultural continuity.**

Fable is a family-centered Progressive Web App that connects **parents**, **learners**, and **elders** through shared stories. Elders record and craft narratives; parents manage the household and approve access; children explore stories in a gesture-friendly reader—including optional immersive 3D playback with characters, environments, weather, lip sync, and playful language moments with **Keza**.

> Heritage language learning should feel like sitting with family—not like a textbook.

---

## Why Fable?

Languages fade when stories stop being told. Fable keeps Kinyarwanda alive by making storytelling a shared family practice:

| Generation | Role in Fable |
|------------|---------------|
| **Elders** | Author and narrate cultural stories, sentence by sentence |
| **Parents** | Create the household, invite members, curate the library |
| **Learners** | Read, listen, and step into immersive story worlds |

Built for families first—with parental consent, invitation-only onboarding for kids and elders, and storytelling that works across generations.

---

## Features

### Family & safety
- **Three roles** — Parent, Learner (kid), and Elder (author), each with dedicated dashboards and permissions
- **Invitation-based onboarding** — Kids and elders join via one-time, expiring codes; parents approve pending learners
- **Household isolation** — Stories and members stay scoped to the family unit

### Storytelling
- **Multiple creation paths** — Manual authoring, quick-story flows, and AI-assisted generation (Claude)
- **Sentence-level audio** — Elders can record narration per sentence; stories also play via TTS when recordings are missing
- **Bilingual content** — English + Kinyarwanda sentence fields, themes, and immersive hotspot notes
- **Kid-friendly reader** — Gesture-oriented reading with pause, language switch, and audio playback
- **Mid-story questions** — Learners can ask family a question during a story; parents answer from the dashboard
- **Synced reading shelf** — Kid library shows new / reading / finished stories from the same activity logs as the parent dashboard

### Immersive 3D worlds
- **Three.js scenes** — Environments (forest, home, village, school, market) with characters and props
- **Living scenes** — Time of day, weather effects, ambient sound, and scene events per sentence
- **Character presence** — Appearance editing, idle motion, reaction gestures, and Rhubarb-style lip sync
- **Cultural hotspots** — Tap props for bilingual notes that deepen the story world

### Kid engagement
- **Keza Word Spark** — Tap a dialogue word to open a playful bilingual gloss with Keza (pauses narration while open)
- **In-story activities** — Treasure hunt, vocab match, sequence, and predict-next moments generated with the story
- **Done-screen recap** — Session highlights after immersive play (including Word Spark moments)

### Voice & AI
- **Kinyarwanda TTS** — [Proto Voice API](https://documentation.proto.cx/docs/developers/apis/voice-api)
- **English TTS** — ElevenLabs character voices (optional Gemini provider)
- **Claude** — Story generation / expansion, word definitions, and translation helpers

### Platform
- **Role-gated routes** — Middleware protects `/parent/*`, `/kid/*`, and `/elder/*`
- **Unit tests** — Vitest coverage for immersive helpers and story utilities

---

## How it works

```mermaid
flowchart LR
  P[Parent signs up] --> H[Household created]
  H --> I[Generate invite codes]
  I --> L[Learner onboard]
  I --> E[Elder onboard]
  E --> S[Create & record stories]
  P --> S
  S --> K[Learner reads / immersive play]
  K --> W[Keza Word Spark & activities]
```

1. **Parent** creates an account and household at `/auth/signup`
2. **Parent** invites learners and elders from `/parent/family`
3. **Family members** join at `/auth/onboard` with a valid code
4. **Elders / parents** write stories, record audio, and optionally configure immersive scenes
5. **Learners** open stories in the reader or step into 3D immersive playback—tapping words for Keza, and playing mid/post-story engagement activities

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| App | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| UI | Tailwind CSS 4 |
| Auth | [NextAuth v5](https://authjs.dev) + Supabase Auth |
| Database & storage | [Supabase](https://supabase.com) (PostgreSQL + Storage) |
| Immersive 3D | Three.js, React Three Fiber, `@react-three/drei`, postprocessing |
| AI | Anthropic Claude (stories, definitions, translation) |
| TTS | Proto Voice (Kinyarwanda), ElevenLabs (English), optional Gemini |
| Client state | Zustand |
| Tests | Vitest |

---

## Getting started

### Prerequisites

- **Node.js 20+**
- A [Supabase](https://supabase.com) project
- *(Optional)* An [Anthropic](https://anthropic.com) API key for AI story generation, Word Spark definitions, and translation
- *(Optional)* Proto / ElevenLabs keys for TTS playback without recorded elder audio

### 1. Clone and install

```bash
git clone <your-repo-url>
cd fable
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth (Auth.js)
NEXTAUTH_SECRET=          # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Optional — AI (stories, Word Spark, translation)
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4-6

# Optional — Kinyarwanda TTS (Proto Voice)
PROTO_TEAMSPACE_ID=
PROTO_TAKEOVER_SECRET=

# Optional — English TTS (ElevenLabs)
ELEVENLABS_API_KEY=
# ELEVENLABS_VOICE_GRANDMA=
# ELEVENLABS_TTS_MODEL=eleven_multilingual_v2

# Optional — Gemini TTS (explicit provider=gemini only)
# GEMINI_API_KEY=
# GEMINI_TTS_FREE_TIER=1
```

See [`.env.example`](./.env.example) for the full list. For production hosts (e.g. Railway), see [`.env.production.example`](./.env.production.example).

### 3. Database setup

Run the SQL scripts in your Supabase SQL Editor, in order:

1. Base auth & household tables — see [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. [`supabase/auth_schema.sql`](./supabase/auth_schema.sql) — account status, role normalization
3. [`supabase/stories_schema.sql`](./supabase/stories_schema.sql) — stories, sentences, audio, interaction logs
4. [`supabase/immersive_schema.sql`](./supabase/immersive_schema.sql) — 3D environments, characters, animation data
5. [`supabase/kid_questions_schema.sql`](./supabase/kid_questions_schema.sql) — mid-story kid questions
6. [`supabase/form_interaction_logs_created_at.sql`](./supabase/form_interaction_logs_created_at.sql) — activity log timestamps (if needed)
7. [`supabase/form_interaction_logs_actor_fk.sql`](./supabase/form_interaction_logs_actor_fk.sql) — activity log actor FK (if needed)

Also apply any files under [`supabase/migrations/`](./supabase/migrations/) if present.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Roles & routes

| Role | How they join | Home | What they can do |
|------|---------------|------|------------------|
| **Parent** | `/auth/signup` | `/parent/dashboard` | Manage family, invite members, create & curate stories |
| **Learner** | `/auth/onboard` (invite code) | `/kid/library` | Read and explore family stories |
| **Elder** | `/auth/onboard` (invite code) | `/elder/dashboard` | Create, edit, and record stories |

### Useful paths

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/auth/signin` | Sign in (all roles) |
| `/parent/family` | Invite and manage household members |
| `/parent/library` | Parent story library |
| `/parent/create-story` | Parent story creation |
| `/parent/quick-story` | Quick AI story flow |
| `/elder/create-story` | Elder story studio |
| `/elder/story/[id]/edit-sentences` | Sentence editing & audio recording |
| `/kid/library` | Learner shelf (new / reading / finished) |
| `/kid/story/[id]` | Learner immersive story reader |
| `/*/story/[id]/immersive` | Immersive 3D playback (parent / kid / elder) |

Middleware enforces role-based access on `/parent/*`, `/kid/*`, and `/elder/*`.

---

## Project structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # REST: auth, stories, TTS, Claude, parent, kid
│   ├── auth/                 # Sign in, sign up, onboard, pending
│   ├── parent/               # Dashboard, family, library, story tools
│   ├── kid/                  # Library & story reader
│   ├── elder/                # Dashboard & story studio
│   └── dashboard/            # Shared post-login entry
├── components/
│   ├── immersive/            # 3D canvas, Keza, Word Spark, engagement overlays
│   ├── story/                # Reader, preview, audio recorder
│   ├── kid/                  # Ask-question sheet, kid shell
│   ├── parent/               # Parent shell / layout chrome
│   └── auth/                 # Auth UI shells & forms
├── lib/
│   ├── immersive/            # Scene specs, engagement, Word Spark, lip sync
│   ├── stories-server.ts     # Story persistence
│   ├── claude.ts             # AI story generation
│   ├── defineWord.ts         # Word Spark definitions
│   ├── protoTts.ts / elevenLabsTts.ts / geminiTts.ts
│   └── supabase*.ts          # DB clients & helpers
├── auth.ts                   # NextAuth configuration
└── middleware.ts             # Route protection & role redirects

supabase/                     # SQL schemas & migrations
```

---

## API overview

Key routes under `src/app/api/`:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/signup` | Parent account creation |
| `POST` | `/api/auth/onboard` | Join via invitation |
| `POST` | `/api/auth/validate-invitation` | Validate invite code |
| `GET` / `POST` | `/api/stories` | List / create stories |
| `GET` / `PATCH` | `/api/stories/[id]` | Story detail & updates |
| `GET` / `PATCH` | `/api/stories/[id]/immersive` | Immersive scene config |
| `POST` | `/api/stories/[id]/activity` | Reading progress / activity |
| `POST` | `/api/claude/generate-story` | AI story generation |
| `POST` | `/api/claude/expand-story` | AI story expansion |
| `POST` | `/api/tts` | Narration TTS (Proto / ElevenLabs / Gemini) |
| `POST` | `/api/define-word` | Keza Word Spark definitions |
| `POST` | `/api/translate` | Bilingual translation helper |
| `GET` / `POST` / `PATCH` | `/api/questions` | Mid-story kid questions |
| `GET` | `/api/kid/library` | Learner shelf data |
| `POST` | `/api/parent/invite` | Create invitation |
| `POST` | `/api/parent/approve` | Approve pending learner |
| `GET` | `/api/parent/family` | Household members |
| `GET` | `/api/parent/activity` | Family activity |

Database helper details: [SUPABASE_API_REFERENCE.md](./SUPABASE_API_REFERENCE.md).

---

## Scripts

```bash
npm run dev                 # Development server
npm run build               # Production build
npm run start               # Serve production build
npm run lint                # ESLint
npm run test                # Vitest (once)
npm run test:watch          # Vitest watch mode
npm run generate:prop-models  # Rebuild procedural prop GLBs
```

---

## Documentation

| Guide | Contents |
|-------|----------|
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Full auth & Supabase setup walkthrough |
| [FAMILY_ROLES_GUIDE.md](./FAMILY_ROLES_GUIDE.md) | Invitation flow & role permissions |
| [PARENTAL_CONSENT_GUIDE.md](./PARENTAL_CONSENT_GUIDE.md) | Parent-controlled account creation |
| [SUPABASE_API_REFERENCE.md](./SUPABASE_API_REFERENCE.md) | Supabase helper functions |

---

## Deployment

Configured for [Railway](https://railway.app) (see [`.railwayrc.json`](./.railwayrc.json)).

1. Create a Railway (or similar) service from this repo
2. Set env vars from [`.env.production.example`](./.env.production.example) — especially `NEXTAUTH_URL` to your public URL
3. Deploy with:

```bash
npm run build && npm run start
```

Ensure Supabase Auth redirect URLs and storage policies match your production domain.

---

## Design principles

- **Family-first** — Parents gatekeep access; kids never self-register into a household
- **Heritage over hype** — Kinyarwanda is a first-class content surface, not an afterthought
- **Story as product** — Reading, listening, and immersive play share one narrative model
- **Playful learning** — Word Spark and engagement activities teach without feeling like a quiz
- **Clarity** — Role-gated surfaces so each family member sees only what they need

---

## License

Private project (`"private": true` in `package.json`). All rights reserved unless otherwise stated by the maintainers.
