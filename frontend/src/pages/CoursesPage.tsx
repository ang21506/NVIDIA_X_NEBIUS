import React, { useState, useEffect } from 'react';
import { api, Course, CourseDetail } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  BookOpen,
  Trash2,
  ExternalLink,
  GitFork,
  CheckCircle2,
} from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { activeCourseId, setActiveCourseId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<CourseDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [examDate, setExamDate] = useState('');
  const [availableHours, setAvailableHours] = useState(10);
  const [creating, setCreating] = useState(false);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const list = await api.courses.list();
      setCourses(list);
      const targetId = activeCourseId || (list.length > 0 ? list[0].id : null);
      if (targetId) {
        const detail = await api.courses.get(targetId);
        setSelectedCourseDetail(detail);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [activeCourseId]);

  const handleSelectCourse = async (courseId: string) => {
    setActiveCourseId(courseId);
    try {
      const detail = await api.courses.get(courseId);
      setSelectedCourseDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const newCourse = await api.courses.create({
        title,
        code,
        description,
        exam_date: examDate || undefined,
        available_hours_per_week: Number(availableHours),
      });
      setShowCreateModal(false);
      setTitle('');
      setCode('');
      setDescription('');
      setExamDate('');
      await loadCourses();
      setActiveCourseId(newCourse.id);
    } catch (err) {
      alert(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course and all its study documents?')) return;
    try {
      await api.courses.delete(id);
      await loadCourses();
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-cyan-400" /> My Courses & Workspaces
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize study domains, view extracted prerequisite graphs, and track topic masteries.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer shadow-md shadow-cyan-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Course</span>
        </button>
      </div>

      {/* Course List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => {
          const isSelected = c.id === activeCourseId;
          return (
            <div
              key={c.id}
              onClick={() => handleSelectCourse(c.id)}
              className={`p-5 rounded-2xl cursor-pointer transition-all ${
                isSelected
                  ? 'bg-slate-900 border-2 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {c.code || 'COURSE'}
                </span>
                {c.code === 'CS-401' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Seeded Sample
                  </span>
                )}
              </div>

              <h3 className="font-bold text-base text-white mb-1.5 leading-snug">{c.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 mb-4">{c.description || 'No description provided.'}</p>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  {c.exam_date ? new Date(c.exam_date).toLocaleDateString() : 'Exam unset'}
                </span>
                <span className="font-bold text-cyan-400">
                  {Math.round(c.overall_mastery * 100)}% Mastery
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Course Topics & Prerequisite Hierarchy */}
      {selectedCourseDetail && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold mb-1">
                Active Workspace
              </div>
              <h2 className="text-xl font-bold text-white">{selectedCourseDetail.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{selectedCourseDetail.learning_objectives}</p>
            </div>
            {selectedCourseDetail.code !== 'CS-401' && (
              <button
                onClick={() => handleDeleteCourse(selectedCourseDetail.id)}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Course
              </button>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-indigo-400" /> Extracted Course Topics & Prerequisites
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedCourseDetail.topics.map((t) => (
                <div key={t.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      {t.order_index + 1}. {t.title}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {Math.round(t.mastery_score * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                  {t.prerequisites.length > 0 && (
                    <div className="text-[10px] text-indigo-400 flex items-center gap-1">
                      <span className="font-semibold">Prerequisite:</span>
                      <span>Topic #{selectedCourseDetail.topics.findIndex(x => x.id === t.prerequisites[0]) + 1}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Create New Course Workspace</h3>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. CS-452"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the course content..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Study Hours Available / Week</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={availableHours}
                  onChange={(e) => setAvailableHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
              >
                {creating ? 'Creating Workspace...' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
