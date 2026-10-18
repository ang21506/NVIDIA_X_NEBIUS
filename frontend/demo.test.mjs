import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";
import ts from "typescript";
const source = await readFile(
  new URL("./src/api/demo.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { initialState, scoreDemo, demoRequest, readDemo, saveDemo } =
  await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, v),
};
globalThis.window = { dispatchEvent: () => {} };
test("incorrect mapped answer persists memory and prioritizes revision; distinct recheck resolves it", async () => {
  const state = initialState();
  const before = state.mastery[0].mastery_score;
  const result = scoreDemo(state, "dsa", [
    { quiz_item_id: "binary-a", selected_answer: "O(n)" },
  ]);
  assert.equal(result.correct_items, 0);
  assert.ok(state.mastery[0].mastery_score < before);
  assert.equal(state.memory[0].status, "NEEDS_RETEST");
  assert.equal(state.tasks[0].priority_score, 0.9);
  saveDemo(state);
  assert.equal(readDemo().memory[0].title, state.memory[0].title);
  const followup = await demoRequest("/v1/quizzes/generate", {
    method: "POST",
    body: JSON.stringify({ course_id: "dsa" }),
  });
  assert.equal(followup[0].id, "binary-b");
  assert.equal(followup[0].correct, undefined);
  const restored = readDemo();
  scoreDemo(restored, "dsa", [
    { quiz_item_id: "binary-b", selected_answer: "8" },
  ]);
  assert.equal(restored.memory[0].status, "RESOLVED");
  assert.equal(restored.tasks[0].status, "COMPLETED");
  assert.equal(restored.tasks[0].priority_score, 0);
  assert.ok(restored.tasks[0].completion_evidence.includes("follow-up"));
  assert.equal(restored.attempts.length, 2);
  scoreDemo(restored, "dsa", [
    { quiz_item_id: "binary-a", selected_answer: "O(n)" },
  ]);
  assert.equal(restored.tasks[0].status, "RECOMMENDED");
  assert.equal(restored.tasks[0].completed_at, undefined);
  assert.equal(restored.tasks[0].completion_evidence, undefined);
  assert.equal(
    restored.memory.filter((m) => m.status === "NEEDS_RETEST").length,
    1,
  );
});
test("unmapped wrong answers create revision without inventing a precise misconception", () => {
  const state = initialState();
  scoreDemo(state, "dsa", [{ quiz_item_id: "array-a", selected_answer: "1" }]);
  assert.equal(state.memory.length, 0);
  assert.equal(state.tasks[1].status, "RECOMMENDED");
  assert.ok(state.tasks[1].reason_codes.includes("RECENT_ERROR"));
});
test("invalid and duplicate answers are rejected before changing state", () => {
  const state = initialState();
  const original = JSON.stringify(state);
  assert.throws(() =>
    scoreDemo(state, "dsa", [
      { quiz_item_id: "binary-a", selected_answer: "O(n)" },
      { quiz_item_id: "binary-a", selected_answer: "O(n)" },
    ]),
  );
  assert.equal(JSON.stringify(state), original);
  assert.throws(() =>
    scoreDemo(state, "foreign-course", [
      { quiz_item_id: "binary-a", selected_answer: "O(n)" },
    ]),
  );
  assert.throws(() => scoreDemo(state, "dsa", []));
});
test("mastery remains bounded under repeated observations", () => {
  const state = initialState();
  for (let i = 0; i < 15; i++)
    scoreDemo(state, "dsa", [
      { quiz_item_id: "binary-a", selected_answer: "O(log n)" },
    ]);
  assert.equal(state.mastery[0].mastery_score, 1);
  for (let i = 0; i < 15; i++)
    scoreDemo(state, "dsa", [
      { quiz_item_id: "binary-a", selected_answer: "O(n)" },
    ]);
  assert.equal(state.mastery[0].mastery_score, 0);
});
test("local uploads remain unindexed and local clear removes conversations and metadata", async () => {
  saveDemo(initialState());
  const form = new FormData();
  form.set("course_id", "dsa");
  form.set(
    "file",
    new File(["sample text"], "notes.txt", { type: "text/plain" }),
  );
  const resource = await demoRequest("/v1/resources/upload", {
    method: "POST",
    body: form,
  });
  assert.equal(resource.status, "UPLOADED");
  assert.equal(resource.chunk_count, 0);
  await demoRequest("/v1/tutor/ask", {
    method: "POST",
    body: JSON.stringify({
      course_id: "dsa",
      question: "Explain binary search",
    }),
  });
  assert.equal(readDemo().conversations.length, 1);
  await demoRequest("/v1/settings/data", { method: "DELETE" });
  assert.equal(readDemo().conversations.length, 0);
  assert.equal(readDemo().resources.length, 0);
  assert.equal(readDemo().courses.length, 1);
});
