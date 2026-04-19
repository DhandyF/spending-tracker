import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

function addToast(message, type = 'error', duration = 4000) {
  const id = nextId++
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
  return id
}

function removeToast(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function success(message) {
  return addToast(message, 'success')
}

function error(message) {
  return addToast(message, 'error')
}

function info(message) {
  return addToast(message, 'info')
}

export function useToast() {
  return {
    toasts,
    success,
    error,
    info,
    removeToast,
  }
}