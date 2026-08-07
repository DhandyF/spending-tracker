const API_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ''

async function apiCall(action, data = {}) {
  if (!API_URL) {
    throw new Error('VITE_GOOGLE_APPS_SCRIPT_URL is not set in .env')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...data }),
  })

  const result = await response.json()
  if (result.error) {
    throw new Error(result.error)
  }
  return result
}

export async function getSpendings() {
  return apiCall('getSpendings')
}

export async function addSpending(spending) {
  return apiCall('addSpending', { spending })
}

export async function updateSpending(spending) {
  return apiCall('updateSpending', { spending })
}

export async function deleteSpending(id, yearMonth) {
  return apiCall('deleteSpending', { id, yearMonth })
}

export async function getBudgets() {
  return apiCall('getBudgets')
}

export async function addBudget(budget) {
  return apiCall('addBudget', { budget })
}

export async function updateBudget(budget) {
  return apiCall('updateBudget', { budget })
}

export async function deleteBudget(id, yearMonth) {
  return apiCall('deleteBudget', { id, yearMonth })
}