'use client';

import { useTaskStore, Task } from '@/store/useTaskStore';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Trash2, Folder, Plus, Pencil, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import ConfirmModal from './ConfirmModal'; // Ensure we can use ConfirmModal for deletion if we want, but currently FocusView uses window.confirm. I'll stick to window.confirm to not break anything unless needed. Wait, we imported ConfirmModal in RoadmapEditor, in FocusView it was window.confirm.

interface SortableSubtaskItemProps {
  st: Task;
  isNext: boolean;
  isFirstRendered: boolean;
  getSubtaskCount: (taskId: string) => { total: number; completed: number };
  toggleTaskStatus: (taskId: string) => void;
  setFocus: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
}

function SortableSubtaskItem({ st, isNext, isFirstRendered, getSubtaskCount, toggleTaskStatus, setFocus, deleteTask }: SortableSubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: st.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const isDone = st.status === 'done';
  const count = getSubtaskCount(st.id);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ 
        layout: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className="relative flex items-stretch group/timeline"
    >
      {/* Левая колонка (линия + маркер) */}
      <div className="flex flex-col items-center mr-4 relative pt-1">
        <div className="relative flex items-center justify-center">
          <div
            {...attributes}
            {...listeners}
            className="absolute right-full mr-2 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-400 opacity-0 group-hover/timeline:opacity-100 transition-opacity touch-none outline-none"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <motion.div
            layout="position" 
            className={cn(
              "relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer flex-shrink-0",
              isDone 
                ? "bg-zinc-100/10 border-0" 
                : isNext
                  ? "border-2 border-zinc-200 bg-transparent shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                  : "border-2 border-zinc-800 bg-transparent"
            )}
            onClick={() => toggleTaskStatus(st.id)}
          >
            {isDone && <CheckCircle2 className="w-5 h-5 text-zinc-300" />}
            {!isDone && isNext && (
              <motion.div 
                layoutId="active-indicator"
                className="w-2 h-2 rounded-full bg-zinc-200" 
              />
            )}
          </motion.div>
        </div>

        {!isFirstRendered && (
          <div className="flex-1 w-0.5 min-h-[1.5rem] my-1 rounded-full overflow-hidden bg-zinc-900 border border-zinc-900 relative">
            <motion.div 
              className="absolute top-0 left-0 w-full bg-zinc-500"
              initial={{ height: 0 }}
              animate={{ height: isDone ? "100%" : "0%" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        )}
      </div>

      {/* Разметка задачи с навигацией и действиями */}
      <div className="flex-1 pb-4 flex flex-col justify-start pt-0.5 group/item cursor-pointer" onClick={() => setFocus(st.id)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.span 
              layout="position"
              className={cn(
                "text-lg font-medium transition-all duration-500 w-fit",
                isDone 
                  ? "text-zinc-600 line-through" 
                  : isNext
                    ? "text-zinc-50"
                    : "text-zinc-400 group-hover/timeline:text-zinc-300"
              )}
            >
              {st.title}
            </motion.span>
            
            {/* Индикатор вложенности */}
            {count.total > 0 && (
              <span 
                title="В этой задаче есть подзадачи"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md"
              >
                <Folder className="w-3.5 h-3.5" />
                {count.completed}/{count.total}
              </span>
            )}
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Удалить шаг "${st.title}"?`)) {
                deleteTask(st.id);
              }
            }}
            className="p-1.5 text-zinc-700 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all rounded-md hover:bg-red-900/10 ml-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface FocusViewProps {
  taskId: string;
}

export default function FocusView({ taskId }: FocusViewProps) {
  const tasks = useTaskStore((state) => state.tasks);
  const getTaskDetails = useTaskStore((state) => state.getTaskDetails);
  const clearFocus = useTaskStore((state) => state.clearFocus);
  const setFocus = useTaskStore((state) => state.setFocus);
  const toggleTaskStatus = useTaskStore((state) => state.toggleTaskStatus);
  const completeAllSubtasks = useTaskStore((state) => state.completeAllSubtasks);
  const addTask = useTaskStore((state) => state.addTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const getSubtaskCount = useTaskStore((state) => state.getSubtaskCount);
  const hideCompleted = useTaskStore((state) => state.hideCompleted);
  const setHideCompleted = useTaskStore((state) => state.setHideCompleted);
  const updateTaskTitle = useTaskStore((state) => state.updateTaskTitle);
  const reorderSubtasks = useTaskStore((state) => state.reorderSubtasks);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const { task, subtasks } = getTaskDetails(taskId);

  // Сортировка по order
  const sortedSubtasks = [...subtasks].sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (task) setTitleValue(task.title);
  }, [task?.title]);

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (task && titleValue.trim() && titleValue.trim() !== task.title) {
       updateTaskTitle(task.id, titleValue.trim());
    } else if (task) {
       setTitleValue(task.title);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && task) {
       reorderSubtasks(active.id as string, over.id as string, task.id);
    }
  };

  if (!task) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center">
        <p className="text-zinc-500 mb-4">Задача не найдена</p>
        <button onClick={clearFocus} className="text-zinc-300 underline">вернуться</button>
      </div>
    );
  }

  const parentTask = task.parentId ? tasks.find(t => t.id === task.parentId) : null;

  const handleBack = () => {
    if (task.parentId) {
      setFocus(task.parentId);
    } else {
      clearFocus();
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addTask(task.roadmapId, newSubtaskTitle.trim(), task.id);
    setNewSubtaskTitle('');
  };

  const firstUnfinishedIndex = sortedSubtasks.findIndex((st) => st.status !== 'done');

  const renderedSubtasks = !hideCompleted 
    ? sortedSubtasks 
    : sortedSubtasks.filter((st) => st.status !== 'done');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative py-12 px-4 sm:px-8 overflow-x-hidden">
      {/* Кнопка возврата */}
      <button 
        onClick={handleBack}
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-xs md:text-sm text-zinc-500 hover:text-zinc-300 transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        {parentTask ? `Назад к "${parentTask.title}"` : 'На дашборд'}
      </button>

      <div className="flex-1 flex flex-col items-center max-w-2xl w-full mx-auto space-y-6 mt-12 md:mt-16">
        
        <motion.div layout="position" className="flex justify-center w-full px-4 group/header">
          {isEditingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              className="text-2xl sm:text-3xl font-black text-zinc-50 tracking-tight leading-tight text-center bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 w-full max-w-lg outline-none focus:border-zinc-500"
            />
          ) : (
            <div className="flex items-center gap-3 max-w-full">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-50 tracking-tight leading-tight text-center truncate">
                {task.title}
              </h1>
              <button
                onClick={() => { setIsEditingTitle(true); setTitleValue(task.title); }}
                className="p-2 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300 rounded-xl transition-all opacity-0 group-hover/header:opacity-100 flex-shrink-0"
                title="Изменить название"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>
          )}
        </motion.div>

        <motion.div layout className="w-full mx-auto flex flex-col gap-4">
          
          {/* Тоггл скрытия/показа */}
          {sortedSubtasks.length > 0 && (
            <motion.div layout className="flex justify-end mb-2">
              <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
              >
                {!hideCompleted ? (
                   <>
                     <EyeOff className="w-4 h-4 group-hover:text-zinc-300" />
                     <span>Скрыть выполненные</span>
                   </>
                ) : (
                   <>
                     <Eye className="w-4 h-4 group-hover:text-zinc-300" />
                     <span>Показать выполненные</span>
                   </>
                )}
              </button>
            </motion.div>
          )}

          {/* Вертикальный Таймлайн Снизу-Вверх */}
          <div className="relative w-full flex flex-col-reverse justify-end pr-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={renderedSubtasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {renderedSubtasks.map((st, renderedIdx) => {
                    const originalIndex = sortedSubtasks.findIndex((t) => t.id === st.id);
                    const isNext = originalIndex === firstUnfinishedIndex;
                    const isFirstRendered = renderedIdx === 0;

                    return (
                      <SortableSubtaskItem
                        key={st.id}
                        st={st}
                        isNext={isNext}
                        isFirstRendered={isFirstRendered}
                        getSubtaskCount={getSubtaskCount}
                        toggleTaskStatus={toggleTaskStatus}
                        setFocus={setFocus}
                        deleteTask={deleteTask}
                      />
                    );
                  })}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          </div>

          {/* Инпут добавления подзадачи прямо из фокус-режима */}
          <form 
            onSubmit={handleAddSubtask} 
            className="flex items-center gap-3 mb-6 ml-10 mt-2"
          >
            <input 
              type="text" 
              placeholder="Добавить шаг..." 
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              className="flex-1 bg-zinc-900/50 border border-zinc-800/80 outline-none text-zinc-200 placeholder:text-zinc-600 px-4 py-2.5 rounded-xl transition-all focus:border-zinc-600 focus:bg-zinc-900"
            />
            <button 
              type="submit"
              disabled={!newSubtaskTitle.trim()}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

        </motion.div>

        <motion.button 
          layout="position"
          onClick={() => {
            if (sortedSubtasks.some(st => st.status !== 'done')) {
              completeAllSubtasks(task.id);
            } else if (task.status !== 'done') {
              toggleTaskStatus(task.id);
            }
            
            handleBack(); 
          }}
          className="mt-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xl px-10 py-5 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all w-full md:w-auto z-10"
        >
          Завершить все шаги
        </motion.button>
      </div>
    </div>
  );
}
