<template>
  <span :class="statusClass">
    {{ statusLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['pending', 'in_progress', 'completed', 'failed'].includes(value)
  }
})

// 状态标签映射
const statusLabels = {
  'pending': '等待中',
  'in_progress': '扫描中',
  'completed': '已完成',
  'failed': '失败'
}

// 状态类名映射
const statusClasses = {
  'pending': 'bg-blue-100 text-blue-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800'
}

// 根据状态获取标签
const statusLabel = computed(() => {
  return statusLabels[props.status] || props.status
})

// 根据状态获取类名
const statusClass = computed(() => {
  const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  return `${baseClass} ${statusClasses[props.status] || 'bg-gray-100 text-gray-800'}`
})
</script> 