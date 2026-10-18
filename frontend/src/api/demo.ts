import type {
  CourseDetail,
  MasteryItem,
  Misconception,
  StudyTask,
  QuizItem,
  QuizResultResponse,
  ResourceItem,
  User,
  AudioConversation,
} from "./client";
export const DEMO_TOKEN = "learnloop-browser-demo";
const KEY = "learnloop-demo-v1";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const date = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export interface DemoState {
  user: User;
  courses: CourseDetail[];
  mastery: MasteryItem[];
  memory: Misconception[];
  tasks: StudyTask[];
  attempts: (QuizResultResponse & { created_at: string })[];
  resources: ResourceItem[];
  conversations: AudioConversation[];
}
export function initialState(): DemoState {
  const stamp = now();
  const titles = ["Binary Search", "Arrays & Complexity", "Tree Traversals"];
  const topics = titles.map((title, i) => ({
    id: `topic-${i}`,
    course_id: "dsa",
    title,
    description: [
      "Halve a sorted search space at every step.",
      "Compare growth rates and reason about array operations.",
      "Visit a tree using depth-first and breadth-first approaches.",
    ][i],
    order_index: i,
    created_at: stamp,
    mastery_score: 0.2,
    prerequisites: i ? ["topic-0"] : [],
  }));
  return {
    user: {
      id: "local-student",
      full_name: "Alex",
      email: "local-demo@example.invalid",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_active: true,
      is_demo: true,
      created_at: stamp,
    },
    courses: [
      {
        id: "dsa",
        user_id: "local-student",
        title: "Data Structures & Algorithms",
        code: "CS-201",
        description:
          "A local sample course. Explore search, complexity and trees through short practice sessions.",
        learning_objectives:
          "Understand the reasoning behind efficient algorithms.",
        available_hours_per_week: 5,
        created_at: stamp,
        updated_at: stamp,
        topic_count: 3,
        resource_count: 0,
        overall_mastery: 0.2,
        topics,
      },
    ],
    mastery: topics.map((t) => ({
      id: `mastery-${t.id}`,
      topic_id: t.id,
      topic_title: t.title,
      course_id: "dsa",
      mastery_score: 0.2,
      confidence_score: 0,
      evidence_count: 0,
      correct_count: 0,
      total_count: 0,
      updated_at: stamp,
    })),
    memory: [],
    tasks: topics.map((t, i) => ({
      id: `task-${t.id}`,
      user_id: "local-student",
      course_id: "dsa",
      topic_id: t.id,
      topic_title: t.title,
      title: `Practice: ${t.title}`,
      description:
        "Suggested starting point for this sample course. No assessment evidence yet.",
      due_date: date(),
      estimated_minutes: 15,
      priority_score: 0.5 - i * 0.1,
      reason_codes: ["INITIAL_PRACTICE"],
      status: "RECOMMENDED",
      created_at: stamp,
      updated_at: stamp,
    })),
    attempts: [],
    resources: [],
    conversations: [],
  };
}
export function readDemo(): DemoState {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "null");
    if (stored?.courses && stored?.attempts) return stored;
  } catch {
    /* Reset an invalid local snapshot. */
  }
  return initialState();
}
export function saveDemo(state: DemoState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("learnloop-data"));
}
export function resetDemo() {
  saveDemo(initialState());
}
const questions = [
  {
    id: "binary-a",
    topic_id: "topic-0",
    question:
      "In a sorted array, what is the worst-case time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    difficulty: "medium",
    correct: "O(log n)",
    explanation:
      "Each comparison removes half the remaining elements. After k steps, at most n / 2^k remain, so k grows as log₂ n.",
  },
  {
    id: "array-a",
    topic_id: "topic-1",
    question:
      "How many comparisons can a linear search need in an array of n elements?",
    options: ["n", "log₂ n", "1", "n²"],
    difficulty: "easy",
    correct: "n",
    explanation:
      "When the target is absent or last, linear search checks every element once.",
  },
  {
    id: "tree-a",
    topic_id: "topic-2",
    question: "Which structure does breadth-first tree traversal normally use?",
    options: ["Queue", "Stack", "Sorted array", "Hash function"],
    difficulty: "medium",
    correct: "Queue",
    explanation:
      "A first-in, first-out queue visits each level before the next level.",
  },
  {
    id: "binary-b",
    topic_id: "topic-0",
    question:
      "Binary search starts with 64 candidates. After 3 halving steps, how many candidates remain?",
    options: ["32", "8", "61", "3"],
    difficulty: "medium",
    correct: "8",
    explanation:
      "64 → 32 → 16 → 8. This halving is the reason binary search takes logarithmic time.",
  },
];
export function scoreDemo(
  state: DemoState,
  courseId: string,
  submitted: { quiz_item_id: string; selected_answer: string }[],
): QuizResultResponse {
  if (courseId !== "dsa" || !submitted.length)
    throw new Error("Choose at least one answer from the sample course.");
  const seen = new Set<string>();
  for (const a of submitted) {
    const q = questions.find((q) => q.id === a.quiz_item_id);
    if (!q || !q.options.includes(a.selected_answer) || seen.has(q.id))
      throw new Error("Invalid or duplicate quiz response.");
    seen.add(q.id);
  }
  const answers = submitted.map((a) => {
    const q = questions.find((q) => q.id === a.quiz_item_id)!;
    const correct = q.correct === a.selected_answer;
    const mastery = state.mastery.find((m) => m.topic_id === q.topic_id)!;
    mastery.mastery_score = Math.max(
      0,
      Math.min(
        1,
        +(mastery.mastery_score + (correct ? 0.15 : -0.2)).toFixed(2),
      ),
    );
    mastery.evidence_count++;
    mastery.total_count++;
    mastery.correct_count += Number(correct);
    mastery.last_assessed_at = now();
    mastery.updated_at = now();
    let memory = state.memory.find(
      (m) => m.topic_id === q.topic_id && m.status !== "RESOLVED",
    );
    // Only the mapped linear-time answer supports this specific misconception.
    const misconception = q.id === "binary-a" && a.selected_answer === "O(n)";
    if (misconception) {
      if (!memory) {
        memory = {
          id: id(),
          user_id: state.user.id,
          course_id: courseId,
          topic_id: q.topic_id,
          topic_title: "Binary Search",
          title: "Confusing binary search with linear search",
          description:
            "The selected O(n) answer suggests confusion about how halving reduces the search space.",
          evidence_question: q.question,
          evidence_answer: a.selected_answer,
          expected_concept: q.correct,
          confidence: 0,
          remediation_provided: q.explanation,
          status: "NEEDS_RETEST",
          attempt_count: 0,
          last_assessed_outcome: "INCORRECT",
          created_at: now(),
          updated_at: now(),
        };
        state.memory.push(memory);
      }
      memory.attempt_count++;
      memory.updated_at = now();
      memory.evidence_answer = a.selected_answer;
    } else if (correct && q.id === "binary-b" && memory) {
      memory.status = "RESOLVED";
      memory.resolved_at = now();
      memory.last_assessed_outcome = "CORRECT";
      memory.updated_at = now();
    }
    const task = state.tasks.find((t) => t.topic_id === q.topic_id);
    if (task && !correct) {
      task.status = "RECOMMENDED";
      task.completed_at = undefined;
      task.completion_evidence = undefined;
      task.due_date = date();
      task.title = `Revise: ${mastery.topic_title}`;
      task.description = `Recommended because you missed a question about ${mastery.topic_title}. Review the explanation, then try a different question.`;
      task.priority_score = 0.9;
      task.reason_codes = ["RECENT_ERROR", "LOW_MASTERY"];
      task.updated_at = now();
    } else if (
      task &&
      correct &&
      q.id === "binary-b" &&
      memory?.status === "RESOLVED"
    ) {
      task.status = "COMPLETED";
      task.priority_score = 0;
      task.completed_at = now();
      task.updated_at = now();
      task.completion_evidence =
        "Answered the distinct binary-search follow-up correctly in local practice.";
      task.description =
        "Targeted revision completed with a correct follow-up answer. Continue practicing to build more evidence.";
      task.reason_codes = ["RETEST_PASSED"];
    }
    return {
      quiz_item_id: q.id,
      question: q.question,
      selected_answer: a.selected_answer,
      correct_answer: q.correct,
      is_correct: correct,
      explanation: q.explanation,
      detected_misconception: misconception ? memory?.title : undefined,
    };
  });
  const result = {
    attempt_id: id(),
    course_id: courseId,
    total_items: answers.length,
    correct_items: answers.filter((a) => a.is_correct).length,
    score_percentage: Math.round(
      (answers.filter((a) => a.is_correct).length / answers.length) * 100,
    ),
    answers,
    detected_misconceptions: state.memory
      .filter((m) => m.status !== "RESOLVED")
      .map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        remediation: m.remediation_provided,
      })),
    updated_mastery: Object.fromEntries(
      state.mastery.map((m) => [m.topic_id, m.mastery_score]),
    ),
    planner_updated: true,
  };
  state.attempts.push({ ...result, created_at: now() });
  return result;
}
export async function demoRequest(
  endpoint: string,
  options: RequestInit = {},
): Promise<unknown> {
  const state = readDemo();
  const url = new URL(endpoint, "http://local.demo");
  const path = url.pathname;
  const method = options.method || "GET";
  const body = typeof options.body === "string" ? JSON.parse(options.body) : {};
  const courseId =
    url.searchParams.get("course_id") || body.course_id || state.courses[0]?.id;
  const commit = (value: unknown) => {
    saveDemo(state);
    return value;
  };
  const masteries = state.mastery.filter(
    (m) => !courseId || m.course_id === courseId,
  );
  const summary = () => ({
    total_topics: masteries.length,
    mastered_topics: masteries.filter((m) => m.mastery_score >= 0.75).length,
    in_progress_topics: masteries.filter(
      (m) => m.mastery_score >= 0.5 && m.mastery_score < 0.75,
    ).length,
    needs_attention_topics: masteries.filter((m) => m.mastery_score < 0.5)
      .length,
    average_mastery:
      masteries.reduce((n, m) => n + m.mastery_score, 0) /
      (masteries.length || 1),
    open_misconceptions_count: state.memory.filter(
      (m) => m.course_id === courseId && m.status !== "RESOLVED",
    ).length,
    resolved_misconceptions_count: state.memory.filter(
      (m) => m.course_id === courseId && m.status === "RESOLVED",
    ).length,
    misconceptions: state.memory.filter((m) => m.course_id === courseId),
    topic_masteries: masteries,
  });
  const course = (key: string) => {
    const c = state.courses.find((c) => c.id === key);
    if (!c) throw new Error("Course not found.");
    const ms = state.mastery.filter((m) => m.course_id === key);
    return {
      ...c,
      overall_mastery:
        ms.reduce((n, m) => n + m.mastery_score, 0) / (ms.length || 1),
      topics: c.topics.map((t) => ({
        ...t,
        mastery_score: ms.find((m) => m.topic_id === t.id)?.mastery_score || 0,
      })),
    };
  };
  if (path === "/v1/auth/me") return state.user;
  if (path === "/v1/auth/profile") {
    state.user = { ...state.user, ...body };
    return commit(state.user);
  }
  if (path === "/health")
    return {
      status: "local-demo",
      database_connected: false,
      nebius_configured: false,
      model: "Local sample engine",
    };
  if (path === "/v1/courses" && method === "GET")
    return state.courses.map((c) => course(c.id));
  if (path === "/v1/courses" && method === "POST") {
    const c = {
      ...body,
      id: id(),
      user_id: state.user.id,
      topics: [],
      topic_count: 0,
      resource_count: 0,
      overall_mastery: 0,
      created_at: now(),
      updated_at: now(),
    };
    state.courses.push(c);
    return commit(c);
  }
  if (/^\/v1\/courses\/[^/]+$/.test(path)) {
    const key = path.split("/").pop()!;
    if (method === "DELETE") {
      state.courses = state.courses.filter((c) => c.id !== key);
      state.tasks = state.tasks.filter((t) => t.course_id !== key);
      state.mastery = state.mastery.filter((m) => m.course_id !== key);
      state.memory = state.memory.filter((m) => m.course_id !== key);
      state.resources = state.resources.filter((r) => r.course_id !== key);
      state.attempts = state.attempts.filter((a) => a.course_id !== key);
      state.conversations = state.conversations.filter(
        (c) => c.course_id !== key,
      );
      return commit({});
    }
    if (method === "PATCH") {
      const existing = state.courses.find((c) => c.id === key);
      if (!existing) throw new Error("Course not found.");
      Object.assign(existing, body, { updated_at: now() });
      return commit(course(key));
    }
    return course(key);
  }
  if (path.endsWith("/topics")) return course(path.split("/")[3]).topics;
  if (path === "/v1/memory") return summary();
  if (path === "/v1/memory/mastery") return masteries;
  if (path === "/v1/memory/misconceptions") return summary().misconceptions;
  if (path === "/v1/quizzes/generate") {
    if (body.course_id !== "dsa")
      throw new Error(
        "Local practice is available in the sample Data Structures course. Connect the backend for other courses.",
      );
    const retest = state.memory.some((m) => m.status !== "RESOLVED");
    return (retest ? [questions[3]] : questions.slice(0, 3)).map(
      ({ correct: _correct, explanation: _explanation, ...q }) => q as QuizItem,
    );
  }
  if (path === "/v1/quizzes/submit") {
    const result = scoreDemo(state, body.course_id, body.answers);
    return commit(result);
  }
  if (path.includes("/quizzes/") && path.endsWith("/results"))
    return state.attempts.find((a) => path.includes(a.attempt_id));
  if (path.startsWith("/v1/study-plans")) {
    const tasks = state.tasks
      .filter((t) => t.course_id === courseId)
      .sort((a, b) => b.priority_score - a.priority_score);
    return {
      course_id: courseId,
      course_title: state.courses.find((c) => c.id === courseId)?.title || "",
      tasks,
      formula_explanation:
        "Local demonstration: incorrect answers prioritize revision. Mastery changes by +0.15 for a correct answer or −0.20 for an incorrect answer, bounded from 0 to 1.",
      recommended_count: tasks.filter((t) => t.status !== "COMPLETED").length,
      completed_count: tasks.filter((t) => t.status === "COMPLETED").length,
    };
  }
  if (path.startsWith("/v1/study-tasks/")) {
    const task = state.tasks.find((t) => path.endsWith(t.id));
    if (!task) throw new Error("Task not found.");
    Object.assign(task, body, {
      updated_at: now(),
      ...(body.status === "COMPLETED"
        ? {
            completed_at: now(),
            completion_evidence:
              "Self-reported completion; not verified assessment evidence.",
          }
        : {}),
    });
    return commit(task);
  }
  if (path.endsWith("/resources"))
    return state.resources.filter((r) => r.course_id === path.split("/")[3]);
  if (path === "/v1/resources/upload") {
    const form = options.body as FormData;
    const file = form.get("file") as File;
    const resource: ResourceItem = {
      id: id(),
      user_id: state.user.id,
      course_id: String(form.get("course_id")),
      filename: file.name,
      file_size: file.size,
      mime_type: file.type,
      page_count: 0,
      status: "UPLOADED",
      created_at: now(),
      updated_at: now(),
      chunk_count: 0,
    };
    state.resources.push(resource);
    return commit(resource);
  }
  if (path.startsWith("/v1/resources/") && method === "DELETE") {
    state.resources = state.resources.filter((r) => !path.endsWith(r.id));
    return commit({});
  }
  if (path === "/v1/tutor/models")
    return {
      is_configured: false,
      active_model: "Local example — no AI inference",
      available_models: [],
    };
  if (path.endsWith("/voice/conversations"))
    return state.conversations.filter((c) => c.course_id === courseId);
  if (path.includes("/voice/conversations/"))
    return state.conversations.find((c) => path.endsWith(c.id));
  if (path.endsWith("/voice/ask") || path === "/v1/tutor/ask") {
    const form = options.body instanceof FormData ? options.body : null;
    const question = String(form?.get("transcript") || body.question || "");
    const cid = String(form?.get("course_id") || courseId);
    const convId = String(
      form?.get("conversation_id") || body.conversation_id || "",
    );
    let conv = state.conversations.find((c) => c.id === convId);
    if (!conv) {
      conv = {
        id: id(),
        course_id: cid,
        title: question.slice(0, 48),
        created_at: now(),
        updated_at: now(),
        message_count: 0,
        messages: [],
      };
      state.conversations.push(conv);
    }
    const answer = /binary|search|halv|complexity/i.test(question)
      ? "Local example · JARVIS\n\nBinary search works on sorted data. Compare the target with the middle value, then keep only the half that can contain it.\n\nFor 64 values: 64 → 32 → 16 → 8 → 4 → 2 → 1. This gives O(log n) comparisons. Linear search may inspect every element, giving O(n).\n\nTry the follow-up practice question to check your understanding."
      : "Local example · JARVIS\n\nThis browser demo includes a worked explanation of binary search. Ask about binary search or complexity to explore it. Other questions require the connected tutor API; no live model is running in this mode.";
    const messageId = id();
    conv.messages.push(
      {
        id: id(),
        conversation_id: conv.id,
        role: "user",
        transcript: question,
        citations: [],
        duration_seconds: 0,
        created_at: now(),
      },
      {
        id: messageId,
        conversation_id: conv.id,
        role: "assistant",
        transcript: answer,
        citations: [],
        duration_seconds: 0,
        created_at: now(),
      },
    );
    conv.message_count = conv.messages.length;
    conv.updated_at = now();
    return commit({
      answer,
      speech_text: answer,
      citations: [],
      key_takeaways: [],
      examples: [],
      follow_up_questions: ["Why does binary search need sorted data?"],
      has_sufficient_evidence: false,
      uncertainty_notes:
        "Authored sample explanation, not retrieved from your documents.",
      model_used: "Local example — no inference",
      conversation_id: conv.id,
      message_id: messageId,
    });
  }
  if (path === "/v1/agent-runs" && method === "GET") return [];
  if (path === "/v1/agent/grants" && method === "GET") return [];
  if (path === "/v1/settings/privacy")
    return {
      model_provider: "Local browser demonstration",
      model_id: "No model running",
      disclosure:
        "Sample learning records stay in this browser. Tutor responses are authored examples. Uploads store file metadata only; documents are not indexed or sent to a provider.",
      storage_type: "Browser localStorage",
      retention_policy: "Stored until you clear local demo data.",
    };
  if (path === "/v1/settings/export") return state;
  if (path === "/v1/settings/reset-demo") {
    resetDemo();
    return { message: "Local sample course reset. No server data changed." };
  }
  if (path === "/v1/settings/data") {
    state.memory = [];
    state.attempts = [];
    state.conversations = [];
    state.resources = [];
    state.tasks = [];
    state.mastery.forEach((m) => {
      m.mastery_score = 0.2;
      m.evidence_count = 0;
      m.correct_count = 0;
      m.total_count = 0;
    });
    return commit({
      message:
        "Local learning history and file metadata cleared. No server data changed.",
    });
  }
  throw new Error(
    "This action requires the connected backend and is unavailable in local demo mode.",
  );
}
