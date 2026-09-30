# Security Policy

Divar MCP is a read-only public service. There is nothing to log in to and no user data is stored.

- All 7 tools are read-only. No tool can change, delete or publish anything.
- No API keys are needed to use the hosted endpoint.
- Nothing is persisted server-side. The only state is a short-lived response cache (per-isolate, plus Cloudflare's edge cache) that other isolates cannot read.
- Phone numbers need the seller's own login - this server never logs in and never returns them.
- Data comes from Divar's public web API, which is undocumented and can change without notice. This project is not affiliated with or endorsed by Divar.

## Rate Limiting (Fair Use)

The public endpoint is guarded by a per-IP budget on `POST /mcp`, counted in two places:

1. **At the edge, on the hosted deployment** - Cloudflare's rate-limit binding (`[[ratelimits]]` in `wrangler.toml`) counts every POST per client IP, and its counter is shared across the isolates of an edge location - which is why a burst cannot get around it by landing on many isolates. It answers `429` with a `retry-after` header.
2. **In the server code, wherever it runs** - the same budget as an in-code sliding window (per isolate, held in memory). It is the whole guard for a deployment made from this source (a plain `wrangler deploy` carries no binding unless you add one) and for the Node `--http` transport, and it is what the Worker falls back to if the edge counter itself fails - a guard that breaks the service it guards is worse than no guard.


| Setting | Value |
|---|---|
| Match | `POST /mcp` |
| Key | client IP (`cf-connecting-ip`) |
| Threshold / period | **20 requests / 60 seconds** |
| Over the limit | `429` + `retry-after` (seconds) |
| Counting | All POSTs to `/mcp` count (success or error) |

Notes:

- `/health`, `/` and the preflight (`OPTIONS`) are **not** counted, so dashboards and browser clients are not punished.
- 20 a minute is ~3x what a normal agent session uses (requests to Divar are paced near one tool call a second), so ordinary use never notices it; bursts of parallel tool calls can.
- If you are rate-limited, back off until `retry-after` says you may return - hammering while refused only keeps the count up.
- The edge counter is per edge location rather than one global number, and that is enough: a client whose calls land on different isolates still lands in the same place. Measured on the live endpoint 2026-09-30: 30 POSTs over one connection - what a real MCP client does - passed 20 and then answered `429` for the rest.
- A deployment behind its own domain can add a third layer - a **Rate Limiting rule** (dashboard: Security → WAF → Rate limiting rules). The hosted `*.workers.dev` endpoint cannot carry one, because its zone belongs to Cloudflare.
- The in-code window holds its counters in memory rather than in KV: sharing them through KV would burn the free write quota in minutes, and for abuse-throttling a per-isolate window is enough once the edge counter above is doing the global work.

## CORS

The endpoint is **keyless and read-only**, so it sends `Access-Control-Allow-Origin: *` and answers `OPTIONS` preflights. There are no cookies or credentials to leak; browser-based MCP clients (Inspector, web agents) need this to connect at all.

## Reporting a Vulnerability

Please do NOT open a public issue. Report privately via the
[Security tab](../../security/advisories/new)
(Advisories → Report a vulnerability).
