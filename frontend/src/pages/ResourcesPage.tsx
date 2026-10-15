import React, { useState, useEffect } from 'react';
import { api, ResourceItem } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  FolderArchive,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { activeCourseId } = useAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadResources = async () => {
    if (!activeCourseId) return;
    try {
      const list = await api.resources.listByCourse(activeCourseId);
      setResources(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadResources();
    const interval = setInterval(loadResources, 5000);
    return () => clearInterval(interval);
  }, [activeCourseId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeCourseId) return;

    setUploading(true);
    setUploadError(null);
    try {
      await api.resources.upload(activeCourseId, selectedFile);
      setSelectedFile(null);
      await loadResources();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resource and all derived semantic vectors?')) return;
    try {
      await api.resources.delete(id);
      await loadResources();
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <FolderArchive className="w-6 h-6 text-cyan-400" /> Course Resource Library
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload PDF lecture slides, syllabi, or notes. LearnLoop parses page-level references and generates dense vector embeddings.
        </p>
      </div>

      {/* Upload Box */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 glass-panel">
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-cyan-400" /> Ingest New Course Document
        </h2>

        {uploadError && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-4">
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            className="w-full sm:flex-1 text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
          />
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-colors cursor-pointer"
          >
            {uploading ? 'Extracting & Indexing...' : 'Upload & Index'}
          </button>
        </form>
        <p className="text-[11px] text-slate-500 mt-2">
          Supported: PDF (with page preservation), TXT, Markdown. Max file size: 25MB.
        </p>
      </div>

      {/* Resource Table */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <h2 className="text-sm font-bold text-white mb-4">Indexed Documents & Provenance</h2>

        {resources.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400">
            No resources uploaded for this course yet. Upload a PDF above to enable evidence-grounded tutoring.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {resources.map((r) => (
              <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>{r.filename}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({(r.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-1">
                      <span>{r.page_count} Pages Preserved</span>
                      <span>•</span>
                      <span>{r.chunk_count} Semantic Chunks</span>
                      <span>•</span>
                      <span>Uploaded {new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {/* Status Badge */}
                  {r.status === 'INDEXED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                    </span>
                  )}
                  {r.status === 'PROCESSING' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Processing
                    </span>
                  )}
                  {r.status === 'FAILED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete document and chunks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
