'use client';

import { useTaskStore, Task } from '@/store/useTaskStore';
import { ArrowLeft, Trash2, Plus, GitMerge, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ConfirmModal from './ConfirmModal';

interface SortableTaskItemProps {
  task: Task;
  getSubtaskCount: (taskId: string) => { total: number; completed: number };
  onDeleteClick: (taskToDelete: { id: string; title: string }) => void;
}

function SortableTaskItem({ task, getSubtaskCount, onDeleteClick }: SortableTaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tasks = useTaskStore((state) => state.tasks);
  const subtasks = tasks.filter((t) => t.parentId === task.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const count = getSubtaskCount(task.id);
  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          {/* Иконка перетаскивания (Drag Handle) */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 p-1 rounded-md transition-colors touch-none outline-none"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            {count.total > 0 ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                title={isExpanded ? 'Свернуть' : 'Развернуть'}
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            ) : (
              <div className="w-7 h-7" /> // Пустой блок для выравнивания, если нет подзадач
            )}

            <span className={`text-lg font-medium transition-colors ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
              {task.title}
            </span>
          </div>

          {/* Бейджик с подзадачами */}
          {count.total > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700/50">
              <GitMerge className="w-3.5 h-3.5" />
              Tasks: {count.completed} / {count.total}
            </span>
          )}
        </div>

        <button
          onClick={() => onDeleteClick({ id: task.id, title: task.title })}
          className="p-2 text-zinc-600 hover:bg-red-900/30 hover:text-red-400 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Удалить задачу"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Матрешка (список подзадач внутри) */}
      {isExpanded && subtasks.length > 0 && (
        <div className="flex flex-col gap-2 pl-[4.5rem] pr-5 pb-5">
          {subtasks.map(st => {
            const stIsDone = st.status === 'done';
            return (
              <div key={st.id} className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/40 rounded-xl group/subtask hover:border-zinc-600 transition-colors">
                <span className={`text-base font-medium transition-colors ${stIsDone ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                  {st.title}
                </span>

                <button
                  onClick={() => onDeleteClick({ id: st.id, title: st.title })}
                  className="p-1.5 text-zinc-500 hover:bg-red-900/40 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover/subtask:opacity-100"
                  title="Удалить подзадачу"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface RoadmapEditorProps {
  roadmapId: string;
  onClose: () => void;
}

export default function RoadmapEditor({ roadmapId, onClose }: RoadmapEditorProps) {
  const roadmaps = useTaskStore((state) => state.roadmaps);
  const tasks = useTaskStore((state) => state.tasks);
  const getSubtaskCount = useTaskStore((state) => state.getSubtaskCount);
  const addTask = useTaskStore((state) => state.addTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const reorderTasks = useTaskStore((state) => state.reorderTasks);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);

  const roadmap = roadmaps.find((r) => r.id === roadmapId);
  // Задачи сортируем сами в массиве? Перетаскивание order не использует, оно тупо сортирует в стейте, 
  // но лучше выстраивать их в порядке из order или оригинальном из tasks, так как reorder просто переставляет в state.tasks.
  const rootTasks = tasks.filter((t) => t.roadmapId === roadmapId && t.parentId === null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderTasks(active.id as string, over.id as string);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(roadmapId, newTaskTitle.trim(), null);
    setNewTaskTitle('');
  };

  if (!roadmap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-zinc-500">
        <p>Направление не найдено.</p>
        <button onClick={onClose} className="mt-4 underline hover:text-zinc-300">Вернуться на дашборд</button>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-4xl mx-auto py-8 px-4 sm:px-8 md:py-12 text-zinc-50 flex flex-col">
        <button
          onClick={onClose}
          className="mb-10 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Вернуться на дашборд
        </button>

        <header className="mb-12 border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">{roadmap.title}</h1>
          <p className="text-zinc-400 mt-2 text-lg">Редактор проектов</p>
        </header>

        <div className="flex-1 flex flex-col space-y-3">
          {rootTasks.length === 0 ? (
            <div className="text-zinc-500 py-12 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800/60 border-dashed">
              Вы пока не добавили ни одной задачи.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rootTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {rootTasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    getSubtaskCount={getSubtaskCount}
                    onDeleteClick={(t) => setTaskToDelete(t)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <form onSubmit={handleAddTask} className="mt-8 mb-8 sm:mb-0 flex flex-col sm:flex-row gap-3 w-full pt-6">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Новая задача верхнего уровня..."
            className="w-full sm:w-auto flex-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600 text-lg shadow-inner"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="w-full sm:w-auto justify-center py-4 bg-zinc-100 text-zinc-950 hover:bg-white px-8 font-bold text-lg flex items-center gap-2 rounded-2xl transition-all disabled:opacity-50 disabled:scale-100 active:scale-95 shadow-sm"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            Добавить
          </button>
        </form>
      </main>

      <ConfirmModal
        isOpen={!!taskToDelete}
        title="Удаление задачи"
        message={`Вы действительно хотите удалить задачу "${taskToDelete?.title}" и все её подшаги? Это действие необратимо.`}
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
      />
    </>
  );
}
