# Security Policy

Divar MCP is a read-only public service. There is nothing to log in to and no user data is stored.

- All 7 tools are read-only. No tool can change, delete or publish anything.
- No API keys are needed to use the hosted endpoint.
- Nothing is persisted server-side. The only state is a short-lived response cache (per-isolate, plus Cloudflare's edge cache) that other isolates cannot read.
- Phone numbers need the seller's own login - this server never logs in and never returns them.
- Data comes from Divar's public web API, which is undocumented and can change without notice. This project is not affiliated with or endorsed by Divar.

## Rate Limiting (Fair Use)

The public endpoint is guarded in **two** places, with the same budget:

1. **In the server code** - a per-IP sliding window on `POST /mcp` (per isolate, in memory) that answers `429` with a `retry-after` header. This is the guard you get if you deploy this project yourself from source; it is not tucked away in a dashboard.
2. **At the Cloudflare edge** - a **Rate Limiting rule** (dashboard: Security → WAF → Rate limiting rules) enforced per client IP before the Worker runs, for the hosted deployment:


| Setting | Value |
|---|---|
| Match | `http.request.uri.path eq "/mcp"` |
| Characteristics | IP address |
| Threshold / period | **60 requests / 60 seconds** |
| Mitigation | Block, **10-minute** timeout |
| Counting | All POSTs to `/mcp` count (success or error) |

Notes:

- `/health`, `/` and the preflight (`OPTIONS`) are **not** counted, so dashboards and browser clients are not punished.
- The plan-level rule matches one path (`/mcp`), not a regex; per-IP is the only characteristic the free plan offers.
- If you are rate-limited, back off for 10 minutes - repeated hammering while blocked extends the block.
- The in-code window is per isolate: it bounds what one instance will forward to Divar, while the edge rule is the global one.
- A well-behaved agent doing one search every few seconds cannot hit this; bursts of parallel tool calls can.

## CORS

The endpoint is **keyless and read-only**, so it sends `Access-Control-Allow-Origin: *` and answers `OPTIONS` preflights. There are no cookies or credentials to leak; browser-based MCP clients (Inspector, web agents) need this to connect at all.

## Reporting a Vulnerability

Please do NOT open a public issue. Report privately via the
[Security tab](../../security/advisories/new)
(Advisories → Report a vulnerability).
