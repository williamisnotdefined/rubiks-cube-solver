import { create } from 'zustand'

export type ToastTone = 'error' | 'neutral' | 'success'

export type AppToast = {
  description?: string
  id: string
  title: string
  tone: ToastTone
}

type ShowToastOptions = {
  description?: string
  title: string
  tone?: ToastTone
}

type ToastState = {
  clearToasts: () => void
  dismissToast: (id: string) => void
  showToast: (toast: ShowToastOptions) => void
  toasts: AppToast[]
}

const toastLimit = 4

export const useToastStore = create<ToastState>((set) => ({
  clearToasts: () => set({ toasts: [] }),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  showToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: createToastId(),
          tone: toast.tone ?? 'neutral',
          title: toast.title,
          description: toast.description,
        },
      ].slice(-toastLimit),
    })),
  toasts: [],
}))

export function useToast() {
  return useToastStore((state) => state.showToast)
}

function createToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
