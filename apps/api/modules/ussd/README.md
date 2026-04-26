# USSD module (Commit 8 scaffold)

Status: **scaffold landed**. The module wires Africa's Talking USSD callbacks
into a deterministic menu state machine. Production rollout requires the
external setup documented below.

## What lands in this commit

- `ussd.controller.ts` — single POST endpoint that accepts the AT webhook
  payload (form-urlencoded) and returns a `text/plain` response.
- `ussd.service.ts` — the menu state machine. Stateless: every callback
  decision is computed solely from the `text` chain (AT's `*`-separated
  history of keys pressed since session start) and the originating phone
  number. No Redis/DB state required for the menus themselves.
- `menu.ts` — pure rendering helpers; tested without HTTP plumbing.
- `dto/ussd-callback.dto.ts` — the request DTO.

The menu surfaces three read-only flows that don't require auth (a phone
number is the only handle the user has on USSD):

1. **Application status** — list the most recent applications for the phone.
2. **Allocation amount** — show what's been allocated for the current cycle.
3. **Disbursement status** — show the most recent disbursement transaction.

Write-side flows (apply / withdraw) are intentionally NOT in this slice
because they require an OTP step + identity verification handshake that
spans multiple sessions.

## External setup required to go live

| Step | Owner | Notes |
| --- | --- | --- |
| Africa's Talking sandbox account | DevOps | Free tier covers integration testing. |
| Live AT shortcode (e.g., `*483*100#`) | County govt + AT | Production shortcodes are paid + registered with the regulator. |
| `AT_USERNAME` env var | DevOps | The AT account username — also called `username` in their docs. |
| `AT_API_KEY` env var | DevOps | Generated under "Settings → API Key" in the AT dashboard. |
| Webhook URL configured in AT | DevOps | Point the shortcode's "Callback URL" at `https://api.smart-bursary.example/api/v1/ussd/callback`. AT only accepts HTTPS in production. |
| `USSD_CALLBACK_SHARED_SECRET` env var | DevOps | Optional — when set, the controller verifies an HMAC of the request body against this secret. AT does not natively sign callbacks; this is a defence-in-depth check using a shared static token in a header. Plan to revisit when AT publishes a signing standard. |

## How to test locally without a phone

Send a form-urlencoded POST to the callback endpoint:

```bash
curl -X POST http://localhost:3001/api/v1/ussd/callback \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'sessionId=ATUid_test_1' \
  -d 'phoneNumber=%2B254700020001' \
  -d 'serviceCode=*483*100%23' \
  -d 'networkCode=63902' \
  -d 'text='
```

Subsequent calls within the same session pass the cumulative `text`:

```bash
# Pressed "1" from the main menu
curl -X POST http://localhost:3001/api/v1/ussd/callback ... -d 'text=1'

# Pressed "1" then "1" (drill down)
curl -X POST http://localhost:3001/api/v1/ussd/callback ... -d 'text=1*1'
```

The response is plain text starting with `CON ` (continue) or `END `
(terminate the session).

## Follow-up work (not in this commit)

1. Wire the OTP-gated write flows: apply, withdraw, update phone.
2. Persist USSD session activity into a new `ussd_session_events` table for
   audit + analytics.
3. Add idempotent retry handling — AT may re-deliver the same callback if
   their delivery infra times out reading our response. The controller
   should be safe today (purely read-only) but write flows MUST cache the
   response keyed by `sessionId` for at least 30 seconds.
4. Localise menu strings (English / Swahili).
5. Add Prometheus metrics for menu transitions + dwell times.
