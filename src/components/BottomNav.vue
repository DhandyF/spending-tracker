<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { name: 'Add', path: '/', icon: 'plus' },
  { name: 'History', path: '/history', icon: 'clock' },
  { name: 'Stats', path: '/statistics', icon: 'chart' },
  { name: 'Budget', path: '/budget', icon: 'wallet' },
]
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50">
    <div class="max-w-lg mx-auto">
      <div class="mx-3 mb-3 rounded-2xl gradient-header shadow-lg shadow-primary-500/20">
        <div class="flex justify-around items-center h-16">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-300"
            :class="[
              route.path === item.path
                ? 'text-white scale-110'
                : 'text-white/60 hover:text-white/90',
            ]"
          >
            <div
              class="relative"
              :class="route.path === item.path ? 'drop-shadow-md' : ''"
            >
              <div
                v-if="route.path === item.path"
                class="absolute -inset-1.5 bg-white/20 rounded-full"
              ></div>
              <svg
                v-if="item.icon === 'plus'"
                class="w-6 h-6 relative"
                :fill="route.path === item.path ? 'currentColor' : 'none'"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'clock'"
                class="w-6 h-6 relative"
                :fill="route.path === item.path ? 'currentColor' : 'none'"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'chart'"
                class="w-6 h-6 relative"
                :fill="route.path === item.path ? 'currentColor' : 'none'"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <svg
                v-else-if="item.icon === 'wallet'"
                class="w-6 h-6 relative"
                :fill="route.path === item.path ? 'currentColor' : 'none'"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <span
              class="text-[10px] mt-0.5 font-semibold tracking-wide"
              >{{ item.name }}</span
            >
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>