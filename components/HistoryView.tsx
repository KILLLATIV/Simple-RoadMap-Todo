'use client';

import { useTaskStore } from '@/store/useTaskStore';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

// Вспомогательная функция для форматирования дат
function formatRelativeDate(timestamp?: number) {
  if (!timestamp) return 'Ранее завершенные';
  
  const date = new Date(timestamp);
  const today = new Date();
  
  const resetTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((resetTime(today) - resetTime(date)) / 86400000);
  
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

interface HistoryViewProps {
  onBack: () => void;
}

export default function HistoryView({ onBack }: HistoryViewProps) {
  // Подписываемся на tasks, чтобы история обновлялась, если статус меняется в памяти
  const tasks = useTaskStore((state) => state.tasks);
  const roadmaps = useTaskStore((state) => state.roadmaps);
  const getCompletionHistory = useTaskStore((state) => state.getCompletionHistory);

  // Получаем и кэшируем историю
  const history = useMemo(() => getCompletionHistory(), [getCompletionHistory]);

  // Группируем задачи по датам
  const groupedTasks = useMemo(() => {
    const groups: Record<string, typeof history> = {};
    
    // history уже отсортирована (от новых к старым) благодаря функции в сторе
    history.forEach((task) => {
      const dateKey = formatRelativeDate(task.completedAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });
    
    return groups;
  }, [history]);

  return (
    <main className="min-h-screen p-8 md:p-12 w-full max-w-4xl mx-auto flex flex-col">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Вернуться на дашборд
      </button>

      <header className="w-full mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-50">
          История достижений
        </h1>
        <p className="text-zinc-400 mt-2 text-lg">
          Весь ваш прогресс в виде таймлайна.
        </p>
      </header>

      {Object.keys(groupedTasks).length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-lg">
          Вы пока не завершили ни одной задачи. Но всё впереди!
        </div>
      ) : (
        <div className="relative pl-6 md:pl-8 border-l border-zinc-800 space-y-16 pb-20 ml-2 md:ml-4">
          {Object.entries(groupedTasks).map(([date, tasksInDate]) => (
            <div key={date} className="relative">
              {/* Круглый белый маркер для даты на таймлайне */}
              <div className="absolute -left-[1.85rem] md:-left-[2.35rem] top-1.5 w-3.5 h-3.5 bg-zinc-300 rounded-full ring-4 ring-zinc-950 shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              
              <h2 className="text-2xl font-bold text-zinc-100 mb-6">{date}</h2>
              
              <div className="space-y-4">
                {tasksInDate.map((task) => {
                  const roadmap = roadmaps.find((r) => r.id === task.roadmapId);
                  
                  return (
                    <div 
                      key={task.id} 
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors flex items-start gap-4 shadow-sm"
                    >
                      <div className="mt-0.5">
                        <CheckCircle2 className="w-6 h-6 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-medium text-zinc-200 leading-snug">
                          {task.title}
                        </h3>
                        <div className="mt-3 inline-flex items-center">
                          <span className="text-xs uppercase tracking-widest font-bold text-zinc-500 bg-zinc-800/60 px-3 py-1.5 rounded-full border border-zinc-700/50">
                            {roadmap?.title || 'Без роадмапа'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
