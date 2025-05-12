<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <!-- Logo和应用名称 -->
          <div class="flex-shrink-0 flex items-center">
            <router-link to="/" class="flex items-center">
              <div class="h-8 w-8 flex items-center justify-center bg-primary text-white rounded-md">
                <span class="font-bold">S</span>
              </div>
              <span class="ml-2 text-lg font-semibold text-primary">SecureScout</span>
            </router-link>
          </div>
          
          <!-- 导航链接 -->
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <router-link 
              v-for="(item, index) in navItems" 
              :key="index" 
              :to="item.path"
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200"
              :class="[$route.path === item.path ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700']"
            >
              {{ item.title }}
            </router-link>
          </div>
        </div>
        
        <!-- 移动菜单按钮 -->
        <div class="flex items-center sm:hidden">
          <button 
            @click="isMobileMenuOpen = !isMobileMenuOpen" 
            type="button"
            class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            aria-controls="mobile-menu"
            :aria-expanded="isMobileMenuOpen"
          >
            <span class="sr-only">打开主菜单</span>
            <svg 
              class="h-6 w-6" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              aria-hidden="true"
            >
              <path 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 移动菜单 -->
    <div 
      v-show="isMobileMenuOpen" 
      class="sm:hidden" 
      id="mobile-menu"
    >
      <div class="pt-2 pb-3 space-y-1">
        <router-link 
          v-for="(item, index) in navItems" 
          :key="index" 
          :to="item.path"
          class="block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200"
          :class="[$route.path === item.path ? 'border-primary text-primary bg-primary-light' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800']"
        >
          {{ item.title }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMobileMenuOpen = ref(false)

const navItems = [
  { title: '仪表盘', path: '/' },
  { title: '扫描中心', path: '/scan' },
  { title: '功能演示', path: '/demo' },
  { title: '报告', path: '/reports' }
]
</script>

<style scoped>
/* 导航栏样式 */
.router-link-active {
  color: var(--primary-color, #1890ff);
  border-color: var(--primary-color, #1890ff);
}
</style> 