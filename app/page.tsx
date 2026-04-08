'use client';

import { Play, Archive, Trash2, List, Plus, Download, Upload } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useShallow } from 'zustand/react/shallow';
import FocusView from '@/components/FocusView';
import HistoryView from '@/components/HistoryView';
import RoadmapEditor from '@/components/RoadmapEditor';
import ConfirmModal from '@/components/ConfirmModal';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);
  const [roadmapToDelete, setRoadmapToDelete] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newRoadmapTitle, setNewRoadmapTitle] = useState('');

  const roadmaps = useTaskStore((state) => state.roadmaps);
  const activeSteps = useTaskStore(useShallow((state) => state.getActiveStepPerRoadmap()));
  const focusedTaskId = useTaskStore((state) => state.focusedTaskId);
  const setFocus = useTaskStore((state) => state.setFocus);
  const getRoadmapProgress = useTaskStore((state) => state.getRoadmapProgress);
  const addRoadmap = useTaskStore((state) => state.addRoadmap);
  const deleteRoadmap = useTaskStore((state) => state.deleteRoadmap);

  if (editingRoadmapId) {
    return <RoadmapEditor roadmapId={editingRoadmapId} onClose={() => setEditingRoadmapId(null)} />;
  }

  if (focusedTaskId) {
    return <FocusView taskId={focusedTaskId} />;
  }

  if (view === 'history') {
    return <HistoryView onBack={() => setView('dashboard')} />;
  }

  const handleAddRoadmap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoadmapTitle.trim()) return;
    addRoadmap(newRoadmapTitle.trim());
    setNewRoadmapTitle('');
  };

  const handleExport = () => {
    const data = localStorage.getItem('adhd-task-storage');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roadmap-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = event.target?.result as string;
          JSON.parse(json); // Валидация, что это именно JSON
          localStorage.setItem('adhd-task-storage', json);
          window.location.reload();
        } catch {
          alert('Ошибка чтения файла. Убедитесь, что это корректный файл бэкапа.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 max-w-5xl mx-auto flex flex-col items-center">
      <header className="w-full mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50">
            Дашборд фокусировки
          </h1>
          <p className="text-zinc-400 mt-2 text-sm sm:text-base">
            Ваш следующий шаг в каждом из направлений.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={() => setView('history')}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors shadow-sm"
            title="История"
          >
            <Archive className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div className="w-px h-8 bg-zinc-800 mx-1 hidden md:block"></div> {/* Разделитель */}

          <button
            onClick={handleExport}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors shadow-sm"
            title="Экспорт данных"
          >
            <Upload className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors shadow-sm"
            title="Импорт данных"
          >
            <Download className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </header>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        {roadmaps.map((roadmap) => {
          // Ищем активную задачу именно для этого роадмапа
          const activeTask = activeSteps.find((t) => t.roadmapId === roadmap.id);
          const progress = getRoadmapProgress(roadmap.id);

          return (
            <div
              key={roadmap.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-700 hover:shadow-lg transition-all relative group"
            >
              {/* Иконки управления (появляются/становятся ярче при наведении) */}
              <div className="absolute top-6 right-6 flex gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingRoadmapId(roadmap.id)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-200"
                  title="Редактировать план"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRoadmapToDelete(roadmap.id)}
                  className="p-2 hover:bg-red-900/40 rounded-full text-zinc-400 hover:text-red-400 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-12">
                <div className="flex justify-between items-center mb-4 pr-16 bg-transparent">
                  <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold block truncate">
                    {roadmap.title}
                  </span>
                  <span className="text-xs font-bold text-zinc-600 shrink-0">
                    {progress.completed} / {progress.total}
                  </span>
                </div>

                {/* Тонкий прогресс-бар */}
                <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-zinc-400 transition-all duration-700 ease-in-out"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>

                {activeTask ? (
                  <h2 className="text-2xl font-bold text-zinc-100 leading-snug">
                    {activeTask.title}
                  </h2>
                ) : (
                  <h2 className="text-xl font-medium text-zinc-500 italic leading-snug">
                    Нет активных задач
                  </h2>
                )}
              </div>

              <button
                onClick={() => {
                  if (activeTask) {
                    setFocus(activeTask.id);
                  } else {
                    setEditingRoadmapId(roadmap.id);
                  }
                }}
                className={cn(
                  "group mt-auto flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl font-bold text-lg transition-all",
                  activeTask
                    ? "bg-zinc-100 text-zinc-950 hover:bg-white active:scale-[0.98]"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                )}>
                {activeTask ? (
                  <>
                    <Play className="w-5 h-5 flex-shrink-0 fill-current" />
                    <span>Сфокусироваться</span>
                  </>
                ) : (
                  <>
                    <List className="w-5 h-5 flex-shrink-0" />
                    <span>Добавить задачи</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Неброский блок добавления роадмапа */}
      <form
        onSubmit={handleAddRoadmap}
        className="mt-auto mb-8 sm:mb-0 w-full max-w-md flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl"
      >
        <input
          type="text"
          placeholder="Новое направление..."
          value={newRoadmapTitle}
          onChange={(e) => setNewRoadmapTitle(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-zinc-300 placeholder:text-zinc-600 px-2"
        />
        <button
          type="submit"
          disabled={!newRoadmapTitle.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </form>

      <ConfirmModal
        isOpen={!!roadmapToDelete}
        title="Удаление направления"
        message="Вы уверены, что хотите удалить этот роадмап и все его задачи? Это действие необратимо."
        onCancel={() => setRoadmapToDelete(null)}
        onConfirm={() => {
          if (roadmapToDelete) {
            deleteRoadmap(roadmapToDelete);
            setRoadmapToDelete(null);
          }
        }}
      />

      <ConfirmModal
        isOpen={isImportModalOpen}
        title="Импорт данных"
        message="Текущие задачи и направления будут полностью перезаписаны данными из файла. Это необратимое действие. Продолжить?"
        onCancel={() => setIsImportModalOpen(false)}
        onConfirm={() => {
          setIsImportModalOpen(false);
          handleImport();
        }}
      />
    </main>
  );
}
