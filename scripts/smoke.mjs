import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
const base = process.env.BASE_URL || "http://127.0.0.1:8787";
let cookie = "";
function request(path, body) {
  const url = new URL(base + path);
  const send = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const raw = body === undefined ? undefined : JSON.stringify(body);
    const req = send(
      url,
      {
        method: raw === undefined ? "GET" : "POST",
        agent: false,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(raw === undefined
            ? {}
            : {
                Origin: base,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(raw),
              }),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", reject);
      },
    );
    req.setTimeout(60000, () =>
      req.destroy(new Error("Smoke request timed out: " + path)),
    );
    req.on("error", reject);
    req.end(raw);
  });
}
async function call(path, body, expected = 200) {
  const response = await request(path, body);
  const payload = JSON.parse(response.text);
  assert.equal(response.status, expected, JSON.stringify(payload));
  if (response.headers["set-cookie"])
    cookie = response.headers["set-cookie"][0].split(";")[0];
  console.log("PASS", path, response.status);
  return payload;
}
await call("/api/health");
await call("/api/workspace", undefined, 401);
await call("/api/demo", {});
const workspace = await call("/api/workspace");
assert.equal(workspace.data.accounts.length, 12);
assert.equal(workspace.synthetic, true);
const answer = await call("/api/actions", {
  action: "ask",
  question: "Why did forecast decline?",
});
assert.equal(answer.intent, "forecast_change");
assert.ok(answer.evidence.length);
const search = await call("/api/search?q=Meridian");
assert.ok(search.total > 0);
await call("/api/persona", { user_id: "analyst" });
await call("/api/actions", { action: "run_agents" }, 403);
await call("/api/persona", { user_id: "maya" });
const scoped = await call("/api/workspace");
assert.ok(scoped.data.accounts.every((a) => a.owner_id === "maya"));
await call(
  "/api/actions",
  {
    action: "log_activity",
    account_id: "a2",
    kind: "call",
    subject: "Forbidden",
    body: "Cross-owner probe",
  },
  404,
);
for (const route of [
  "",
  "/workspace",
  "/workspace/accounts",
  "/workspace/accounts/a1",
  "/workspace/pipeline",
  "/workspace/copilot",
  "/workspace/agents",
  "/workspace/signals",
  "/workspace/quality",
  "/workspace/governance",
  "/workspace/economics",
]) {
  const r = await request(route);
  assert.equal(r.status, 200, route);
  assert.match(r.text, /Datrixon/);
}
await call("/api/logout", {});
await call("/api/workspace", undefined, 401);
console.log(
  "HTTP smoke passed: auth, seed, scope, copilot, search, role denial, logout and 11 UI routes.",
);
