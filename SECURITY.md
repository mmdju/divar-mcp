# Security Policy

Divar MCP is a read-only public service. There is nothing to log in to and no user data is stored.

- All 6 tools are read-only. No tool can change, delete or publish anything.
- No API keys are needed to use the hosted endpoint.
- Nothing is persisted server-side. The only state is a per-isolate response cache that other isolates cannot read.
- Phone numbers need the seller's own login - this server never logs in and never returns them.
- Data comes from Divar's public web API, which is undocumented and can change without notice. This project is not affiliated with or endorsed by Divar.

## Reporting a Vulnerability

Please do NOT open a public issue. Report privately via the
[Security tab](../../security/advisories/new)
(Advisories → Report a vulnerability).
