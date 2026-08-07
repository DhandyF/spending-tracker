<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSpendingStore } from '@/stores/spending'
import { useToast } from '@/composables/useToast'
import { CATEGORIES } from '@/utils/constants'
import { formatCurrency, getMonthYear, getMonthStartString, getMonthEndString } from '@/utils/helpers'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
)

const spendingStore = useSpendingStore()
const toast = useToast()

const filterDateFrom = ref(getMonthStartString())
const filterDateTo = ref(getMonthEndString())

const chartType = ref('category')

const COLORS = [
  '#6c5ce7',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
]

const categoryEmojis = {
  Food: '🍔',
  'Home Appliances': '🏠',
  Wife: '💖',
  Husband: '👔',
  Vath: '🙏',
  Snack: '🍿',
  Other: '📦',
}

const filteredSpendings = computed(() => {
  let list = [...spendingStore.spendings]
  if (filterDateFrom.value) {
    list = list.filter((s) => s.date >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    list = list.filter((s) => s.date <= filterDateTo.value)
  }
  return list
})

const categoryData = computed(() => {
  const map = {}
  filteredSpendings.value.forEach((s) => {
    map[s.category] = (map[s.category] || 0) + Number(s.price)
  })
  const labels = Object.keys(map)
  const data = Object.values(map)
  return {
    labels: labels.map((l) => `${categoryEmojis[l] || ''} ${l}`),
    datasets: [
      {
        data,
        backgroundColor: COLORS.slice(0, labels.length),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      },
    ],
  }
})

const nameData = computed(() => {
  const map = {}
  filteredSpendings.value.forEach((s) => {
    map[s.name] = (map[s.name] || 0) + Number(s.price)
  })
  const labels = Object.keys(map)
  const data = Object.values(map)
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: COLORS.slice(0, labels.length),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      },
    ],
  }
})

const paymentData = computed(() => {
  const map = {}
  filteredSpendings.value.forEach((s) => {
    map[s.paymentMethod] = (map[s.paymentMethod] || 0) + Number(s.price)
  })
  const labels = Object.keys(map)
  const data = Object.values(map)
  return {
    labels,
    datasets: [
      {
        data,
        backgroundColor: COLORS.slice(0, labels.length),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#fff',
      },
    ],
  }
})

const monthlyData = computed(() => {
  const map = {}
  filteredSpendings.value.forEach((s) => {
    const ym = getMonthYear(s.date)
    map[ym] = (map[ym] || 0) + Number(s.price)
  })
  const sortedKeys = Object.keys(map).sort()
  const labels = sortedKeys
  const data = sortedKeys.map((k) => map[k])
  return {
    labels,
    datasets: [
      {
        label: 'Spending',
        data,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
          gradient.addColorStop(0, 'rgba(108, 92, 231, 0.8)')
          gradient.addColorStop(1, 'rgba(168, 85, 247, 0.4)')
          return gradient
        },
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  }
})

const activeData = computed(() => {
  if (chartType.value === 'category') return categoryData.value
  if (chartType.value === 'name') return nameData.value
  if (chartType.value === 'payment') return paymentData.value
  return categoryData.value
})

const topCategory = computed(() => {
  const map = {}
  filteredSpendings.value.forEach((s) => {
    map[s.category] = (map[s.category] || 0) + Number(s.price)
  })
  const entries = Object.entries(map)
  if (entries.length === 0) return null
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))
})

const totalSpent = computed(() => {
  return filteredSpendings.value.reduce(
    (sum, s) => sum + Number(s.price),
    0
  )
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        padding: 12,
        font: { size: 11, weight: '500' },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 10, 42, 0.9)',
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${formatCurrency(ctx.raw)}`,
      },
    },
  },
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 10, 42, 0.9)',
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => ` ${formatCurrency(ctx.raw)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(108, 92, 231, 0.06)',
      },
      ticks: {
        callback: (value) =>
          value >= 1000000
            ? (value / 1000000).toFixed(1) + 'M'
            : value >= 1000
              ? (value / 1000).toFixed(0) + 'K'
              : value,
        font: { size: 10 },
        color: '#9ca3af',
      },
    },
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 10 },
        color: '#9ca3af',
      },
    },
  },
}

onMounted(() => {
  spendingStore.fetchSpendings().catch((e) => toast.error(e.message))
})
</script>

<template>
  <div class="px-4 pt-6 pb-24 max-w-lg mx-auto slide-up">
    <h1 class="page-header gradient-text mb-1">Statistics</h1>
    <p class="text-sm text-gray-400 mb-5">Visualize your spending habits</p>

    <div class="glass-card p-4 mb-4 space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</label>
          <input v-model="filterDateFrom" type="date" class="input-field text-sm" />
        </div>
        <div>
          <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To</label>
          <input v-model="filterDateTo" type="date" class="input-field text-sm" />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          v-for="type in [
            { value: 'category', label: 'Category' },
            { value: 'name', label: 'Name' },
            { value: 'payment', label: 'Payment' },
          ]"
          :key="type.value"
          @click="chartType = type.value"
          class="px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200"
          :class="
            chartType === type.value
              ? 'gradient-header text-white shadow-md shadow-primary-500/25'
              : 'bg-white/70 text-gray-500 hover:bg-white'
          "
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <div v-if="spendingStore.loading" class="text-center py-12">
      <div class="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-400 text-sm">Loading...</p>
    </div>

    <div v-else-if="filteredSpendings.length === 0" class="text-center py-16">
      <div class="text-5xl mb-3">&#128202;</div>
      <p class="text-gray-400 text-sm">No data to display</p>
    </div>

    <div v-else class="space-y-4 fade-in">
      <div class="gradient-header rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20">
        <div class="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Total Spent</div>
        <div class="text-3xl font-extrabold mb-1">{{ formatCurrency(totalSpent) }}</div>
        <div class="flex items-center gap-4 text-white/80 text-sm">
          <span>{{ filteredSpendings.length }} transactions</span>
          <span v-if="topCategory">
            Top: {{ categoryEmojis[topCategory[0]] || '' }} {{ topCategory[0] }}
          </span>
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="text-sm font-bold text-gray-700 mb-4">
          Spending by {{ chartType === 'category' ? 'Category' : chartType === 'name' ? 'Name' : 'Payment Method' }}
        </h3>
        <Doughnut :data="activeData" :options="chartOptions" />
      </div>

      <div class="glass-card p-5">
        <h3 class="text-sm font-bold text-gray-700 mb-4">Monthly Spending</h3>
        <Bar :data="monthlyData" :options="barOptions" />
      </div>
    </div>
  </div>
</template>