<template>
  <div class="w-full h-full">
    <Doughnut
      v-if="loaded && !isEmpty"
      :data="chartData"
      :options="chartOptions"
    />
    <div v-else-if="isEmpty" class="flex items-center justify-center h-full">
      <p class="text-gray-500">暂无数据</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'

// 注册ChartJS组件
ChartJS.register(ArcElement, Tooltip, Legend, Title)

const props = defineProps({
  severityCounts: {
    type: Object,
    required: true,
    default: () => ({})
  }
})

const loaded = ref(false)
const isEmpty = computed(() => {
  const counts = Object.values(props.severityCounts)
  return counts.length === 0 || counts.every(count => count === 0)
})

// 计算安全评分
const securityScore = computed(() => {
  if (isEmpty.value) return 100
  
  const { '低': low = 0, '中': medium = 0, '高': high = 0, '严重': critical = 0 } = props.severityCounts
  const totalVulnerabilities = low + medium + high + critical
  
  if (totalVulnerabilities === 0) return 100
  
  // 根据漏洞严重程度计算权重分数
  const weightedScore = (
    low * 0.1 + 
    medium * 0.3 + 
    high * 0.6 + 
    critical * 1.0
  ) / totalVulnerabilities
  
  // 将权重分数转换为0-100的评分（越高越安全）
  return Math.max(0, Math.round(100 - (weightedScore * 100)))
})

// 设置图表数据
const chartData = computed(() => {
  const score = securityScore.value
  
  return {
    labels: ['安全评分', '风险'],
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: getScoreColors(score),
        borderWidth: 0,
        borderRadius: 5,
        cutout: '70%'
      }
    ]
  }
})

// 根据分数获取颜色
function getScoreColors(score) {
  let color
  
  if (score >= 90) {
    color = '#52c41a' // 绿色 安全
  } else if (score >= 70) {
    color = '#1890ff' // 蓝色 良好
  } else if (score >= 50) {
    color = '#faad14' // 黄色 注意
  } else {
    color = '#f5222d' // 红色 危险
  }
  
  return [color, '#f0f0f0']
}

// 图表选项
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false
    }
  }
}

// 在组件挂载后设置加载完成状态
onMounted(() => {
  loaded.value = true
})

// 当严重度计数变化时重新计算安全评分
watch(() => props.severityCounts, () => {
  loaded.value = true
}, { deep: true })
</script> 