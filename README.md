# Skyy Learn

Human-in-the-loop AI practice engine for 1:1 tutors and adult learners.

Skyy Learn turns messy tutor session notes into verified practice questions. The core safety principle is: **nothing is shared until the human tutor approves**. Every drill is generated via a fast primary LLM, audited by an independent secondary LLM, and gated behind human tutor verification before a learner can view or answer it.

---

## Table of Contents

1. [Architecture](#architecture)
   - [System Overview](#system-overview)
   - [Dual-LLM Pipeline (Generation + Verification)](#dual-llm-pipeline-generation--verification)
   - [The Approval Rule & Access Gating](#the-approval-rule--access-gating)
   - [Real-Time WebSocket Synchronization](#real-time-websocket-synchronization)
2. [Deployment Guide](#deployment-guide)
   - [Database: Neon Serverless Postgres](#1-database-neon-serverless-postgres)
   - [Backend: Render or Fly.io (WebSockets)](#2-backend-render-or-flyio)
   - [Frontend: Vercel (SPA)](#3-frontend-vercel)
3. [Architectural Tradeoffs](#architectural-tradeoffs)
4. [Adding Payments (Stripe Connect)](#adding-payments-stripe-connect)
5. [Adding Video (LiveKit)](#adding-video-livekit)
6. [Local Development & Testing](#local-development--testing)

---

## Architecture

### System Overview

```
                      +-----------------------------+
                      |   Vercel (Frontend SPA)     |
                      |   React 19 + Vite + Tailwind|
                      +--------------+--------------+
                                     |
               HTTPS (REST)          |          WSS (WebSockets)
                     |               |                 |
                     v               v                 v
          +-------------------------------------------------+
          |           Render / Fly.io (Backend)             |
          |       Node.js 22 + Hono + ws (/ws server)       |
          +----------+-----------------------+--------------+
                     |                       |
                     v                       v
      +-----------------------------+  +-------------------------------+
      |    Dual-LLM Engine (Groq)   |  |   Neon Serverless Postgres    |
      |  1. Generator: Qwen 3.8 27B |  |   Connection Pooler (PgBouncer) |
      |  2. Auditor: GPT-OSS 20B    |  |   Profiles, Sessions, Drills  |
      +-----------------------------+  +-------------------------------+
```

The system is split into two specialized runtime environments:
- **Client Tier (Vercel)**: Static single-page application served over global CDN edge. Handles role switching (tutor vs learner), optimistic UI updates, tactile paper aesthetic, and WebSocket event consumption.
- **Server Tier (Render / Fly.io)**: Long-lived Node.js container running Hono. Handles LLM generation, Zod schema validation, independent audit passes, database persistence, and persistent WebSocket connections (`/ws`) for bidirectional multi-client push.
- **Storage Tier (Neon Postgres)**: Relational storage with connection pooling, table constraints, and foreign key cascades.

---

### Dual-LLM Pipeline (Generation + Verification)

Generating educational materials requires high factual precision and zero hallucinated answer keys. Skyy Learn solves this using an asymmetrical dual-model pipeline:

```
Tutor Notes
    │
    ▼
[Attempt 1..3]
    │
    ▼
Qwen 3.8 27B (Groq LPU) ────► Raw JSON
    │
    ▼
Zod Schema Validation
    │
    ├── FAIL ──► formatZodFeedback() ──► Error Prompt ──► Retry Loop
    │
    ▼ PASS
Auditor LLM (GPT-OSS 20B)
    │
    ├── Confirms Answer Key ──► status: "verified" (confidence: 95%)
    │
    └── Doubts Answer Key   ──► status: "flagged" + suggestedCorrectIndex
    │
    ▼
Save to PostgreSQL with approved_at = NULL (Locked State)
```

1. **Primary Generation (Qwen 3.8 27B on Groq LPU)**:
   - High speed generation (~250 tokens per second).
   - Generates 2 to 4 practice questions grounded specifically in the tutor's notes.
   - Strictly outputs structured JSON conforming to `RawDrillSchema`.

2. **Validate-Feedback-Retry Loop**:
   - The output is validated against `RawDrillSchema` and `GroqOutputSchema`.
   - Catches 1-based indexing bugs (e.g., `correctIndex = 4` when `options.length = 4`).
   - Catches duplicate answer options (e.g., repeated choices).
   - Catches empty options, short questions (< 5 chars), or short explanations (< 5 chars).
   - If validation fails, `formatZodFeedback()` formats issues into an actionable feedback prompt and feeds it back into the model context for up to 3 self-correction retries.

3. **Independent Correctness Pass (GPT-OSS 20B Auditor)**:
   - Evaluates the generated drills using an independent model to mitigate single-model bias.
   - Solves the math/logic independently and checks if the generator's `correctIndex` matches reality.
   - Flags doubtful drills with `suggestedCorrectIndex` and displays them in the tutor review view with amber warning indicators.

---

### The Approval Rule & Access Gating

The core pedagogical constraint: **drills must never be seen by the student before human review**.

```
[New Notes] ──► Generated ──► approved_at: NULL, is_approved: false
                                      │
               Learner requests GET /api/learner/drills
                                      │
                                      ▼
                               [HTTP 403 FORBIDDEN]
                                      │
               Tutor inspects, edits, clicks "Approve all"
                                      │
                                      ▼
                        POST /api/drills/approve-all
                                      │
              approved_at: TIMESTAMP, is_approved: true
                                      │
               Learner requests GET /api/learner/drills
                                      │
                                      ▼
                                [HTTP 200 OK]
```

- When drills are created, `approvedAt` is set to `null` and `session.is_approved` is `false`.
- The learner endpoint `GET /api/learner/drills` returns HTTP 403 Forbidden with `drills: []` until approval occurs.
- The tutor can review questions, accept the auditor's suggested corrections, dismiss false-positive flags, or edit questions and explanations directly.
- When the tutor clicks "Approve all", `POST /api/drills/approve-all` stamps all drills with an ISO timestamp, flips `is_approved` to `true`, and broadcasts `DRILLS_APPROVED` over WebSockets.
- If the tutor creates new notes or re-generates drills, `is_approved` resets to `false`, immediately relocking the learner screen.

---

### Real-Time WebSocket Synchronization

To avoid clunky page refreshes during live tutoring sessions, a native WebSocket server is mounted on `/ws`:

- **Handshake (`CONNECTED`)**: Clients receive an immediate connection handshake with unique `clientId` and active connection count.
- **Tutor Approval (`DRILLS_APPROVED`)**: When the tutor approves drills, the server pushes the approved drill set. Connected learner screens automatically unlock the practice tab without a page reload.
- **Learner Question Flag (`QUESTION_FLAGGED`)**: When a learner flags a confusing question, the server pushes the question details and student note. The tutor's sidebar flag counter and the next session agenda sheet update live.

---

## Deployment Guide

### 1. Database: Neon Serverless Postgres

Neon provides serverless PostgreSQL with connection pooling (PgBouncer) and branching.

1. Create a Neon project at [neon.tech](https://neon.tech).
2. Copy your pooled connection string:
   ```bash
   postgresql://skyy_owner:<password>@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Run the schema migrations:
   ```bash
   NEON_DATABASE_URL="postgresql://skyy_owner:<password>@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" npm run migrate
   ```
   This executes `server/schema.sql` and sets up `profiles`, `sessions`, `session_notes`, `drills`, `drill_attempts`, and `flagged_topics`.

---

### 2. Backend: Render or Fly.io

The backend requires a persistent Node.js environment to maintain active WebSocket connections.

#### Option A: Deploying to Fly.io

Fly.io runs the container close to users with native WebSocket support.

1. Install Fly CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
2. Authenticate:
   ```bash
   fly auth login
   ```
3. Initialize the app using the included `fly.toml` and `Dockerfile`:
   ```bash
   fly launch --no-deploy
   ```
4. Set production secrets:
   ```bash
   fly secrets set \
     NEON_DATABASE_URL="postgresql://skyy_owner:<password>@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require" \
     GROQ_API_KEY="gsk_..." \
     NODE_ENV="production"
   ```
5. Deploy:
   ```bash
   fly deploy
   ```
6. Verify health check:
   ```bash
   curl https://skyy-learn-backend.fly.dev/api/health
   ```

#### Option B: Deploying to Render

Render supports Web Services with persistent WebSockets via the included `render.yaml`.

1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Select **Blueprints** and connect your GitHub repository.
3. Render detects `render.yaml` and provisions the `skyy-learn-backend` web service.
4. Set `NEON_DATABASE_URL` and `GROQ_API_KEY` in the environment variables tab.
5. Deploy service.

---

### 3. Frontend: Vercel

The frontend is deployed as a static single-page application.

1. Install Vercel CLI or connect via GitHub:
   ```bash
   npx vercel
   ```
2. Set environment variables on Vercel:
   - `VITE_API_BASE_URL`: `https://skyy-learn-backend.fly.dev` (or Render URL)
   - `VITE_WS_URL`: `wss://skyy-learn-backend.fly.dev/ws`
3. Deploy to production:
   ```bash
   npx vercel --prod
   ```
4. `vercel.json` automatically handles SPA client-side routing rewrites (`/(.*)` -> `/index.html`) and security headers.

---

## Architectural Tradeoffs

| Decision | Chosen Approach | Alternative Considered | Rationale & Tradeoff |
| :--- | :--- | :--- | :--- |
| **API Runtime** | Long-lived Node.js process (Render / Fly) | Serverless Functions (Vercel Functions / AWS Lambda) | Serverless functions cannot sustain persistent WebSocket connections (`/ws`). Long-lived Node handles both REST endpoints and real-time push on a single port. Tradeoff: Requires a server instance rather than pure scale-to-zero function execution. |
| **Real-Time Protocol** | Native WebSockets (`ws`) | Server-Sent Events (SSE) / HTTP Long Polling | WebSockets allow bidirectional communication (learner flags up, tutor approvals down) with sub-10ms delivery. Tradeoff: Requires reconnection logic and connection tracking. |
| **LLM Pipeline** | Fast generator (27B) + Independent auditor (20B) | Single 70B/405B monolithic LLM | Two smaller models run on Groq LPU in ~1.2s total, cost ~80% less, and provide an independent second opinion on math answer keys. Tradeoff: Managing two model prompts and schemas instead of one. |
| **Database** | Neon Serverless Postgres with pooling | DynamoDB / MongoDB / SQLite | Educational content is relational: sessions have notes, notes generate drills, drills have attempts and flags. Postgres enforces referential integrity. Tradeoff: Neon can take ~500ms to wake from cold sleep on idle tiers unless warmed. |
| **Validation Layer** | Strict Zod schema + feedback loop | Free-form markdown with regex parsing | Zod catches subtle errors (e.g. 1-based indexing, duplicate options) before data touches the database. Tradeoff: Requires prompt structure instructions and up to 3 retries on malformed output. |

---

## Adding Payments (Stripe Connect)

To monetize the platform, Skyy Learn would implement a tutor marketplace model where students pay for tutoring packages and tutors receive automated payouts minus a platform fee.

### Model: Stripe Connect Express with Destination Charges

1. **Tutor Onboarding**: Tutors complete Stripe Express onboarding to submit bank details and identity verification.
2. **Student Checkout**: Student pays for a tutoring package or session.
3. **Destination Charge**: Payment is processed through the platform. The platform retains an application fee (e.g., 15%) and the remaining balance is transferred directly to the tutor's connected account.
4. **Escrow Hold Rule**: Funds are held in escrow and transferred only when the tutor completes and approves the post-session practice drills, aligning payment with pedagogical delivery.

### Database Schema Additions

```sql
-- 1. Tutor Stripe Accounts
CREATE TABLE public.tutor_payout_profiles (
  tutor_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'usd',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Session Payments & Escrow
CREATE TABLE public.session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id),
  learner_id UUID NOT NULL REFERENCES public.profiles(id),
  tutor_id UUID NOT NULL REFERENCES public.profiles(id),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'held_in_escrow' 
    CHECK (status IN ('requires_payment', 'held_in_escrow', 'released_to_tutor', 'refunded')),
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Backend Endpoints

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

// 1. Create Tutor Onboarding Link
app.post('/api/payments/connect/onboard', async (c) => {
  const { tutorId, email } = await c.req.json();
  
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_type: 'individual'
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: 'https://skyy-learn.vercel.app/tutor/billing/refresh',
    return_url: 'https://skyy-learn.vercel.app/tutor/billing/complete',
    type: 'account_onboarding',
  });

  return c.json({ url: accountLink.url });
});

// 2. Checkout Session with Destination Charge & Platform Fee
app.post('/api/payments/create-checkout', async (c) => {
  const { sessionId, learnerId, tutorId, amountCents } = await c.req.json();
  const tutorProfile = await db.getTutorPayoutProfile(tutorId);
  const platformFee = Math.round(amountCents * 0.15); // 15% platform fee

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: '1:1 Tutoring Session + Verified Drill Pack' },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: tutorProfile.stripeAccountId,
      },
    },
    success_url: `https://skyy-learn.vercel.app/sessions/${sessionId}?payment=success`,
    cancel_url: `https://skyy-learn.vercel.app/sessions/${sessionId}?payment=cancelled`,
  });

  return c.json({ checkoutUrl: session.url });
});

// 3. Webhook Handler
app.post('/api/payments/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')!;
  const rawBody = await c.req.text();
  const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    // Mark session payment as held in escrow
  }
  return c.json({ received: true });
});
```

---

## Adding Video (LiveKit)

To replace external Zoom or Google Meet links, Skyy Learn would embed WebRTC video directly into the app using LiveKit.

### Why LiveKit
- **Selective Forwarding Unit (SFU)**: Scales cleanly without peer-to-peer mesh bandwidth bottlenecks.
- **In-Room Data Tracks**: Real-time whiteboard and notes synchronization over the same WebRTC peer connection.
- **Egress & Transcription Pipeline**: Records session audio and pipes it directly into Groq Whisper speech-to-text. The resulting transcript is summarized into tutor notes, automatically seeding the drill generator when the call ends.

### Architecture

```
[Tutor Browser]                     [Learner Browser]
      │                                   │
      ▼                                   ▼
WebRTC Audio / Video                WebRTC Audio / Video
      │                                   │
      +──────────────► LiveKit SFU ◄──────+
                            │
                      Egress Service
                            │
                            ▼
                    Audio Stream (.mp4)
                            │
                            ▼
                  Groq Whisper Transcription
                            │
                            ▼
              LLM Concept Extraction & Summary
                            │
                            ▼
           Pre-Populated Session Notes in Skyy Learn
                            │
                            ▼
           Tutor Reviews & Generates Practice Drills
```

### Backend Token Generation Endpoint

```typescript
import { AccessToken } from 'livekit-server-sdk';

app.post('/api/video/token', async (c) => {
  const { sessionId, userId, userName, role } = await c.req.json();
  const apiKey = process.env.LIVEKIT_API_KEY!;
  const apiSecret = process.env.LIVEKIT_API_SECRET!;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userName,
    ttl: '2h',
  });

  token.addGrant({
    room: `session-${sessionId}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return c.json({
    token: await token.toJwt(),
    serverUrl: process.env.LIVEKIT_URL, // e.g. wss://skyy-learn.livekit.cloud
  });
});
```

### Frontend Integration

```tsx
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export function TutoringRoom({ token, serverUrl, onEndSession }: Props) {
  return (
    <div className="h-[80vh] rounded-md border border-line bg-surface overflow-hidden">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={onEndSession}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
```

---

## Local Development & Testing

### Prerequisites
- Node.js 22+
- npm 10+
- (Optional) Groq API key in `.env.local`

### Quickstart

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development environment:
   ```bash
   # Terminal 1: Frontend (Port 5173)
   npm run dev

   # Terminal 2: Backend + WebSockets (Port 3001)
   npm run server
   ```
3. Open `http://localhost:5173` in your browser.

### Verification & CI Suite

```bash
# 1. Typecheck TypeScript
npm run typecheck

# 2. Run Vitest test suite (63 tests)
npm test

# 3. Production build
npm run build
```

The automated test suite covers:
- `server/__tests__/approval.test.ts`: The Approval Rule access gating, HTTP 403 enforcement, tutor lifecycle, pre-approval edits, and database isolation.
- `server/__tests__/validation.test.ts`: All Zod schemas, boundary conditions (options min/max, string lengths, integer indexing), and validate-feedback-retry loops.
- `server/__tests__/verifier.test.ts`: Dual-model auditor correctness checks, confidence score validation, and fallback error handling.
- `server/__tests__/realtime.test.ts`: WebSocket handshake, ping/pong keepalives, `DRILLS_APPROVED` broadcast, and `QUESTION_FLAGGED` broadcast.

GitHub Actions CI runs on every push and pull request via `.github/workflows/ci.yml`.
