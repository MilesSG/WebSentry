<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <AppNavbar />
    <main class="flex-grow container mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="bg-white py-4 border-t border-gray-200">
      <div class="container mx-auto px-4 text-center text-sm text-gray-500">
        <p>SecureScout Web安全检测工具 &copy; {{ currentYear }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppNavbar from './components/AppNavbar.vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style>
/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style> 