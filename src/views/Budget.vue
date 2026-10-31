<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useSpendingStore } from '@/stores/spending'
import { useToast } from '@/composables/useToast'
import { CATEGORIES } from '@/utils/constants'
import { formatCurrency, getMonthYear, normalizeYearMonth } from '@/utils/helpers'

const budgetStore = useBudgetStore()
const spendingStore = useSpendingStore()
const toast = useToast()

const showForm = ref(false)
const editingId = ref(null)
const syncingBudgetItem = ref(null)

const budgetPendingCount = computed(() => budgetStore.budgets.filter((b) => b._pending).length)
const form = ref({
  category: CATEGORIES[0],
  yearMonth: '',
  amount: '',
})

const categoryEmojis = {
  Food: '🍔',
  'Home Appliances': '🏠',
  Wife: '💖',
  Husband: '👔',
  Vath: '👶',
  Snack: '🍿',
  Sembako: '🍚',
  Hangout: '☕',
  Housemaid: '🧹',
  Transportation: '🚗',
  Emergency: '🚨',
  Other: '📦',
}

const currentMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

function getDefaultForm() {
  return {
    category: CATEGORIES[0],
    yearMonth: currentMonth.value,
    amount: '',
  }
}

function openAddForm() {
  form.value = getDefaultForm()
  editingId.value = null
  showForm.value = true
}

function openEditForm(budget) {
  form.value = {
    category: budget.category,
    yearMonth: budget.yearMonth,
    amount: budget.amount,
  }
  editingId.value = budget.id
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value = getDefaultForm()
}

function getBudgetSpent(budget) {
  return spendingStore.spendings
    .filter((s) => {
      const sYM = getMonthYear(s.date)
      return s.category === budget.category && sYM === normalizeYearMonth(budget.yearMonth)
    })
    .reduce((sum, s) => sum + Number(s.price), 0)
}

function getBudgetPercentage(budget) {
  const spent = getBudgetSpent(budget)
  const total = Number(budget.amount)
  if (total === 0) return 0
  return Math.min((spent / total) * 100, 100)
}

function getBarStyle(budget) {
  const pct = getBudgetPercentage(budget)
  if (pct >= 90) return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-200' }
  if (pct >= 70) return { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200' }
  return { bg: 'bg-gradient-to-r from-primary-500 to-purple-500', text: 'text-primary-600', border: 'border-primary-200' }
}

function getStatusLabel(budget) {
  const pct = getBudgetPercentage(budget)
  if (pct >= 100) return 'Over Budget'
  if (pct >= 90) return 'Almost Full'
  if (pct >= 70) return 'Warning'
  return 'On Track'
}

async function handleSubmit() {
  if (!form.value.amount || Number(form.value.amount) <= 0) {
    toast.error('Budget amount must be greater than 0')
    return
  }

  try {
    const data = {
      category: form.value.category,
      yearMonth: form.value.yearMonth,
      amount: Number(form.value.amount),
    }

    if (editingId.value) {
      await budgetStore.updateBudget({ id: editingId.value, ...data })
      toast.success('Budget updated!')
    } else {
      await budgetStore.addBudget(data)
      toast.success('Budget added!')
    }
    closeForm()
  } catch (e) {
    toast.error(e.message)
  }
}

async function handleDelete(id) {
  if (confirm('Are you sure you want to delete this budget?')) {
    await budgetStore.deleteBudget(id)
    toast.success('Budget deleted')
  }
}

async function handleSyncBudgetItem(id) {
  syncingBudgetItem.value = id
  const success = await budgetStore.syncItem(id)
  syncingBudgetItem.value = null
  if (success) {
    toast.success('Synced successfully!')
  } else {
    toast.error('Sync failed. Try again later.')
  }
}

async function handleSyncAllBudgets() {
  await budgetStore.syncAll()
  if (budgetStore.hasPending()) {
    toast.error('Some items failed to sync')
  } else {
    toast.success('All synced!')
  }
}

const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
})

const currentMonthBudgets = computed(() => {
  return budgetStore.budgets.filter((b) => normalizeYearMonth(b.yearMonth) === currentMonth.value)
})

const totalBudget = computed(() => {
  return currentMonthBudgets.value.reduce(
    (sum, b) => sum + Number(b.amount),
    0
  )
})

const totalSpent = computed(() => {
  return currentMonthBudgets.value.reduce(
    (sum, b) => sum + getBudgetSpent(b),
    0
  )
})

const totalPercentage = computed(() => {
  if (totalBudget.value === 0) return 0
  return Math.min((totalSpent.value / totalBudget.value) * 100, 100)
})

onMounted(() => {
  budgetStore.fetchBudgets().catch((e) => toast.error(e.message))
  spendingStore.fetchSpendings().catch((e) => toast.error(e.message))
})
</script>

<template>
  <div class="px-4 pt-6 pb-24 max-w-lg mx-auto slide-up">
    <div class="flex justify-between items-start mb-5">
      <div>
        <h1 class="page-header gradient-text mb-1">Budget</h1>
        <p class="text-sm text-gray-400">{{ monthLabel }}</p>
      </div>
      <button
        @click="openAddForm"
        class="btn-primary flex items-center gap-1.5 text-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Add Budget
      </button>
    </div>

    <Transition name="slide">
      <div
        v-if="showForm"
        class="glass-card p-5 mb-4 border-2 border-primary-200"
      >
        <h3 class="text-sm font-bold text-gray-700 mb-4">
          {{ editingId ? 'Edit Budget' : 'Add Budget' }}
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
            <select v-model="form.category" class="input-field bg-white">
              <option v-for="cat in CATEGORIES" :key="cat" :value="cat">
                {{ categoryEmojis[cat] || '' }} {{ cat }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Month</label>
            <input v-model="form.yearMonth" type="month" class="input-field" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Total Budget</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
              <input v-model="form.amount" type="number" min="0" placeholder="Budget amount" class="input-field pl-9" />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="handleSubmit" :disabled="budgetStore.loading" class="btn-primary flex-1 py-2.5 text-sm">
              {{ editingId ? 'Update' : 'Add Budget' }}
            </button>
            <button @click="closeForm" class="btn-ghost flex-1 py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="budgetPendingCount > 0" class="mb-4 glass-card border-2 border-amber-300 bg-amber-50/80 p-3.5">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-amber-700">{{ budgetPendingCount }} pending sync</span>
        </div>
        <button
          @click="handleSyncAllBudgets"
          :disabled="budgetStore.syncing"
          class="btn-primary text-xs py-1.5 px-3"
        >
          <span v-if="budgetStore.syncing" class="flex items-center gap-1">
            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing...
          </span>
          <span v-else>Sync All</span>
        </button>
      </div>
      <p class="text-xs text-amber-600">Some budgets haven't synced yet. Tap Sync All to retry.</p>
    </div>

    <div v-if="budgetStore.loading && budgetStore.budgets.length === 0" class="text-center py-12">
      <div class="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-400 text-sm">Loading...</p>
    </div>

    <div v-else-if="currentMonthBudgets.length > 0" class="space-y-4">
      <div class="gradient-header rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="text-white/70 text-xs font-semibold uppercase tracking-wider">{{ monthLabel }} Overview</div>
            <div class="text-2xl font-extrabold mt-0.5">{{ formatCurrency(totalSpent) }}</div>
          </div>
          <div class="text-right">
            <div class="text-white/70 text-xs font-semibold uppercase tracking-wider">Budget</div>
            <div class="text-2xl font-extrabold mt-0.5">{{ formatCurrency(totalBudget) }}</div>
          </div>
        </div>
        <div class="w-full bg-white/20 rounded-full h-2.5 mb-2">
          <div
            class="h-2.5 rounded-full bg-white transition-all duration-700"
            :style="{ width: totalPercentage + '%' }"
          ></div>
        </div>
        <div class="flex justify-between text-xs text-white/80">
          <span>{{ totalPercentage.toFixed(0) }}% used</span>
          <span>{{ formatCurrency(totalBudget - totalSpent) }} remaining</span>
        </div>
      </div>

      <div class="space-y-3">
        <div
          v-for="budget in currentMonthBudgets"
          :key="budget.id"
          class="glass-card glass-card-hover overflow-hidden"
          :class="{ 'ring-2 ring-amber-300': budget._pending }"
        >
          <div class="p-4">
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl">{{ categoryEmojis[budget.category] || '📦' }}</span>
                <div>
                  <div class="font-bold text-gray-800">{{ budget.category }}</div>
                  <div class="flex items-center gap-2">
                    <div class="text-xs text-gray-400">{{ monthLabel }}</div>
                    <span v-if="budget._pending" class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">pending</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button
                  v-if="budget._pending && budget._opType !== 'delete'"
                  @click="handleSyncBudgetItem(budget.id)"
                  :disabled="syncingBudgetItem === budget.id"
                  class="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors flex items-center gap-1"
                >
                  <svg v-if="syncingBudgetItem === budget.id" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span class="text-xs font-semibold">Sync</span>
                </button>
                <template v-if="!budget._pending || budget._opType === 'delete'">
                <button
                  @click="openEditForm(budget)"
                  class="p-1.5 rounded-lg hover:bg-primary-50 text-primary-500 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="handleDelete(budget.id)"
                  class="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                </template>
              </div>
            </div>

            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-gray-600">Spent <span class="font-semibold">{{ formatCurrency(getBudgetSpent(budget)) }}</span></span>
              <span class="text-gray-400">of <span class="font-semibold text-gray-600">{{ formatCurrency(Number(budget.amount)) }}</span></span>
            </div>

            <div class="w-full bg-gray-100 rounded-full h-3 mb-1.5">
              <div
                :class="getBarStyle(budget).bg"
                class="h-3 rounded-full transition-all duration-700"
                :style="{ width: getBudgetPercentage(budget) + '%' }"
              ></div>
            </div>

            <div class="flex justify-between items-center">
              <span
                class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :class="getBarStyle(budget).text + ' ' + getBarStyle(budget).border"
                style="background: rgba(108,92,231,0.06);"
              >
                {{ getStatusLabel(budget) }}
              </span>
              <span class="text-xs text-gray-400 font-medium">
                {{ formatCurrency(Number(budget.amount) - getBudgetSpent(budget)) }} left
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16">
      <div class="text-5xl mb-3">&#128176;</div>
      <p class="text-gray-400 text-sm mb-1">No budgets for this month</p>
      <p class="text-gray-300 text-xs">Tap "Add Budget" to create one</p>
    </div>

    <div v-if="budgetStore.budgets.length > 0 && currentMonthBudgets.length < budgetStore.budgets.length" class="mt-6">
      <h3 class="text-sm font-bold text-gray-600 mb-3">Other Months</h3>
      <div class="space-y-2">
        <div
          v-for="budget in budgetStore.budgets.filter((b) => normalizeYearMonth(b.yearMonth) !== currentMonth)"
          :key="budget.id"
          class="glass-card p-3 flex justify-between items-center"
        >
          <div class="flex items-center gap-2">
            <span>{{ categoryEmojis[budget.category] || '📦' }}</span>
            <div>
              <span class="text-sm font-semibold text-gray-800">{{ budget.category }}</span>
              <span class="text-xs text-gray-400 ml-1.5">({{ normalizeYearMonth(budget.yearMonth) }})</span>
            </div>
          </div>
          <span class="text-sm font-bold text-gray-700">{{ formatCurrency(Number(budget.amount)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active {
  transition: all 0.3s ease-out;
}
.slide-leave-active {
  transition: all 0.2s ease-in;
}
.slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>