import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { arrayMove } from '@dnd-kit/sortable';

export interface Roadmap {
  id: string;
  title: string;
  colorTheme: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  roadmapId: string;
  title: string;
  status: TaskStatus;
  parentId: string | null;
  completedAt?: number;
  order?: number;
}

interface TaskStore {
  roadmaps: Roadmap[];
  tasks: Task[];
  
  // Навигация
  focusedTaskId: string | null;
  setFocus: (taskId: string) => void;
  clearFocus: () => void;
  
  // Управление данными
  toggleTaskStatus: (taskId: string) => void;
  completeAllSubtasks: (parentId: string) => void;
  addRoadmap: (title: string) => void;
  deleteRoadmap: (id: string) => void;
  addTask: (roadmapId: string, title: string, parentId?: string | null) => void;
  deleteTask: (taskId: string) => void;
  reorderTasks: (activeId: string, overId: string) => void;
  
  // Селекторы
  getActiveStepPerRoadmap: () => Task[];
  getTaskDetails: (taskId: string) => { task: Task | undefined; subtasks: Task[] };
  getRoadmapProgress: (roadmapId: string) => { total: number; completed: number; percentage: number };
  getCompletionHistory: () => Task[];
  getSubtaskCount: (taskId: string) => { total: number; completed: number };
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      roadmaps: [],
      tasks: [],

      focusedTaskId: null,
      setFocus: (taskId) => set({ focusedTaskId: taskId }),
      clearFocus: () => set({ focusedTaskId: null }),

      addRoadmap: (title) => set((state) => ({
        roadmaps: [...state.roadmaps, { id: crypto.randomUUID(), title, colorTheme: 'blue' }]
      })),

      deleteRoadmap: (id) => set((state) => ({
        roadmaps: state.roadmaps.filter(r => r.id !== id),
        tasks: state.tasks.filter(t => t.roadmapId !== id)
      })),

      addTask: (roadmapId, title, parentId = null) => set((state) => ({
        tasks: [...state.tasks, {
          id: crypto.randomUUID(),
          roadmapId,
          title,
          status: 'todo',
          parentId: parentId || null,
          order: Date.now()
        }]
      })),

      deleteTask: (taskId) => set((state) => {
        // Мы используем Set, чтобы рекурсивно собрать саму задачу и все уровни ее подзадач
        const idsToDelete = new Set<string>([taskId]);
        let currentSize = 0;
        
        while (idsToDelete.size > currentSize) {
          currentSize = idsToDelete.size;
          state.tasks.forEach(t => {
            if (t.parentId && idsToDelete.has(t.parentId)) {
              idsToDelete.add(t.id);
            }
          });
        }
        
        return {
          tasks: state.tasks.filter(t => !idsToDelete.has(t.id)),
          // Если фокус в данный момент находится на удаляемой задаче (или подзадаче), сбрасываем его
          focusedTaskId: idsToDelete.has(state.focusedTaskId || '') ? null : state.focusedTaskId
        };
      }),

      reorderTasks: (activeId, overId) => set((state) => {
        const oldIndex = state.tasks.findIndex((t) => t.id === activeId);
        const newIndex = state.tasks.findIndex((t) => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          return {
            tasks: arrayMove(state.tasks, oldIndex, newIndex),
          };
        }
        return state;
      }),

      toggleTaskStatus: (taskId) =>
        set((state) => {
          const tasks = [...state.tasks];
          const taskIndex = tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;

          const currentTask = tasks[taskIndex];
          const newStatus = currentTask.status === 'done' ? 'todo' : 'done';
          
          tasks[taskIndex] = {
            ...currentTask,
            status: newStatus,
            completedAt: newStatus === 'done' ? Date.now() : undefined,
          };

          if (newStatus === 'done') {
            let parentIdToVerify = tasks[taskIndex].parentId;
            
            while (parentIdToVerify) {
              const pId = parentIdToVerify;
              const siblings = tasks.filter(t => t.parentId === pId);
              if (siblings.length === 0) break;
              
              const areAllSiblingsDone = siblings.every(t => t.status === 'done');
              
              if (areAllSiblingsDone) {
                const parentIndex = tasks.findIndex(t => t.id === pId);
                if (parentIndex !== -1 && tasks[parentIndex].status !== 'done') {
                  tasks[parentIndex] = {
                    ...tasks[parentIndex],
                    status: 'done',
                    completedAt: Date.now()
                  };
                  parentIdToVerify = tasks[parentIndex].parentId;
                } else {
                  break;
                }
              } else {
                break;
              }
            }
          }

          return { tasks };
        }),

      completeAllSubtasks: (parentId) =>
        set((state) => {
          const tasks = [...state.tasks];
          let madeChanges = false;

          for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].parentId === parentId && tasks[i].status !== 'done') {
              tasks[i] = { ...tasks[i], status: 'done', completedAt: Date.now() };
              madeChanges = true;
            }
          }

          if (madeChanges) {
            let currentParentId: string | null = parentId;
            while (currentParentId) {
              const pId = currentParentId;
              const siblings = tasks.filter(t => t.parentId === pId);
              if (siblings.length === 0) break;
              
              const allDone = siblings.every(t => t.status === 'done');
              
              if (allDone) {
                const pIdx = tasks.findIndex(t => t.id === pId);
                if (pIdx !== -1 && tasks[pIdx].status !== 'done') {
                  tasks[pIdx] = {
                    ...tasks[pIdx],
                    status: 'done',
                    completedAt: Date.now()
                  };
                  currentParentId = tasks[pIdx].parentId;
                } else {
                  break;
                }
              } else {
                break;
              }
            }
          }

          return madeChanges ? { tasks } : state;
        }),

      getActiveStepPerRoadmap: () => {
        const { roadmaps, tasks } = get();
        const activeSteps: Task[] = [];

        roadmaps.forEach((roadmap) => {
          const activeTask = tasks.find(
            (task) =>
              task.roadmapId === roadmap.id &&
              task.parentId === null &&
              (task.status === 'todo' || task.status === 'in_progress')
          );
          if (activeTask) activeSteps.push(activeTask);
        });

        return activeSteps;
      },
      
      getTaskDetails: (taskId) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === taskId);
        const subtasks = tasks.filter((t) => t.parentId === taskId);
        return { task, subtasks };
      },
      
      getRoadmapProgress: (roadmapId) => {
        const { tasks } = get();
        const roadmapTasks = tasks.filter((t) => t.roadmapId === roadmapId);
        
        // Считаем только "листья" - задачи, у которых нет своих подзадач
        const leafTasks = roadmapTasks.filter(
          (t) => !roadmapTasks.some((other) => other.parentId === t.id)
        );
        
        const total = leafTasks.length;
        const completed = leafTasks.filter((t) => t.status === 'done').length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percentage };
      },
      
      getCompletionHistory: () => {
        const { tasks } = get();
        return tasks
          .filter((t) => t.status === 'done')
          .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      },

      getSubtaskCount: (taskId) => {
        const { tasks } = get();
        const directSubtasks = tasks.filter((t) => t.parentId === taskId);
        return {
          total: directSubtasks.length,
          completed: directSubtasks.filter((t) => t.status === 'done').length
        };
      }
    }),
    {
      name: 'adhd-task-storage'
    }
  )
);
