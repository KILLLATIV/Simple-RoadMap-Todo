'use client';

import { useTaskStore, Task } from '@/store/useTaskStore';
import { ArrowLeft, Trash2, Plus, GitMerge, GripVertical, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
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

function SubtaskItem({ st, onDeleteClick }: { st: Task, onDeleteClick: (taskToDelete: { id: string; title: string }) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(st.title);
  const updateTaskTitle = useTaskStore(state => state.updateTaskTitle);
  
  const handleSave = () => {
    setIsEditing(false);
    if (title.trim() && title.trim() !== st.title) updateTaskTitle(st.id, title.trim());
    else setTitle(st.title);
  };
  
  return (
    <div className="flex items-center justify-between p-3.5 bg-zinc-800/40 border border-zinc-700/40 rounded-xl group/subtask hover:border-zinc-600 transition-colors">
      <div className="flex items-center gap-2 flex-1 mr-4">
        {isEditing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-100 outline-none focus:border-zinc-500"
          />
        ) : (
          <span className={`text-base font-medium transition-colors ${st.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
            {st.title}
          </span>
        )}
      </div>

      <div className="flex gap-1 opacity-0 group-hover/subtask:opacity-100 transition-all flex-shrink-0">
        <button 
          onClick={() => { setIsEditing(true); setTitle(st.title); }}
          className="p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 rounded-lg"
          title="Редактировать"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDeleteClick({ id: st.id, title: st.title })}
          className="p-1.5 text-zinc-500 hover:bg-red-900/40 hover:text-red-400 rounded-lg"
          title="Удалить подзадачу"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface SortableTaskItemProps {
  task: Task;
  getSubtaskCount: (taskId: string) => { total: number; completed: number };
  onDeleteClick: (taskToDelete: { id: string; title: string }) => void;
}

function SortableTaskItem({ task, getSubtaskCount, onDeleteClick }: SortableTaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const tasks = useTaskStore((state) => state.tasks);
  const subtasks = tasks.filter((t) => t.parentId === task.id);
  const updateTaskTitle = useTaskStore((state) => state.updateTaskTitle);

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskTitleValue, setTaskTitleValue] = useState(task.title);

  const handleSaveTaskTitle = () => {
    setIsEditingTask(false);
    if (taskTitleValue.trim() && taskTitleValue.trim() !== task.title) {
      updateTaskTitle(task.id, taskTitleValue.trim());
    } else {
      setTaskTitleValue(task.title);
    }
  };

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
        <div className="flex items-center gap-4 flex-1">
          {/* Иконка перетаскивания (Drag Handle) */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 p-1 rounded-md transition-colors touch-none outline-none"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2 flex-1">
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

            {isEditingTask ? (
              <input
                autoFocus
                value={taskTitleValue}
                onChange={(e) => setTaskTitleValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTaskTitle()}
                onBlur={handleSaveTaskTitle}
                className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1 text-zinc-100 outline-none focus:border-zinc-500 text-lg font-medium min-w-[200px]"
              />
            ) : (
              <span className={`text-lg font-medium transition-colors ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'} truncate`}>
                {task.title}
              </span>
            )}
          </div>

          {/* Бейджик с подзадачами */}
          {count.total > 0 && !isEditingTask && (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700/50 flex-shrink-0">
              <GitMerge className="w-3.5 h-3.5" />
              Tasks: {count.completed} / {count.total}
            </span>
          )}
        </div>

        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 gap-1 pl-4">
          <button 
            onClick={() => { setIsEditingTask(true); setTaskTitleValue(task.title); }}
            className="p-2 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 rounded-xl transition-all"
            title="Редактировать задачу"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDeleteClick({ id: task.id, title: task.title })}
            className="p-2 text-zinc-600 hover:bg-red-900/30 hover:text-red-400 rounded-xl transition-all"
            title="Удалить задачу"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Матрешка (список подзадач внутри) */}
      {isExpanded && subtasks.length > 0 && (
        <div className="flex flex-col gap-2 pl-[4.5rem] pr-5 pb-5">
          {subtasks.map(st => (
            <SubtaskItem key={st.id} st={st} onDeleteClick={onDeleteClick} />
          ))}
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
  const updateRoadmapTitle = useTaskStore((state) => state.updateRoadmapTitle);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);

  const roadmap = roadmaps.find((r) => r.id === roadmapId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(roadmap?.title || '');

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

  const handleSaveRoadmapTitle = () => {
    setIsEditingTitle(false);
    if (editTitleValue.trim() && editTitleValue.trim() !== roadmap?.title && roadmap) {
      updateRoadmapTitle(roadmap.id, editTitleValue.trim());
    } else {
      setEditTitleValue(roadmap?.title || '');
    }
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

        <header className="mb-12 border-b border-zinc-800 pb-6 group/header flex justify-between items-start">
          <div className="flex-1">
            {isEditingTitle ? (
              <input
                autoFocus
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onBlur={handleSaveRoadmapTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRoadmapTitle()}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-3xl font-extrabold tracking-tight text-zinc-50 outline-none focus:border-zinc-500"
              />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight break-words">{roadmap.title}</h1>
                <button
                  onClick={() => { setIsEditingTitle(true); setEditTitleValue(roadmap.title); }}
                  className="p-2 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 rounded-xl transition-all opacity-0 group-hover/header:opacity-100"
                  title="Изменить название"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              </div>
            )}
            <p className="text-zinc-400 mt-2 text-lg">Редактор проектов</p>
          </div>
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
