const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export interface User {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  full_name: string;
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  code?: string;
  description?: string;
  exam_date?: string;
  learning_objectives?: string;
  available_hours_per_week: number;
  created_at: string;
  updated_at: string;
  topic_count: number;
  resource_count: number;
  overall_mastery: number;
}

export interface Topic {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  mastery_score: number;
  prerequisites: string[];
}

export interface CourseDetail extends Course {
  topics: Topic[];
}

export interface ResourceItem {
  id: string;
  user_id: string;
  course_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  page_count: number;
  status: "UPLOADED" | "PROCESSING" | "INDEXED" | "FAILED";
  error_message?: string;
  created_at: string;
  updated_at: string;
  chunk_count: number;
}

export interface TutorCitation {
  resource_id: string;
  filename: string;
  page_number: number;
  excerpt: string;
  relevance_score: number;
}

export interface TutorAnswer {
  answer: string;
  speech_text?: string;
  key_takeaways: string[];
  examples: string[];
  citations: TutorCitation[];
  has_sufficient_evidence: boolean;
  uncertainty_notes?: string;
  follow_up_questions: string[];
  model_used: string;
  latency_ms?: number;
  conversation_id?: string;
  message_id?: string;
  user_audio_url?: string;
  assistant_audio_url?: string;
}

export interface AudioMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  transcript: string;
  audio_url?: string;
  duration_seconds: number;
  citations: TutorCitation[];
  created_at: string;
}

export interface AudioConversation {
  id: string;
  course_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  messages: AudioMessage[];
}

export interface QuizItem {
  id: string;
  topic_id: string;
  question: string;
  options: string[];
  difficulty: string;
}

export interface QuizAnswerResult {
  quiz_item_id: string;
  question: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  detected_misconception?: string;
  evidence_quote?: string;
}

export interface QuizResultResponse {
  attempt_id: string;
  course_id: string;
  total_items: number;
  correct_items: number;
  score_percentage: number;
  answers: QuizAnswerResult[];
  detected_misconceptions: Array<{
    id: string;
    title: string;
    status: string;
    remediation?: string;
  }>;
  updated_mastery: Record<string, number>;
  planner_updated: boolean;
}

export interface QuizAttemptItem {
  id: string;
  course_id: string;
  total_items: number;
  correct_items: number;
  score_percentage: number;
  created_at?: string;
}

export interface Misconception {
  id: string;
  user_id: string;
  course_id: string;
  topic_id: string;
  topic_title?: string;
  title: string;
  description: string;
  evidence_question: string;
  evidence_answer: string;
  expected_concept: string;
  confidence: number;
  remediation_provided?: string;
  status: "NEWLY_DETECTED" | "NEEDS_REMEDIATION" | "NEEDS_RETEST" | "RESOLVED";
  next_review_at?: string;
  attempt_count: number;
  last_assessed_outcome: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MasteryItem {
  id: string;
  topic_id: string;
  topic_title: string;
  course_id: string;
  mastery_score: number;
  confidence_score: number;
  evidence_count: number;
  correct_count: number;
  total_count: number;
  last_assessed_at?: string;
  updated_at: string;
}

export interface MemorySummary {
  total_topics: number;
  mastered_topics: number;
  in_progress_topics: number;
  needs_attention_topics: number;
  average_mastery: number;
  open_misconceptions_count: number;
  resolved_misconceptions_count: number;
  misconceptions: Misconception[];
  topic_masteries: MasteryItem[];
}

export interface StudyTask {
  id: string;
  user_id: string;
  course_id: string;
  topic_id?: string;
  topic_title?: string;
  title: string;
  description: string;
  due_date: string;
  estimated_minutes: number;
  priority_score: number;
  reason_codes: string[];
  status: "RECOMMENDED" | "IN_PROGRESS" | "COMPLETED" | "RESCHEDULED";
  completion_evidence?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyPlan {
  course_id: string;
  course_title: string;
  exam_date?: string;
  tasks: StudyTask[];
  formula_explanation: string;
  recommended_count: number;
  completed_count: number;
}

export interface AgentRun {
  id: string;
  user_id: string;
  course_id?: string;
  goal: string;
  skill_name: string;
  execution_state: string;
  tool_actions: Array<Record<string, any>>;
  logs: string[];
  result_summary?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface ToolGrant {
  id: string;
  tool_name: string;
  is_granted: boolean;
  revoked_at?: string;
  description?: string;
}

// Token management
const TOKEN_KEY = "learnloop_access_token";

export const authStorage = {
  getToken: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    // Expire retired browser-only sessions without touching saved user data.
    if (token === "learnloop-browser-demo") {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  },
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    authStorage.clearToken();
    // Redirect or trigger event if outside test
  }

  if (!response.ok) {
    const errorText = await response.text();
    let detail = errorText;
    try {
      const errJson = JSON.parse(errorText);
      detail = errJson.detail || errorText;
    } catch {
      // raw text
    }
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiFetch<AuthResponse>("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    register: (userData: {
      email: string;
      password: string;
      full_name: string;
      timezone?: string;
    }) =>
      apiFetch<AuthResponse>("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      }),
    getMe: () => apiFetch<User>("/v1/auth/me"),
    updateProfile: (data: { full_name?: string; timezone?: string }) =>
      apiFetch<User>("/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  courses: {
    list: () => apiFetch<Course[]>("/v1/courses"),
    get: (id: string) => apiFetch<CourseDetail>(`/v1/courses/${id}`),
    create: (data: Partial<Course>) =>
      apiFetch<Course>("/v1/courses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Course>) =>
      apiFetch<Course>(`/v1/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/v1/courses/${id}`, {
        method: "DELETE",
      }),
  },

  resources: {
    listByCourse: (courseId: string) =>
      apiFetch<ResourceItem[]>(`/v1/courses/${courseId}/resources`),
    get: (id: string) => apiFetch<ResourceItem>(`/v1/resources/${id}`),
    upload: async (courseId: string, file: File) => {
      const formData = new FormData();
      formData.append("course_id", courseId);
      formData.append("file", file);
      return apiFetch<ResourceItem>("/v1/resources/upload", {
        method: "POST",
        body: formData,
      });
    },
    delete: (id: string) =>
      apiFetch<void>(`/v1/resources/${id}`, {
        method: "DELETE",
      }),
  },

  topics: {
    listByCourse: (courseId: string) =>
      apiFetch<Topic[]>(`/v1/courses/${courseId}/topics`),
    create: (
      courseId: string,
      data: {
        title: string;
        description?: string;
        order_index?: number;
        prerequisites?: string[];
      },
    ) =>
      apiFetch<Topic>(`/v1/courses/${courseId}/topics`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  tutor: {
    ask: (data: {
      course_id: string;
      question: string;
      topic_id?: string;
      allow_general_knowledge?: boolean;
      conversation_id?: string;
    }) =>
      apiFetch<TutorAnswer>("/v1/tutor/ask", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    askVoice: async (
      courseId: string,
      transcript: string,
      audioBlob?: Blob,
      conversationId?: string,
    ) => {
      const formData = new FormData();
      formData.append("course_id", courseId);
      formData.append("transcript", transcript);
      if (conversationId) formData.append("conversation_id", conversationId);
      if (audioBlob)
        formData.append("audio_file", audioBlob, "voice_input.webm");
      return apiFetch<TutorAnswer>("/v1/tutor/voice/ask", {
        method: "POST",
        body: formData,
      });
    },
    listVoiceConversations: (courseId?: string) =>
      apiFetch<AudioConversation[]>(
        `/v1/tutor/voice/conversations${courseId ? `?course_id=${courseId}` : ""}`,
      ),
    getVoiceConversation: (id: string) =>
      apiFetch<AudioConversation>(`/v1/tutor/voice/conversations/${id}`),
    saveAssistantAudio: async (messageId: string, audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio_file", audioBlob, "jarvis_response.webm");
      return apiFetch<{ status: string; audio_url: string }>(
        `/v1/tutor/voice/messages/${messageId}/audio`,
        {
          method: "POST",
          body: formData,
        },
      );
    },
    getModels: () =>
      apiFetch<{
        is_configured: boolean;
        active_model: string;
        available_models: string[];
      }>("/v1/tutor/models"),
  },

  quizzes: {
    generate: (data: {
      course_id: string;
      topic_ids?: string[];
      num_questions?: number;
      difficulty?: string;
    }) =>
      apiFetch<QuizItem[]>("/v1/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    submit: (data: {
      course_id: string;
      answers: Array<{ quiz_item_id: string; selected_answer: string }>;
    }) =>
      apiFetch<QuizResultResponse>("/v1/quizzes/submit", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getResults: (attemptId: string) =>
      apiFetch<QuizResultResponse>(`/v1/quizzes/${attemptId}/results`),
    listAttempts: (courseId?: string) =>
      apiFetch<QuizAttemptItem[]>(
        `/v1/quizzes/attempts${courseId ? `?course_id=${courseId}` : ""}`,
      ),
  },

  memory: {
    getSummary: (courseId?: string) =>
      apiFetch<MemorySummary>(
        `/v1/memory${courseId ? `?course_id=${courseId}` : ""}`,
      ),
    getMisconceptions: (courseId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (courseId) params.append("course_id", courseId);
      if (status) params.append("status", status);
      return apiFetch<Misconception[]>(
        `/v1/memory/misconceptions?${params.toString()}`,
      );
    },
    getMastery: (courseId?: string) =>
      apiFetch<MasteryItem[]>(
        `/v1/memory/mastery${courseId ? `?course_id=${courseId}` : ""}`,
      ),
  },

  planner: {
    getPlan: (courseId?: string) =>
      apiFetch<StudyPlan>(
        `/v1/study-plans${courseId ? `?course_id=${courseId}` : ""}`,
      ),
    recalculate: (courseId: string) =>
      apiFetch<StudyPlan>("/v1/study-plans/recalculate", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId }),
      }),
    updateTask: (
      taskId: string,
      data: {
        status?: string;
        due_date?: string;
        completion_evidence?: string;
      },
    ) =>
      apiFetch<StudyTask>(`/v1/study-tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  agent: {
    triggerRun: (data: {
      goal: string;
      skill_name: string;
      course_id?: string;
      params?: Record<string, any>;
    }) =>
      apiFetch<AgentRun>("/v1/agent-runs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    listRuns: (courseId?: string, skill?: string, status?: string) => {
      const params = new URLSearchParams();
      if (courseId) params.append("course_id", courseId);
      if (skill) params.append("skill", skill);
      if (status) params.append("status", status);
      return apiFetch<AgentRun[]>(`/v1/agent-runs?${params.toString()}`);
    },
    getRun: (id: string) => apiFetch<AgentRun>(`/v1/agent-runs/${id}`),
    listGrants: () => apiFetch<ToolGrant[]>("/v1/agent/grants"),
    toggleGrant: (tool_name: string, is_granted: boolean) =>
      apiFetch<ToolGrant>("/v1/agent/grants", {
        method: "POST",
        body: JSON.stringify({ tool_name, is_granted }),
      }),
  },

  settings: {
    getPrivacy: () => apiFetch<any>("/v1/settings/privacy"),
    exportData: () => apiFetch<any>("/v1/settings/export", { method: "POST" }),
    deleteData: () =>
      apiFetch<{ message: string }>("/v1/settings/data", { method: "DELETE" }),
  },

  health: () =>
    apiFetch<{
      status: string;
      app: string;
      version: string;
      database_connected: boolean;
      nebius_configured: boolean;
      model: string;
    }>("/health"),
};
