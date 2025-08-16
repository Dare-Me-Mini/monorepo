import toast from 'react-hot-toast'

// Global toast manager to prevent duplicate toasts
class ToastManager {
  private activeToasts = new Set<string>()
  private lastToastTime = new Map<string, number>()
  private readonly DEBOUNCE_TIME = 1000 // 1 second

  private getToastKey(message: string, type: string): string {
    return `${type}:${message}`
  }

  private shouldShowToast(key: string): boolean {
    const now = Date.now()
    const lastTime = this.lastToastTime.get(key) || 0
    
    // Prevent showing the same toast within debounce time
    if (now - lastTime < this.DEBOUNCE_TIME) {
      return false
    }
    
    this.lastToastTime.set(key, now)
    return true
  }

  success(message: string, options?: any) {
    const key = this.getToastKey(message, 'success')
    if (this.shouldShowToast(key)) {
      return toast.success(message, options)
    }
  }

  error(message: string, options?: any) {
    try {
      const key = this.getToastKey(message, 'error')
      if (this.shouldShowToast(key)) {
        return toast.error(message, options)
      }
    } catch (err) {
      console.error('Toast manager error:', err)
    }
  }

  loading(message: string, options?: any) {
    const key = this.getToastKey(message, 'loading')
    if (this.shouldShowToast(key)) {
      return toast.loading(message, options)
    }
  }

  // Direct access to toast for cases where we want to update existing toasts
  get raw() {
    return toast
  }
}

export const managedToast = new ToastManager()
