import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Upload, FileText, Trash2, Search, ArrowRight } from "lucide-react";
import { api, type ResourceItem } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Panel, EmptyState } from "../components/ui";
export function ResourcesPage() {
  const { activeCourseId } = useAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  useEffect(() => {
    let alive = true;
    if (!activeCourseId) return;
    api.resources
      .listByCourse(activeCourseId)
      .then((r) => {
        if (alive) setResources(r);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [activeCourseId, revision]);
  const upload = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file = new FormData(form).get("file") as File;
    if (!activeCourseId || !file?.size) return;
    if (!/\.(pdf|txt|md)$/i.test(file.name)) {
      setError("Choose a PDF, TXT or Markdown file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Choose a file smaller than 25 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.resources.upload(activeCourseId, file);
      setRevision((n) => n + 1);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (r: ResourceItem) => {
    if (
      !confirm(
        "Delete this resource and its indexed chunks?",
      )
    )
      return;
    try {
      await api.resources.delete(r.id);
      setSelected(null);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete.");
    }
  };
  const filtered = resources
    .filter((r) => r.filename.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === "name"
        ? a.filename.localeCompare(b.filename)
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="YOUR COURSEWORK, TOGETHER"
        title="A home for your materials."
        description="Keep the notes you need close to the questions you're asking."
      />
      <Panel title="Add course material">
        <form className="upload-form" onSubmit={upload}>
          <Upload size={28} />
          <label>
            Choose a file
            <input
              name="file"
              type="file"
              accept=".pdf,.txt,.md"
              required
              disabled={!activeCourseId || busy}
            />
          </label>
          <button className="button" disabled={!activeCourseId || busy}>
            {busy
              ? "Adding material…"
              : "Upload material"}
          </button>
        </form>
        <p className="fine-print">
          PDF, TXT and Markdown · Up to 25 MB.{" "}
          Uploaded materials are processed for search. Ready materials can support answers from JARVIS.
        </p>
      </Panel>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search materials"
            placeholder="Search your materials…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="sort-control">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Newest first</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className={selected ? "library-detail-grid" : ""}>
        <Panel title={`Course materials · ${filtered.length}`}>
          {filtered.length ? (
            filtered.map((r) => (
              <div className="material-row" key={r.id}>
                <span className="metric-icon">
                  <FileText size={20} />
                </span>
                <button
                  className="material-name"
                  onClick={() => setSelected(r)}
                >
                  <strong>{r.filename}</strong>
                  <small>
                    {(r.file_size / 1024).toFixed(1)} KB ·{" "}
                    {new Date(r.created_at).toLocaleDateString()}
                  </small>
                </button>
                <span className="tag">
                  {r.status === "INDEXED"
                      ? "Ready"
                      : r.status.toLowerCase()}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Delete ${r.filename}`}
                  onClick={() => remove(r)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <EmptyState title="Make this space your own">
              Add course notes or a syllabus to get started.
            </EmptyState>
          )}
        </Panel>
        {selected && (
          <Panel
            title="Material details"
            action={
              <button className="text-link" onClick={() => setSelected(null)}>
                Close
              </button>
            }
          >
            <h3 className="break-words">{selected.filename}</h3>
            <p className="body-copy">
              {selected.mime_type || "Document"}
              <br />
              {selected.chunk_count} indexed chunks
              <br />
              {selected.page_count} extracted pages
            </p>
            <p className="fine-print">
              Document preview is not available in this view.
            </p>
            {selected.status === "INDEXED" && (
              <Link className="button secondary" to="/tutor">
                Ask JARVIS
                <ArrowRight size={15} />
              </Link>
            )}
            {selected.error_message && (
              <p className="form-error">{selected.error_message}</p>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
