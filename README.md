# Vigil

Uptime monitoring that runs on your Cloudflare account. One repo, one deploy, globally distributed checks in minutes.

<!-- TODO: Deploy to Cloudflare button -->

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_USERNAME/vigil)

<!-- TODO: Screenshot of dashboard -->

![Vigil Dashboard](docs/screenshot.png)

## Why Vigil

Most uptime monitoring falls into two camps: expensive SaaS platforms ($29-79/month) or complex self-hosted solutions that need their own infrastructure babysitting.

Vigil sits in the middle. It's a single-repo deployment that runs entirely on Cloudflare's edge infrastructure—Workers, Durable Objects, and D1. You get globally distributed health checks, incident tracking, and webhook notifications for free or a few dollars a month with Cloudflare's generous pricing.

**Built for actual scale, not imagined scale.** Vigil is designed for 10-100 endpoints. If you're monitoring a personal project portfolio, a small team's services, or a handful of client sites, this is the right tool. If you need enterprise-grade multi-tenancy and PagerDuty integrations, this isn't it—and that's intentional.

**No vendor lock-in anxiety.** Yes, Vigil is Cloudflare-native. That's a feature. By leaning into the platform instead of abstracting it away, you get operational simplicity, predictable costs, and zero infrastructure to manage. If you're already using Cloudflare, you're not adding complexity—you're consolidating it.

## Features

- **HTTP endpoint monitoring** with configurable methods, headers, expected status codes, and timeouts
- **Smart status detection** — UP, DEGRADED, DOWN, RECOVERING states with consecutive failure thresholds
- **Automatic incident tracking** — incidents open when services go down and close on recovery
- **Webhook notifications** with retry logic and exponential backoff
- **Real-time dashboard** with response time charts and check history
- **Data retention controls** — automatic cleanup of old check results
- **Test before you commit** — validate endpoints and notification channels before enabling

## Quick Start

### Deploy with the Button

1. Click the **Deploy to Cloudflare** button above
2. Authenticate with your Cloudflare account
3. The deployment will create:
   - A Worker (`vigil`)
   - A D1 database (`vigil-db`)
   - The required Durable Object migrations
4. Once deployed, your instance will be available at `vigil.<your-subdomain>.workers.dev`

### After Deployment

Your Vigil instance has no built-in authentication. Before adding any monitors, you'll want to secure it with Cloudflare Access. See [Securing Your Instance](#securing-your-instance) below.

## Securing Your Instance

Vigil deliberately has no in-app authentication. Instead, it's designed to sit behind [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/), which handles auth at the network layer before requests ever reach your application.

This isn't a shortcut—it's a deliberate architecture choice. Cloudflare Access gives you SSO, MFA, and device posture checks without adding auth complexity to the application itself.

### Setting Up Cloudflare Access

1. **Navigate to Zero Trust**
   In the Cloudflare dashboard, go to **Zero Trust** → **Access** → **Applications**

2. **Add an Application**
   - Click **Add an application** → **Self-hosted**
   - Name it something like "Vigil"
   - Set the **Application domain** to your Worker's URL (e.g., `vigil.your-subdomain.workers.dev`)
   - For the path, use `/*` to protect the entire application

3. **Configure a Policy**
   - Create a policy name (e.g., "Allow me")
   - Under **Include**, add a rule:
     - For personal use: **Emails** → your email address
     - For team use: **Emails ending in** → `@yourcompany.com`
   - Save the policy

4. **Authentication Method**
   If you haven't already, configure an identity provider under **Settings** → **Authentication**. For personal use, **One-time PIN** (email-based) works well and requires no external IdP setup.

5. **Save and Test**
   Save your application, then visit your Vigil URL—you should be prompted to authenticate before seeing the dashboard.

Once Access is configured, only authenticated users can reach your Vigil instance. The application itself doesn't need to know or care about who's logged in.

## Architecture

Vigil runs entirely on Cloudflare's edge infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                          │
│                                                                 │
│  ┌───────────┐      ┌───────────────┐      ┌───────────┐        │
│  │  Worker   │ ───▶ │    Durable    │ ───▶ │    D1     │        │
│  │ (Hono API)│      │    Objects    │      │ (SQLite)  │        │
│  └───────────┘      └───────────────┘      └───────────┘        │
│        │                   │                                    │
│        │            ┌──────┴──────┐                             │
│        │            │   Alarms    │                             │
│        │            │ (scheduled  │                             │
│        │            │   checks)   │                             │
│        │            └─────────────┘                             │
│        ▼                                                        │
│  ┌───────────┐                                                  │
│  │  Static   │                                                  │
│  │  Assets   │                                                  │
│  │(React SPA)│                                                  │
│  └───────────┘                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**How it works:**

- **Each monitor gets its own Durable Object.** This provides natural isolation—one misbehaving endpoint can't affect others. The DO manages its own check schedule using Alarms.

- **Checks run on a configurable interval** (default: 60 seconds). The Durable Object wakes up, performs the HTTP check, records the result, and goes back to sleep.

- **State transitions are deterministic.** A monitor doesn't flip to DOWN on a single failure—it requires consecutive failures (default: 3) to avoid false positives from transient network issues.

- **All data lives in D1.** Check results, incidents, notification logs—everything persists in a SQLite database at the edge.

- **A daily cron job cleans up old data.** Check results older than the retention period (default: 15 days) are automatically pruned.

- **No internal API keys.** All communication between Workers, Durable Objects, and D1 uses Cloudflare bindings. The only outbound HTTP calls are the health checks themselves.

## Configuration

Configuration is handled through environment variables in `wrangler.jsonc`:

| Variable                       | Default | Description                                          |
| ------------------------------ | ------- | ---------------------------------------------------- |
| `CHECK_RESULTS_RETENTION_DAYS` | `15`    | How long to keep check result history before cleanup |

Per-monitor settings are configured in the UI:

| Setting               | Default | Description                                |
| --------------------- | ------- | ------------------------------------------ |
| Check interval        | 60s     | How often to check the endpoint            |
| Request timeout       | 5s      | How long to wait for a response            |
| Expected status codes | 200     | Comma-separated list (e.g., `200,201,204`) |
| Consecutive failures  | 3       | Failures required before marking DOWN      |

## Local Development

### Prerequisites

- Node.js 20+
- pnpm (`corepack enable` if you have Node 20+)
- A Cloudflare account (for Wrangler authentication)

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/vigil.git
cd vigil

# Install dependencies
pnpm install

# Create a local D1 database and run migrations
pnpm migrate:local

# Start the development server
pnpm dev
```

The dev server runs at `http://localhost:5173` with hot reload for the frontend. The Worker runs locally via Wrangler's development mode.

### Running Tests

```bash
# Unit tests (watch mode)
pnpm test

# Unit tests (single run)
pnpm test:run

# Integration tests
pnpm test:integration
```

### Code Quality

```bash
# Lint and format
pnpm check
```

## Manual Deployment

If you prefer deploying manually over the button:

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/vigil.git
cd vigil
pnpm install

# 2. Create a D1 database
wrangler d1 create vigil-db

# 3. Update wrangler.jsonc with your database_id
#    (the create command outputs this)

# 4. Build and deploy
pnpm deploy
```

The `pnpm deploy` command runs database migrations and deploys the Worker in one step.

### Updating an Existing Deployment

```bash
git pull
pnpm deploy
```

Migrations are applied automatically before each deploy.

## License

MIT

---

Built for personal use. Shared for public benefit.
