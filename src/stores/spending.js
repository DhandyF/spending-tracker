import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getSpendings,
  addSpending as apiAdd,
  updateSpending as apiUpdate,
  deleteSpending as apiDelete,
} from '@/utils/api'
import { generateId, getMonthYear } from '@/utils/helpers'

export const useSpendingStore = defineStore('spending', () => {
  const spendings = ref([])
  const loading = ref(false)
  const syncing = ref(false)

  function addLocalSpending(data) {
    const id = generateId()
    const spending = { ...data, id, _pending: true, _opType: 'add' }
    spendings.value.unshift(spending)
    _persist()
    return spending
  }

  function removeLocalSpending(id) {
    spendings.value = spendings.value.filter((s) => s.id !== id)
  }

  async function fetchSpendings() {
    loading.value = true
    try {
      const result = await getSpendings()
      const serverData = result.data.map((s) => ({ ...s, _pending: false, _opType: null }))
      const localOnly = spendings.value.filter((s) => s._pending)
      spendings.value = [...localOnly, ...serverData]
    } catch (e) {
      // use cached data from localStorage
    } finally {
      loading.value = false
      _persist()
    }
  }

  async function addSpending(spendingData) {
    const localItem = addLocalSpending(spendingData)

    try {
      const result = await apiAdd(spendingData)
      const idx = spendings.value.findIndex((s) => s.id === localItem.id)
      if (idx !== -1) {
        spendings.value[idx] = { ...result.data, _pending: false, _opType: null }
      }
    } catch (e) {
      const idx = spendings.value.findIndex((s) => s.id === localItem.id)
      if (idx !== -1) {
        spendings.value[idx]._pending = true
        spendings.value[idx]._opType = 'add'
        spendings.value[idx]._error = e.message
      }
    }
    _persist()
  }

  async function updateSpending(spendingData) {
    const idx = spendings.value.findIndex((s) => s.id === spendingData.id)
    const original = idx !== -1 ? { ...spendings.value[idx] } : null

    if (idx !== -1) {
      spendings.value[idx] = { ...spendingData, _pending: true, _opType: 'update' }
    }
    _persist()

    try {
      await apiUpdate(spendingData)
      if (idx !== -1) {
        spendings.value[idx]._pending = false
        spendings.value[idx]._opType = null
        delete spendings.value[idx]._error
      }
    } catch (e) {
      if (idx !== -1) {
        spendings.value[idx]._pending = true
        spendings.value[idx]._opType = 'update'
        spendings.value[idx]._error = e.message
      }
    }
    _persist()
  }

  async function deleteSpending(id) {
    const item = spendings.value.find((s) => s.id === id)
    const yearMonth = item ? getMonthYear(item.date) : null
    removeLocalSpending(id)
    _persist()

    try {
      await apiDelete(id, yearMonth)
    } catch (e) {
      if (item) {
        spendings.value.push({ ...item, _pending: true, _opType: 'delete', _error: e.message })
        _persist()
      }
    }
  }

  async function syncItem(id) {
    const item = spendings.value.find((s) => s.id === id)
    if (!item) return false

    if (item._opType === 'add') {
      try {
        const result = await apiAdd({ date: item.date, name: item.name, category: item.category, paymentMethod: item.paymentMethod, description: item.description, price: item.price })
        const idx = spendings.value.findIndex((s) => s.id === id)
        if (idx !== -1) {
          spendings.value[idx] = { ...result.data, _pending: false, _opType: null }
        }
        _persist()
        return true
      } catch (e) {
        return false
      }
    }

    if (item._opType === 'update') {
      try {
        await apiUpdate({ id: item.id, date: item.date, name: item.name, category: item.category, paymentMethod: item.paymentMethod, description: item.description, price: item.price })
        const idx = spendings.value.findIndex((s) => s.id === id)
        if (idx !== -1) {
          spendings.value[idx]._pending = false
          spendings.value[idx]._opType = null
          delete spendings.value[idx]._error
        }
        _persist()
        return true
      } catch (e) {
        return false
      }
    }

    if (item._opType === 'delete') {
      try {
        await apiDelete(id, getMonthYear(item.date))
        spendings.value = spendings.value.filter((s) => s.id !== id)
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
    const pendingItems = spendings.value.filter((s) => s._pending)
    for (const item of pendingItems) {
      await syncItem(item.id)
    }
    syncing.value = false
  }

  function hasPending() {
    return spendings.value.some((s) => s._pending && s._opType !== 'delete')
  }

  function getPendingCount() {
    return spendings.value.filter((s) => s._pending).length
  }

  function _persist() {
    try {
      localStorage.setItem('spending_tracker_spendings', JSON.stringify(spendings.value))
    } catch (e) { /* ignore */ }
  }

  function _restore() {
    try {
      const saved = localStorage.getItem('spending_tracker_spendings')
      if (saved) {
        spendings.value = JSON.parse(saved)
      }
    } catch (e) { /* ignore */ }
  }

  _restore()

  return {
    spendings,
    loading,
    syncing,
    fetchSpendings,
    addSpending,
    updateSpending,
    deleteSpending,
    syncItem,
    syncAll,
    hasPending,
    getPendingCount,
  }
})