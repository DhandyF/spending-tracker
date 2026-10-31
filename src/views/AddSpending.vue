<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSpendingStore } from '@/stores/spending'
import { useBudgetStore } from '@/stores/budget'
import { useToast } from '@/composables/useToast'
import { NAMES, CATEGORIES, PAYMENT_METHODS } from '@/utils/constants'
import { getTodayString, formatCurrency, normalizeYearMonth, getMonthYear } from '@/utils/helpers'

const spendingStore = useSpendingStore()
const budgetStore = useBudgetStore()
const toast = useToast()

const form = ref({
  date: getTodayString(),
  name: NAMES[0],
  category: CATEGORIES[0],
  paymentMethod: PAYMENT_METHODS[0],
  description: '',
  price: '',
})

const currentBudgetInfo = ref(null)

const categoryEmojis = {
  Food: '🍔',
  'Home Appliances': '🏠',
  Wife: '💖',
  Husband: '👔',
  Vath: '👶',
  Snack: '🍿',
  Sembako: '🍚',
  Hangout: '☕',
  Transportation: '🚗',
  Emergency: '🚨',
  Other: '📦',
}

const currentMonth = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
})

const monthLabel = computed(() => {
  const [y, m] = currentMonth.value.split('-')
  return new Date(y, m - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
})

const currentMonthBudgets = computed(() => {
  return budgetStore.budgets.filter((b) => normalizeYearMonth(b.yearMonth) === currentMonth.value)
})

function getSpentForCategory(category) {
  return spendingStore.spendings
    .filter((s) => {
      return s.category === category && getMonthYear(s.date) === currentMonth.value
    })
    .reduce((sum, s) => sum + Number(s.price), 0)
}

function getBudgetPercentage(budget) {
  const spent = getSpentForCategory(budget.category)
  const total = Number(budget.amount)
  if (total === 0) return 0
  return Math.min((spent / total) * 100, 100)
}

function getBarColor(budget) {
  const pct = getBudgetPercentage(budget)
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-gradient-to-r from-primary-500 to-purple-500'
}

const totalBudget = computed(() =>
  currentMonthBudgets.value.reduce((sum, b) => sum + Number(b.amount), 0)
)

const totalSpent = computed(() =>
  currentMonthBudgets.value.reduce((sum, b) => sum + getSpentForCategory(b.category), 0)
)

const totalPercentage = computed(() => {
  if (totalBudget.value === 0) return 0
  return Math.min((totalSpent.value / totalBudget.value) * 100, 100)
})

function getBudgetForCategory(category) {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const budget = budgetStore.budgets.find(
    (b) => b.category === category && normalizeYearMonth(b.yearMonth) === yearMonth
  )
  if (!budget) return null

  const spent = spendingStore.spendings
    .filter((s) => {
      const sDate = new Date(s.date)
      const sYearMonth = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`
      return s.category === category && sYearMonth === yearMonth
    })
    .reduce((sum, s) => sum + Number(s.price), 0)

  return {
    budget: Number(budget.amount),
    spent,
    remaining: Number(budget.amount) - spent,
    percentage: Number(budget.amount) > 0 ? Math.min((spent / Number(budget.amount)) * 100, 100) : 0,
  }
}

function updateBudgetInfo() {
  if (form.value.category) {
    currentBudgetInfo.value = getBudgetForCategory(form.value.category)
  } else {
    currentBudgetInfo.value = null
  }
}

async function handleSubmit() {
  if (!form.value.price || Number(form.value.price) <= 0) {
    toast.error('Price must be greater than 0')
    return
  }

  try {
    await spendingStore.addSpending({
      ...form.value,
      price: Number(form.value.price),
    })
    toast.success('Spending added successfully!')

    form.value.description = ''
    form.value.price = ''

    updateBudgetInfo()
  } catch (e) {
    toast.error(e.message)
  }
}

watch(() => form.value.category, updateBudgetInfo)

onMounted(() => {
  spendingStore.fetchSpendings().catch((e) => toast.error(e.message))
  budgetStore.fetchBudgets().catch((e) => toast.error(e.message))
})
</script>

<template>
  <div class="px-4 pt-6 pb-24 max-w-lg mx-auto slide-up">
    <h1 class="page-header gradient-text mb-1">Add Spending</h1>
    <p class="text-sm text-gray-400 mb-5">Track your daily expenses</p>

    <div v-if="currentMonthBudgets.length > 0" class="glass-card p-4 mb-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ monthLabel }} Budget</div>
        <div class="text-xs font-semibold" :class="totalSpent > totalBudget ? 'text-red-500' : 'text-primary-500'">
          {{ formatCurrency(totalSpent) }} / {{ formatCurrency(totalBudget) }}
        </div>
      </div>

      <div class="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          class="h-2 rounded-full transition-all duration-700"
          :class="totalPercentage >= 90 ? 'bg-red-500' : totalPercentage >= 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'"
          :style="{ width: totalPercentage + '%' }"
        ></div>
      </div>

      <div class="space-y-2.5">
        <div v-for="budget in currentMonthBudgets" :key="budget.id">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <span class="text-sm">{{ categoryEmojis[budget.category] || '📦' }}</span>
              <span class="text-xs font-semibold text-gray-700">{{ budget.category }}</span>
            </div>
            <span class="text-[11px] text-gray-400">
              {{ formatCurrency(getSpentForCategory(budget.category)) }} / {{ formatCurrency(Number(budget.amount)) }}
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-1.5">
            <div
              :class="getBarColor(budget)"
              class="h-1.5 rounded-full transition-all duration-500"
              :style="{ width: getBudgetPercentage(budget) + '%' }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="glass-card p-4 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</label>
            <input v-model="form.date" type="date" class="input-field" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-pink-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Who Spent</label>
            <select v-model="form.name" class="input-field bg-white">
              <option v-for="n in NAMES" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 text-lg">
            {{ categoryEmojis[form.category] || '📦' }}
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
            <select v-model="form.category" class="input-field bg-white">
              <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
        </div>

        <div
          v-if="currentBudgetInfo"
          class="p-3.5 rounded-xl"
          :class="currentBudgetInfo.remaining < 0 ? 'bg-red-50 border border-red-200' : 'bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200'"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold uppercase tracking-wider"
              :class="currentBudgetInfo.remaining < 0 ? 'text-red-600' : 'text-primary-600'"
            >Budget Tracker</span>
            <span class="text-xs font-semibold"
              :class="currentBudgetInfo.remaining < 0 ? 'text-red-500' : 'text-primary-500'"
            >{{ currentBudgetInfo.percentage.toFixed(0) }}%</span>
          </div>
          <div class="w-full bg-white/80 rounded-full h-2 mb-2">
            <div
              class="h-2 rounded-full transition-all duration-500"
              :class="currentBudgetInfo.remaining < 0 ? 'bg-red-500' : currentBudgetInfo.percentage >= 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-primary-500 to-purple-500'"
              :style="{ width: currentBudgetInfo.percentage + '%' }"
            ></div>
          </div>
          <div class="flex justify-between text-xs">
            <span :class="currentBudgetInfo.remaining < 0 ? 'text-red-600' : 'text-gray-600'">
              Spent {{ formatCurrency(currentBudgetInfo.spent) }}
            </span>
            <span class="font-semibold"
              :class="currentBudgetInfo.remaining < 0 ? 'text-red-600' : 'text-primary-600'"
            >
              {{ formatCurrency(currentBudgetInfo.remaining) }} left
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Method</label>
            <select v-model="form.paymentMethod" class="input-field bg-white">
              <option v-for="method in PAYMENT_METHODS" :key="method" :value="method">{{ method }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="glass-card p-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
          <input
            v-model="form.description"
            type="text"
            placeholder="What did you buy?"
            class="input-field"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Price</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">Rp</span>
            <input
              v-model="form.price"
              type="number"
              min="0"
              placeholder="0"
              class="input-field pl-9"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        :disabled="spendingStore.loading"
        class="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
      >
        <svg v-if="spendingStore.loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span v-if="!spendingStore.loading">&#43;</span>
        {{ spendingStore.loading ? 'Adding...' : 'Add Spending' }}
      </button>
    </form>
  </div>
</template>