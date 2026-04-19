import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getBudgets,
  addBudget as apiAdd,
  updateBudget as apiUpdate,
  deleteBudget as apiDelete,
} from '@/utils/api'

export const useBudgetStore = defineStore('budget', () => {
  const budgets = ref([])
  const loading = ref(false)

  async function fetchBudgets() {
    loading.value = true
    try {
      const result = await getBudgets()
      budgets.value = result.data
    } finally {
      loading.value = false
    }
  }

  async function addBudget(budget) {
    loading.value = true
    try {
      await apiAdd(budget)
      await fetchBudgets()
    } catch (e) {
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateBudget(budget) {
    loading.value = true
    try {
      await apiUpdate(budget)
      await fetchBudgets()
    } catch (e) {
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteBudget(id) {
    loading.value = true
    try {
      await apiDelete(id)
      await fetchBudgets()
    } catch (e) {
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    budgets,
    loading,
    fetchBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
  }
})