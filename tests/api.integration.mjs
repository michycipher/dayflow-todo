import assert from "node:assert/strict";

const base = process.env.DAYFLOW_TEST_URL || "http://127.0.0.1:3000";
const cookies = { a: "", b: "" };

async function call(method, body, identity = "a", extra = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (cookies[identity]) headers.Cookie = cookies[identity];
  const response = await fetch(base + "/api/tasks", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  const setCookie = response.headers.getSetCookie?.()[0];
  if (setCookie) cookies[identity] = setCookie.split(";", 1)[0];
  const text = await response.text();
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(method + " " + response.status + " " + text);
  return { status: response.status, data: JSON.parse(text) };
}

const ownTasks = await call("GET");
assert.equal(ownTasks.status, 200, JSON.stringify(ownTasks));
assert.ok(cookies.a, "the first visit should receive a private session cookie");
const otherTasks = await call("GET", undefined, "b");
assert.equal(otherTasks.status, 200, JSON.stringify(otherTasks));
assert.ok(cookies.b, "a second browser should receive its own cookie");

const invalid = await call("POST", { tasks: [{ title: "  " }] });
assert.equal(invalid.status, 400);
const created = await call("POST", {
  tasks: [
    {
      title: "API verification",
      project: "Testing",
      due: "2026-09-30",
      subtasks: [
        { id: crypto.randomUUID(), title: "Check persistence", done: false },
      ],
    },
  ],
});
assert.equal(created.status, 201, JSON.stringify(created));
let task = created.data.tasks[0];

try {
  const list = await call("GET");
  assert.ok(list.data.tasks.some((item) => item.id === task.id));
  const foreign = await call("GET", undefined, "b");
  assert.ok(!foreign.data.tasks.some((item) => item.id === task.id));
  const denied = await call(
    "PUT",
    {
      id: task.id,
      version: task.version,
      task: { ...task, title: "Unauthorized edit" },
    },
    "b",
  );
  assert.equal(denied.status, 409);
  const changed = await call("PUT", {
    id: task.id,
    version: task.version,
    task: { ...task, status: "done" },
  });
  assert.equal(changed.status, 200);
  task = changed.data.task;
  assert.equal(task.version, 2);
  assert.equal(task.status, "done");
  const stale = await call("PUT", {
    id: task.id,
    version: 1,
    task: created.data.tasks[0],
  });
  assert.equal(stale.status, 409);

  const crossOrigin = await call(
    "POST",
    { tasks: [{ title: "Rejected" }] },
    "a",
    { origin: "https://untrusted.example" },
  );
  assert.equal(crossOrigin.status, 403);
  const followup = await call("GET");
  assert.equal(followup.status, 200);
  assert.ok(followup.data.tasks.some((item) => item.id === task.id));

  const deleted = await call("DELETE", { id: task.id, version: task.version });
  assert.equal(deleted.status, 200);
  task = null;
  const after = await call("GET");
  assert.ok(!after.data.tasks.some((item) => item.id === created.data.tasks[0].id));
  console.log(
    "PASS: signed browser sessions, persisted CRUD, user isolation, validation, conflict detection, cross-origin protection and deletion.",
  );
} finally {
  if (task)
    await call("DELETE", { id: task.id, version: task.version }).catch(() => {});
}
