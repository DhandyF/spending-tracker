import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getBudgets,
  addBudget as apiAdd,
  updateBudget as apiUpdate,
  deleteBudget as apiDelete,
} from '@/utils/api'
import { generateId } from '@/utils/helpers'
import { normalizeYearMonth } from '@/utils/helpers'

export const useBudgetStore = defineStore('budget', () => {
  const budgets = ref([])
  const loading = ref(false)
  const syncing = ref(false)

  async function fetchBudgets() {
    loading.value = true
    try {
      const result = await getBudgets()
      const serverData = result.data.map((b) => ({ ...b, _pending: false, _opType: null }))
      const localOnly = budgets.value.filter((b) => b._pending)
      budgets.value = [...localOnly, ...serverData]
    } catch (e) {
      // use cached data from localStorage
    } finally {
      loading.value = false
      _persist()
    }
  }

  async function addBudget(budgetData) {
    const id = generateId()
    const budgetWithId = { ...budgetData, id, _pending: true, _opType: 'add' }
    budgets.value.push(budgetWithId)
    _persist()

    try {
      const result = await apiAdd(budgetData)
      const idx = budgets.value.findIndex((b) => b.id === id)
      if (idx !== -1) {
        budgets.value[idx] = { ...result.data, _pending: false, _opType: null }
      }
    } catch (e) {
      const idx = budgets.value.findIndex((b) => b.id === id)
      if (idx !== -1) {
        budgets.value[idx]._pending = true
        budgets.value[idx]._opType = 'add'
        budgets.value[idx]._error = e.message
      }
    }
    _persist()
  }

  async function updateBudget(budgetData) {
    const idx = budgets.value.findIndex((b) => b.id === budgetData.id)

    if (idx !== -1) {
      budgets.value[idx] = { ...budgetData, _pending: true, _opType: 'update' }
    }
    _persist()

    try {
      await apiUpdate(budgetData)
      if (idx !== -1) {
        budgets.value[idx]._pending = false
        budgets.value[idx]._opType = null
        delete budgets.value[idx]._error
      }
    } catch (e) {
      if (idx !== -1) {
        budgets.value[idx]._pending = true
        budgets.value[idx]._opType = 'update'
        budgets.value[idx]._error = e.message
      }
    }
    _persist()
  }

  async function deleteBudget(id) {
    const item = budgets.value.find((b) => b.id === id)
    const yearMonth = item ? normalizeYearMonth(item.yearMonth) : null
    budgets.value = budgets.value.filter((b) => b.id !== id)
    _persist()

    try {
      await apiDelete(id, yearMonth)
    } catch (e) {
      if (item) {
        budgets.value.push({ ...item, _pending: true, _opType: 'delete', _error: e.message })
        _persist()
      }
    }
  }

  async function syncItem(id) {
    const item = budgets.value.find((b) => b.id === id)
    if (!item) return false

    if (item._opType === 'add') {
      try {
        const result = await apiAdd({ category: item.category, yearMonth: normalizeYearMonth(item.yearMonth), amount: item.amount })
        const idx = budgets.value.findIndex((b) => b.id === id)
        if (idx !== -1) {
          budgets.value[idx] = { ...result.data, _pending: false, _opType: null }
        }
        _persist()
        return true
      } catch (e) {
        return false
      }
    }

    if (item._opType === 'update') {
      try {
        await apiUpdate({ id: item.id, category: item.category, yearMonth: normalizeYearMonth(item.yearMonth), amount: item.amount })
        const idx = budgets.value.findIndex((b) => b.id === id)
        if (idx !== -1) {
          budgets.value[idx]._pending = false
          budgets.value[idx]._opType = null
          delete budgets.value[idx]._error
        }
        _persist()
        return true
      } catch (e) {
        return false
      }
    }

    if (item._opType === 'delete') {
      try {
        await apiDelete(id, normalizeYearMonth(item.yearMonth))
        budgets.value = budgets.value.filter((b) => b.id !== id)
        _persist()
        return true
      } catch (e) {
        return false
      }
    }

    return true
  }

  async function syncAll() {
    syncing.value = true
    const pendingItems = budgets.value.filter((b) => b._pending)
    for (const item of pendingItems) {
      await syncItem(item.id)
    }
    syncing.value = false
  }

  function hasPending() {
    return budgets.value.some((b) => b._pending && b._opType !== 'delete')
  }

  function _persist() {
    try {
      localStorage.setItem('spending_tracker_budgets', JSON.stringify(budgets.value))
    } catch (e) { /* ignore */ }
  }

  function _restore() {
    try {
      const saved = localStorage.getItem('spending_tracker_budgets')
      if (saved) {
        budgets.value = JSON.parse(saved)
      }
    } catch (e) { /* ignore */ }
  }

  _restore()

  return {
    budgets,
    loading,
    syncing,
    fetchBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
    syncItem,
    syncAll,
    hasPending,
  }
})