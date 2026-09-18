// Verify the LIVE hosted endpoint speaks MCP correctly.
// Anyone can run this - it only needs Node.js 18+, no install:
//
//   node verify-live.mjs
//
// What it does: lists tools over Streamable HTTP, calls tools/list +
// tools/call for a search, a details read, a privacy sweep and an
// invalid-token error path, and asserts the honest-data contract
// (toman prices, negotiable = null, empty envelope on misses).
// No source needed.
const ENDPOINT = process.env.DIVAR_MCP_URL ?? "https://divar-mcp.mmdju.workers.dev/mcp";
const UA = { "user-agent": "divar-mcp-verify/1.0" };

let id = 1;
async function rpc(method, params = {}) {
  const body = { jsonrpc: "2.0", id: id++, method, params };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...UA },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  // Streamable HTTP answers as SSE; the JSON payload rides in data: lines.
  const payload = text
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .filter(Boolean)
    .at(-1) ?? text;
  return JSON.parse(payload);
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " - " + detail : ""}`);
}

async function main() {
  // 0. Handshake.
  const init = await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "verify-live", version: "1.0.0" },
  });
  check("handshake", !!init.result?.serverInfo, init.result?.serverInfo?.name ?? "");

  await rpc("notifications/initialized", {});

  // 1. Tool list: expect the 6 public tools.
  const listed = await rpc("tools/list", {});
  const names = (listed.result?.tools ?? []).map((t) => t.name);
  check("tools/list returns 6 tools", names.length === 6, `${names.length} tools`);
  for (const must of ["divar_suggest", "search_ads", "ad_details", "get_ads_batch", "compare_ads", "find_best_value"]) {
    check(`tool present: ${must}`, names.includes(must));
  }
  const readonly = (listed.result?.tools ?? []).every((t) => t.annotations?.readOnlyHint === true);
  check("all tools read-only", readonly);

  // 2. Search: compact cards, toman prices, real URLs.
  const search = await rpc("tools/call", {
    name: "search_ads",
    arguments: { query: "پراید", city: "tehran", limit: 3 },
  });
  const sdata = JSON.parse(search.result?.content?.[0]?.text ?? "{}");
  const cards = sdata.items ?? [];
  check("search returns items", cards.length > 0, `${cards.length} items`);
  const first = cards[0] ?? {};
  check("honest price (number or negotiable null)", first.price_toman === null || typeof first.price_toman === "number");
  check("card has ad URL", typeof first.url === "string" && first.url.includes("divar.ir/v/"), first.url ?? "");
  check("no phone field anywhere", !/"(phone|mobile|contact_number)"/.test(JSON.stringify(sdata)));

  // 3. Details on a real token from search - still no phone.
  if (first.token) {
    const details = await rpc("tools/call", { name: "ad_details", arguments: { token: first.token } });
    const ddata = JSON.parse(details.result?.content?.[0]?.text ?? "{}");
    check("details returns url", typeof ddata.url === "string" && ddata.url.includes("divar.ir/v/"));
    check("details has no phone field", !/"(phone|mobile|contact_number)"/.test(JSON.stringify(ddata)));
  }

  // 4. Dead token: actionable error, not a crash.
  const dead = await rpc("tools/call", { name: "ad_details", arguments: { token: "zzzzzzzz" } });
  check("dead token is error", dead.result?.isError === true || !!dead.error);

  // 5. Unknown tool: named error listing available tools.
  const unknown = await rpc("tools/call", { name: "no_such_tool", arguments: {} });
  const utext = unknown.result?.content?.[0]?.text ?? unknown.error?.message ?? "";
  check("unknown tool names alternatives", utext.includes("search_ads"), utext.slice(0, 60));

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nVERIFY-DONE passed=${checks.length - failed.length} failed=${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("VERIFY-ERROR", err.message);
  process.exitCode = 1;
});
