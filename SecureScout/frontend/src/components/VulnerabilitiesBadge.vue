<template>
  <span :class="badgeClass">
    {{ count }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: {
    type: Number,
    required: true,
    default: 0
  },
  size: {
    type: String,
    default: 'default',
    validator: (value) => ['small', 'default', 'large'].includes(value)
  }
})

// 根据漏洞数量计算样式
const badgeClass = computed(() => {
  // 基础类名
  let baseClass = 'inline-flex items-center rounded-full font-medium'
  
  // 根据大小设置内边距和字体大小
  if (props.size === 'small') {
    baseClass += ' px-2 py-0.5 text-xs'
  } else if (props.size === 'large') {
    baseClass += ' px-3 py-1 text-sm'
  } else {
    baseClass += ' px-2.5 py-0.5 text-xs'
  }
  
  // 根据漏洞数量设置颜色
  if (props.count === 0) {
    return `${baseClass} bg-green-100 text-green-800`
  } else if (props.count <= 2) {
    return `${baseClass} bg-yellow-100 text-yellow-800`
  } else if (props.count <= 4) {
    return `${baseClass} bg-orange-100 text-orange-800`
  } else {
    return `${baseClass} bg-red-100 text-red-800`
  }
})
</script> 