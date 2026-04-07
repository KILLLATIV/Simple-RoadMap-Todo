'use client';

import { useTaskStore } from '@/store/useTaskStore';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Trash2, Folder, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const [showCompleted, setShowCompleted] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const { task, subtasks } = getTaskDetails(taskId);

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

  const firstUnfinishedIndex = subtasks.findIndex((st) => st.status !== 'done');

  const renderedSubtasks = showCompleted 
    ? subtasks 
    : subtasks.filter((st) => st.status !== 'done');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col relative py-12 px-4 md:px-8 overflow-x-hidden">
      {/* Кнопка возврата */}
      <button 
        onClick={handleBack}
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-xs md:text-sm text-zinc-500 hover:text-zinc-300 transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        {parentTask ? `Назад к "${parentTask.title}"` : 'На дашборд'}
      </button>

      <div className="flex-1 flex flex-col items-center max-w-2xl w-full mx-auto space-y-6 mt-12 md:mt-16">
        
        <motion.h1 
          layout="position"
          className="text-3xl font-black text-zinc-50 tracking-tight leading-tight text-center px-4"
        >
          {task.title}
        </motion.h1>

        <motion.div layout className="w-full mx-auto flex flex-col gap-4">
          
          {/* Тоггл скрытия/показа */}
          {subtasks.length > 0 && (
            <motion.div layout className="flex justify-end mb-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
              >
                {showCompleted ? (
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
            <AnimatePresence mode="popLayout" initial={false}>
              {renderedSubtasks.map((st, renderedIdx) => {
                const originalIndex = subtasks.findIndex((t) => t.id === st.id);
                const isDone = st.status === 'done';
                const isNext = originalIndex === firstUnfinishedIndex;
                const isFirstRendered = renderedIdx === 0;
                
                const count = getSubtaskCount(st.id);

                return (
                  <motion.div
                    key={st.id}
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

                        {/* Кнопка удаления */}
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
              })}
            </AnimatePresence>
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
            if (subtasks.some(st => st.status !== 'done')) {
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
