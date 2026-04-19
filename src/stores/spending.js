import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getSpendings,
  addSpending as apiAdd,
  updateSpending as apiUpdate,
  deleteSpending as apiDelete,
} from '@/utils/api'

export const useSpendingStore = defineStore('spending', () => {
  const spendings = ref([])
  const loading = ref(false)

  async function fetchSpendings() {
    loading.value = true
    try {
      const result = await getSpendings()
      spendings.value = result.data
    } finally {
      loading.value = false
    }
  }

  async function addSpending(spending) {
    loading.value = true
    try {
      await apiAdd(spending)
      await fetchSpendings()
    } catch (e) {
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateSpending(spending) {
    loading.value = true
    try {
      await apiUpdate(spending)
      await fetchSpendings()
    } catch (e) {
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteSpending(id) {
    loading.value = true
    try {
      await apiDelete(id)
      await fetchSpendings()
    } catch (e) {
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    spendings,
    loading,
    fetchSpendings,
    addSpending,
    updateSpending,
    deleteSpending,
  }
})