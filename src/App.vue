<script setup>
import BottomNav from '@/components/BottomNav.vue'
import ToastContainer from '@/components/ToastContainer.vue'
</script>

<template>
  <div class="min-h-screen pb-20">
    <router-view />
    <BottomNav />
    <ToastContainer />
  </div>
</template>