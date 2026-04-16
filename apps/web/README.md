# Smart Bursary Web

Next.js frontend for Smart Bursary student and admin portals.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Install Dependencies

From repo root:

```bash
pnpm install
```

## Start Web App (Development)

From repo root:

```bash
pnpm --filter @smart-bursary/web run dev
```

From app folder:

```bash
cd apps/web
pnpm dev
```

Web default URL: `http://localhost:3000`.

## Start Web App (Production Build)

From repo root:

```bash
pnpm --filter @smart-bursary/web run build
pnpm --filter @smart-bursary/web run start
```

## Useful Commands

```bash
pnpm --filter @smart-bursary/web run lint
pnpm --filter @smart-bursary/web run typecheck
pnpm --filter @smart-bursary/web run format
```