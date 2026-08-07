<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSpendingStore } from '@/stores/spending'
import { useToast } from '@/composables/useToast'
import { CATEGORIES, PAYMENT_METHODS, NAMES } from '@/utils/constants'
import { formatDate, formatCurrency, getMonthStartString, getMonthEndString } from '@/utils/helpers'

const spendingStore = useSpendingStore()
const toast = useToast()

const search = ref('')
const filterDateFrom = ref(getMonthStartString())
const filterDateTo = ref(getMonthEndString())
const filterName = ref('')
const filterCategory = ref('')
const filterPayment = ref('')
const editingId = ref(null)
const editForm = ref({})
const syncingItem = ref(null)

const categoryEmojis = {
  Food: '🍔',
  'Home Appliances': '🏠',
  Wife: '💖',
  Husband: '👔',
  Vath: '🙏',
  Snack: '🍿',
  Other: '📦',
}

const categoryColors = {
  Food: 'badge-pink',
  'Home Appliances': 'badge-blue',
  Wife: 'badge-purple',
  Husband: 'badge-amber',
  Vath: 'badge-green',
  Snack: 'badge-pink',
  Other: 'badge-blue',
}

const hasActiveFilters = computed(() => {
  return !!(search.value || filterDateFrom.value || filterDateTo.value || filterName.value || filterCategory.value || filterPayment.value)
})

const totalAllSpendings = computed(() => {
  return spendingStore.spendings.reduce((sum, s) => sum + Number(s.price), 0)
})

const allSpendingsCount = computed(() => {
  return spendingStore.spendings.length
})

const totalByName = computed(() => {
  const map = {}
  spendingStore.spendings.forEach((s) => {
    map[s.name] = (map[s.name] || 0) + Number(s.price)
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
})

const totalByCategory = computed(() => {
  const map = {}
  spendingStore.spendings.forEach((s) => {
    map[s.category] = (map[s.category] || 0) + Number(s.price)
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
})

const totalByPayment = computed(() => {
  const map = {}
  spendingStore.spendings.forEach((s) => {
    map[s.paymentMethod] = (map[s.paymentMethod] || 0) + Number(s.price)
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
})

const pendingCount = computed(() => spendingStore.getPendingCount())

const filteredSpendings = computed(() => {
  let list = [...spendingStore.spendings]

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (s) =>
        s.description?.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q)
    )
  }

  if (filterDateFrom.value) {
    list = list.filter((s) => s.date >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    list = list.filter((s) => s.date <= filterDateTo.value)
  }
  if (filterName.value) {
    list = list.filter((s) => s.name === filterName.value)
  }
  if (filterCategory.value) {
    list = list.filter((s) => s.category === filterCategory.value)
  }
  if (filterPayment.value) {
    list = list.filter((s) => s.paymentMethod === filterPayment.value)
  }

  list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))

  return list
})

const totalFiltered = computed(() => {
  return filteredSpendings.value.reduce((sum, s) => sum + Number(s.price), 0)
})

function startEdit(spending) {
  editingId.value = spending.id
  editForm.value = { ...spending }
}

function cancelEdit() {
  editingId.value = null
  editForm.value = {}
}

async function saveEdit() {
  try {
    await spendingStore.updateSpending({
      ...editForm.value,
      price: Number(editForm.value.price),
    })
    toast.success('Spending updated!')
    editingId.value = null
    editForm.value = {}
  } catch (e) {
    toast.error(e.message)
  }
}

async function handleDelete(id) {
  if (confirm('Are you sure you want to delete this spending?')) {
    try {
      await spendingStore.deleteSpending(id)
      toast.success('Spending deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }
}

async function handleSyncItem(id) {
  syncingItem.value = id
  const success = await spendingStore.syncItem(id)
  if (success) {
    toast.success('Synced successfully!')
  } else {
    toast.error('Sync failed. Try again later.')
  }
  syncingItem.value = null
}

async function handleSyncAll() {
  await spendingStore.syncAll()
  if (spendingStore.getPendingCount() === 0) {
    toast.success('All synced!')
  } else {
    toast.error('Some items failed to sync')
  }
}

function clearFilters() {
  search.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterName.value = ''
  filterCategory.value = ''
  filterPayment.value = ''
}

onMounted(() => {
  spendingStore.fetchSpendings()
})
</script>

<template>
  <div class="px-4 pt-6 pb-24 max-w-lg mx-auto slide-up">
    <h1 class="page-header gradient-text mb-1">History</h1>
    <p class="text-sm text-gray-400 mb-5">Review all your spending</p>

    <div v-if="pendingCount > 0" class="mb-4 glass-card border-2 border-amber-300 bg-amber-50/80 p-3.5">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold text-amber-700">{{ pendingCount }} pending sync</span>
        </div>
        <button
          @click="handleSyncAll"
          :disabled="spendingStore.syncing"
          class="btn-primary text-xs py-1.5 px-3"
        >
          <span v-if="spendingStore.syncing" class="flex items-center gap-1">
            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Syncing...
          </span>
          <span v-else>Sync All</span>
        </button>
      </div>
      <p class="text-xs text-amber-600">Some changes haven't synced to the cloud. Tap Sync All to retry.</p>
    </div>

    <div class="gradient-header rounded-2xl p-5 text-white shadow-lg shadow-primary-500/20 mb-4">
      <div class="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">All-Time Total</div>
      <div class="text-3xl font-extrabold mb-3">{{ formatCurrency(totalAllSpendings) }}</div>
      <div class="text-xs text-white/60 mb-3">{{ allSpendingsCount }} transactions</div>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="([name, total]) in totalByName" :key="name" class="bg-white/15 rounded-xl px-3 py-2">
          <div class="text-[10px] text-white/60 uppercase tracking-wider">{{ name }}</div>
          <div class="text-sm font-bold">{{ formatCurrency(total) }}</div>
        </div>
      </div>
      <div class="mt-3 pt-3 border-t border-white/20">
        <div class="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">By Category</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="([cat, total]) in totalByCategory" :key="cat" class="bg-white/15 rounded-md px-2 py-0.5 text-[11px] font-medium">
            {{ categoryEmojis[cat] || '📦' }} {{ cat }}: {{ formatCurrency(total) }}
          </span>
        </div>
      </div>
      <div class="mt-2">
        <div class="text-[10px] text-white/50 uppercase tracking-wider mb-1.5">By Payment</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="([method, total]) in totalByPayment" :key="method" class="bg-white/15 rounded-md px-2 py-0.5 text-[11px] font-medium">
            {{ method }}: {{ formatCurrency(total) }}
          </span>
        </div>
      </div>
    </div>

    <div class="glass-card p-4 mb-4 space-y-3">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search spendings..."
          class="input-field pl-10"
        />
      </div>

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

      <div class="grid grid-cols-3 gap-2">
        <select v-model="filterName" class="input-field text-sm bg-white">
          <option value="">All Names</option>
          <option v-for="n in NAMES" :key="n" :value="n">{{ n }}</option>
        </select>
        <select v-model="filterCategory" class="input-field text-sm bg-white">
          <option value="">All Cats</option>
          <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select v-model="filterPayment" class="input-field text-sm bg-white">
          <option value="">All Pay</option>
          <option v-for="method in PAYMENT_METHODS" :key="method" :value="method">{{ method }}</option>
        </select>
      </div>

      <button v-if="hasActiveFilters" @click="clearFilters" class="btn-ghost text-xs w-full">
        Clear All Filters
      </button>
    </div>

    <div v-if="spendingStore.loading && spendingStore.spendings.length === 0" class="text-center py-12">
      <div class="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-400 text-sm">Loading...</p>
    </div>

    <div v-else-if="spendingStore.spendings.length === 0" class="text-center py-16">
      <div class="text-5xl mb-3">&#128465;</div>
      <p class="text-gray-400 text-sm">No spendings yet</p>
      <p class="text-gray-300 text-xs mt-1">Add your first spending to get started</p>
    </div>

    <div v-else-if="filteredSpendings.length === 0" class="text-center py-16">
      <div class="text-5xl mb-3">&#128269;</div>
      <p class="text-gray-400 text-sm">No results match your filters</p>
      <button @click="clearFilters" class="btn-ghost text-sm mt-2">Clear Filters</button>
    </div>

    <div v-else>
      <div class="flex justify-between items-center mb-3 glass-card px-4 py-2.5">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500 font-medium">{{ filteredSpendings.length }} items</span>
          <span v-if="hasActiveFilters" class="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full font-semibold">filtered</span>
        </div>
        <span class="text-sm font-bold gradient-text">{{ formatCurrency(totalFiltered) }}</span>
      </div>

      <div class="space-y-3">
        <div
          v-for="spending in filteredSpendings"
          :key="spending.id"
          class="glass-card glass-card-hover overflow-hidden"
          :class="{ 'ring-2 ring-amber-300': spending._pending && spending._opType !== 'delete' }"
        >
          <template v-if="editingId !== spending.id">
            <div class="p-4">
              <div class="flex justify-between items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-lg">{{ categoryEmojis[spending.category] || '📦' }}</span>
                    <span class="font-semibold text-gray-800 truncate">{{ spending.description || 'No description' }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5 mb-1.5">
                    <span class="badge badge-purple">{{ spending.name }}</span>
                    <span :class="['badge', categoryColors[spending.category] || 'badge-blue']">{{ spending.category }}</span>
                    <span class="badge badge-green">{{ spending.paymentMethod }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">{{ formatDate(spending.date) }}</span>
                    <span v-if="spending._pending && spending._opType === 'add'" class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">pending sync</span>
                    <span v-if="spending._pending && spending._opType === 'update'" class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">update pending</span>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-lg font-bold text-gray-800">{{ formatCurrency(Number(spending.price)) }}</div>
                  <div class="flex gap-2 mt-1 justify-end">
                    <button
                      v-if="spending._pending && spending._opType !== 'delete'"
                      @click="handleSyncItem(spending.id)"
                      :disabled="syncingItem === spending.id"
                      class="text-xs text-amber-600 hover:text-amber-800 font-semibold transition-colors flex items-center gap-0.5"
                    >
                      <svg v-if="syncingItem === spending.id" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {{ syncingItem === spending.id ? 'Syncing' : 'Sync' }}
                    </button>
                    <template v-else>
                      <button
                        @click="startEdit(spending)"
                        class="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        @click="handleDelete(spending.id)"
                        class="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="p-4 space-y-3 bg-primary-50/30">
              <div class="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Edit Spending</div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                  <input v-model="editForm.date" type="date" class="input-field text-sm" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</label>
                  <select v-model="editForm.name" class="input-field text-sm bg-white">
                    <option v-for="n in NAMES" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                  <select v-model="editForm.category" class="input-field text-sm bg-white">
                    <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Payment</label>
                  <select v-model="editForm.paymentMethod" class="input-field text-sm bg-white">
                    <option v-for="method in PAYMENT_METHODS" :key="method" :value="method">{{ method }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <input v-model="editForm.description" type="text" class="input-field text-sm" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Price</label>
                <input v-model="editForm.price" type="number" class="input-field text-sm" />
              </div>
              <div class="flex gap-2 pt-1">
                <button @click="saveEdit" class="btn-primary flex-1 py-2 text-sm">Save</button>
                <button @click="cancelEdit" class="btn-ghost flex-1 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>