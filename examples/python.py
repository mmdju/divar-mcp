"""Minimal client for the hosted Divar MCP service (stdlib only).

No install: python examples/python.py

Talks Streamable HTTP the same way verify-live.mjs does: initialize,
list tools, call search_ads + ad_details, print compact cards.
Copy it into your own project and adapt freely (MIT).
"""
import json
import os
import sys
import urllib.request

ENDPOINT = os.environ.get("DIVAR_MCP_URL", "https://divar-mcp.mmdju2.workers.dev/mcp")


def rpc(method, params=None, rid=1):
    body = json.dumps({"jsonrpc": "2.0", "id": rid, "method": method, "params": params or {}}).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={
            "content-type": "application/json",
            "accept": "application/json, text/event-stream",
            "user-agent": "divar-mcp-client/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        text = res.read().decode("utf-8", "replace")
    payload = next(
        (line[5:].strip() for line in reversed(text.splitlines()) if line.startswith("data:")),
        text,
    )
    return json.loads(payload)


def card_text(card):
    price = f"{card.get('price_toman'):,} Toman" if card.get("price_toman") else "negotiable"
    title = card.get("title") or ""
    print(f"- {title} | {price} | {card.get('district') or 'no district'}")
    print(f"  {card.get('url')}")


def main():
    # Windows consoles default to cp1252 - Persian titles need UTF-8.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    init = rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                              "clientInfo": {"name": "py-client", "version": "1.0.0"}})
    print("server:", init["result"]["serverInfo"]["name"], init["result"]["serverInfo"]["version"])
    rpc("notifications/initialized", {}, rid=2)

    tools = rpc("tools/list", {}, rid=3)["result"]["tools"]
    print(f"tools: {len(tools)}")

    search = rpc("tools/call", {"name": "search_ads",
                                "arguments": {"query": "پراید", "city": "tehran", "limit": 3}}, rid=4)
    items = json.loads(search["result"]["content"][0]["text"])["items"]
    for card in items:
        card_text(card)

    first_token = items[0]["token"]
    details = rpc("tools/call", {"name": "ad_details",
                                 "arguments": {"token": first_token}}, rid=5)
    data = json.loads(details["result"]["content"][0]["text"])
    specs = data.get("specs") or []
    print(f"details token={data.get('token')} | specs: {len(specs)} | url ok: {bool(data.get('url'))}")
    assert "phone" not in json.dumps(data), "phone field leaked!"


if __name__ == "__main__":
    main()
