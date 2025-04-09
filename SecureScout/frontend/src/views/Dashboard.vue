<template>
  <div class="dashboard-view p-6 min-h-screen bg-gray-50">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">安全仪表盘</h1>
      <el-button type="primary" plain @click="refreshData" :loading="isRefreshing" size="small">
        <el-icon class="mr-1"><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>
    
    <!-- 概览卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow-md p-4 flex items-center" v-loading="isLoading">
        <div class="rounded-full bg-blue-100 p-3 mr-4 text-blue-600">
          <el-icon :size="24"><Monitor /></el-icon>
        </div>
        <div class="min-w-0">
          <div class="text-sm text-gray-500">总扫描次数</div>
          <div class="text-2xl font-bold truncate">{{ stats.totalScans }}</div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-4 flex items-center" v-loading="isLoading">
        <div class="rounded-full bg-green-100 p-3 mr-4 text-green-600">
          <el-icon :size="24"><Connection /></el-icon>
        </div>
        <div class="min-w-0">
          <div class="text-sm text-gray-500">活跃扫描</div>
          <div class="text-2xl font-bold truncate">{{ activeScansCount }}</div>
          <div class="text-xs text-gray-400 truncate" v-if="activeScansCount > 0">{{ getActiveTimeRemaining() }}</div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-4 flex items-center" v-loading="isLoading">
        <div class="rounded-full bg-red-100 p-3 mr-4 text-red-600">
          <el-icon :size="24"><Warning /></el-icon>
        </div>
        <div class="min-w-0">
          <div class="text-sm text-gray-500">发现漏洞</div>
          <div class="text-2xl font-bold truncate">{{ stats.vulnerabilities }}</div>
          <div class="text-xs text-gray-400 truncate" v-if="stats.highRiskVulnerabilities > 0">
            其中{{ stats.highRiskVulnerabilities }}个高风险
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-4 flex items-center" v-loading="isLoading">
        <div class="rounded-full bg-yellow-100 p-3 mr-4 text-yellow-600">
          <el-icon :size="24"><Finished /></el-icon>
        </div>
        <div class="min-w-0">
          <div class="text-sm text-gray-500">已修复</div>
          <div class="text-2xl font-bold truncate">{{ stats.fixed }}</div>
        </div>
      </div>
    </div>
    
    <!-- 安全评分 & 漏洞分析 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow-md p-6 lg:col-span-1" v-loading="isLoading">
        <h2 class="text-lg font-semibold mb-4">安全评分</h2>
        <div class="flex flex-col items-center justify-center">
          <div class="relative mb-3">
            <el-progress 
              type="dashboard" 
              :percentage="securityScore" 
              :color="getScoreColor()" 
              :width="180"
              :stroke-width="15"
              :format="() => ''"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-center">
                <span class="text-3xl font-bold">{{ securityScore }}</span>
              </div>
            </div>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-600">{{ getScoreMessage() }}</p>
          </div>
          
          <div class="mt-4 w-full">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-medium text-gray-500">过去30天趋势</span>
            </div>
            <div class="h-10 w-full">
              <div class="flex items-end h-full space-x-1">
                <div 
                  v-for="(score, index) in scoreHistory" 
                  :key="index"
                  class="bg-blue-500 rounded-sm w-2"
                  :style="{ height: `${score}%`, opacity: 0.3 + (index / scoreHistory.length) * 0.7 }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6 lg:col-span-2" v-loading="isLoading">
        <h2 class="text-lg font-semibold mb-4">安全状态</h2>
        <div 
          v-if="stats.vulnerabilities > 0" 
          class="border-l-4 border-red-500 bg-red-50 p-4 text-red-700 mb-4"
        >
          <div class="flex">
            <div class="flex-shrink-0">
              <el-icon :size="24"><Warning /></el-icon>
            </div>
            <div class="ml-3">
              <p class="text-sm">
                您的系统存在 <strong>{{ stats.highRiskVulnerabilities }}</strong> 个高风险漏洞需要紧急处理！
              </p>
            </div>
          </div>
        </div>
        
        <!-- 漏洞类型分布 -->
        <div v-if="stats.vulnerabilities > 0" class="mb-4">
          <h3 class="text-sm font-medium text-gray-700 mb-2">漏洞类型分布</h3>
          <div class="flex flex-wrap items-center gap-3 mb-2">
            <div v-for="(item, index) in vulnerabilityTypes" :key="index" 
              class="flex items-center">
              <div class="w-3 h-3 rounded-sm mr-1" :style="{ backgroundColor: typeColors[index % typeColors.length] }"></div>
              <span class="text-xs text-gray-600">{{ item.name }}</span>
            </div>
          </div>
          <div class="h-40 w-full">
            <canvas ref="vulnerabilityChart"></canvas>
          </div>
          
          <!-- 漏洞类型详细分析 -->
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="hasVulnType('sql_injection')" class="border border-gray-200 rounded-md p-3">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">SQL注入漏洞</h4>
                <el-tag type="danger" size="small">{{ getVulnTypeCount('sql_injection') }}</el-tag>
              </div>
              <p class="text-xs text-gray-600 mb-2">SQL注入漏洞允许攻击者将恶意SQL查询注入应用程序，可能导致数据泄露或损坏。</p>
              <router-link 
                v-if="getVulnTypeCount('sql_injection') > 0" 
                to="/reports?filter=sql_injection" 
                class="text-xs text-blue-500 hover:underline"
              >
                查看详情
              </router-link>
            </div>
            
            <div v-if="hasVulnType('xss')" class="border border-gray-200 rounded-md p-3">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">XSS跨站脚本漏洞</h4>
                <el-tag type="warning" size="small">{{ getVulnTypeCount('xss') }}</el-tag>
              </div>
              <p class="text-xs text-gray-600 mb-2">XSS漏洞允许攻击者将恶意JavaScript代码注入网页，在用户浏览器中执行，可能导致会话劫持等。</p>
              <router-link 
                v-if="getVulnTypeCount('xss') > 0" 
                to="/reports?filter=xss" 
                class="text-xs text-blue-500 hover:underline"
              >
                查看详情
              </router-link>
            </div>
            
            <div v-if="hasVulnType('csrf') || hasVulnType('file_upload')" class="border border-gray-200 rounded-md p-3">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">其他类型漏洞</h4>
                <el-tag type="info" size="small">{{ getVulnTypeCount('csrf') + getVulnTypeCount('file_upload') }}</el-tag>
              </div>
              <p class="text-xs text-gray-600 mb-2">包括CSRF跨站请求伪造、不安全的文件上传等漏洞类型。</p>
              <router-link 
                v-if="getVulnTypeCount('csrf') + getVulnTypeCount('file_upload') > 0" 
                to="/reports?filter=other" 
                class="text-xs text-blue-500 hover:underline"
              >
                查看详情
              </router-link>
            </div>
            
            <div class="border border-gray-200 rounded-md p-3 bg-gray-50">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-medium text-gray-800">漏洞趋势分析</h4>
                <el-tag type="success" size="small" v-if="vulnerabilityTrend < 0">下降</el-tag>
                <el-tag type="danger" size="small" v-else-if="vulnerabilityTrend > 0">上升</el-tag>
                <el-tag type="info" size="small" v-else>稳定</el-tag>
              </div>
              <div class="flex items-end h-16 space-x-1 mb-1">
                <div 
                  v-for="(count, index) in vulnerabilityHistory" 
                  :key="index"
                  class="bg-blue-500 rounded-sm flex-1"
                  :style="{ 
                    height: `${count > 0 ? (count / Math.max(...vulnerabilityHistory) * 100) : 0}%`, 
                    opacity: 0.3 + (index / vulnerabilityHistory.length) * 0.7 
                  }"
                ></div>
              </div>
              <div class="text-xs text-gray-500 text-center">过去7天漏洞趋势</div>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-lg">
          <el-icon :size="36" class="text-gray-400 mb-2"><CircleCheckFilled /></el-icon>
          <p class="text-gray-500">暂未发现漏洞，网站安全状况良好</p>
        </div>
        
        <el-collapse>
          <el-collapse-item title="网站安全建议" name="1">
            <ul class="list-disc pl-5 space-y-2 text-gray-600">
              <li>定期进行安全扫描，建议每周至少一次</li>
              <li>及时更新所有软件和依赖包到最新版本</li>
              <li>实施内容安全策略 (CSP) 防止XSS攻击</li>
              <li>使用HTTPS并配置适当的安全响应头</li>
              <li>为所有表单添加CSRF令牌防护</li>
              <li>启用多因素认证加强账户安全</li>
              <li>对所有用户输入进行严格验证和过滤</li>
            </ul>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
    
    <!-- 最近扫描 & 快速操作 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg shadow-md p-6 lg:col-span-2" v-loading="isLoading">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">最近扫描</h2>
          <div class="flex items-center space-x-2">
            <el-select v-model="scanFilter" placeholder="筛选" size="small" style="width: 120px">
              <el-option label="全部" value="all" />
              <el-option label="有漏洞" value="vulnerable" />
              <el-option label="无漏洞" value="secure" />
            </el-select>
            <router-link to="/scan" class="text-blue-500 text-sm hover:underline">
              查看全部
            </router-link>
          </div>
        </div>
        
        <el-table 
          :data="filteredRecentScans" 
          style="width: 100%"
          :show-header="true"
          size="small"
          empty-text="暂无扫描记录"
          row-class-name="cursor-pointer hover:bg-gray-50"
          @row-click="handleScanClick"
        >
          <el-table-column prop="id" label="ID" width="120" />
          <el-table-column prop="url" label="目标URL" min-width="200">
            <template #default="{ row }">
              <el-link :href="row.url" target="_blank" type="primary" :underline="false" @click.stop>
                {{ row.url }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="150">
            <template #default="{ row }">
              {{ formatDate(row.date || row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag 
                :type="row.status === 'completed' ? 'success' : 
                       row.status === 'in_progress' || row.status === 'running' ? 'primary' : 
                       row.status === 'failed' ? 'danger' : 'info'"
                size="small"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="漏洞" width="80" align="center">
            <template #default="{ row }">
              <el-tag 
                v-if="row.status === 'completed'"
                :type="getVulnerabilityCount(row) > 0 ? 'danger' : 'success'"
                size="small"
              >
                {{ getVulnerabilityCount(row) }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
        
        <div v-if="filteredRecentScans.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-8">
          <el-empty description="暂无扫描记录" :image-size="100">
            <template #description>
              <p class="text-gray-500">{{ getEmptyTableText() }}</p>
            </template>
            <router-link to="/scan">
              <el-button type="primary">新建扫描</el-button>
            </router-link>
          </el-empty>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow-md p-6 lg:col-span-1">
        <h2 class="text-lg font-semibold mb-4">快速操作</h2>
        
        <div class="space-y-4">
          <div>
            <router-link to="/scan">
              <el-button type="primary" class="w-full flex justify-center items-center">
                <el-icon class="mr-2"><Plus /></el-icon>
                新建扫描
              </el-button>
            </router-link>
          </div>
          
          <div>
            <router-link to="/reports">
              <el-button class="w-full flex justify-center items-center">
                <el-icon class="mr-2"><Document /></el-icon>
                查看报告
              </el-button>
            </router-link>
          </div>
          
          <div>
            <router-link to="/settings">
              <el-button class="w-full flex justify-center items-center">
                <el-icon class="mr-2"><Setting /></el-icon>
                安全设置
              </el-button>
            </router-link>
          </div>
          
          <el-divider />
          
          <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-medium text-blue-700 mb-2">安全提示</h3>
            <p class="text-sm text-blue-600">
              {{ dailyTip }}
            </p>
            <div class="mt-2 text-right">
              <el-button text size="small" @click="refreshTip">
                <el-icon class="mr-1"><Refresh /></el-icon>
                换一条
              </el-button>
            </div>
          </div>
          
          <!-- 扫描日历 -->
          <div class="mt-4">
            <h3 class="font-medium text-gray-700 mb-2">扫描日历</h3>
            <div class="flex flex-wrap gap-1">
              <div 
                v-for="(day, i) in scanCalendar" 
                :key="i"
                class="w-4 h-4 rounded-sm"
                :class="day.count === 0 ? 'bg-gray-100' : 
                       day.count === 1 ? 'bg-green-200' : 
                       day.count <= 3 ? 'bg-green-400' : 'bg-green-600'"
                :title="`${day.date}: ${day.count}个扫描`"
              ></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-500">
              <span>过去 30 天</span>
              <span>今天</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Monitor, 
  Connection, 
  Warning, 
  Finished, 
  Plus,
  Document,
  Setting,
  Refresh,
  CircleCheckFilled
} from '@element-plus/icons-vue'
import { useScanStore } from '../store/scanStore'
import { Chart, registerables } from 'chart.js'
import { ElMessage } from 'element-plus'

Chart.register(...registerables)

const router = useRouter()
const scanStore = useScanStore()
const vulnerabilityChart = ref(null)
let chart = null

// 状态
const isLoading = ref(true)
const isRefreshing = ref(false)
const scanFilter = ref('all')

// 统计数据
const stats = reactive({
  totalScans: 0,
  activeScans: 0,
  vulnerabilities: 0,
  fixed: 0,
  highRiskVulnerabilities: 0
})

// 最近扫描
const recentScans = ref([])

// 安全评分历史记录（模拟数据）
const scoreHistory = ref(Array.from({ length: 30 }, () => Math.floor(Math.random() * 30) + 70))

// 漏洞类型统计
const vulnerabilityTypes = ref([
  { name: 'SQL注入', count: 0 },
  { name: 'XSS', count: 0 },
  { name: 'CSRF', count: 0 },
  { name: '文件上传', count: 0 },
  { name: '其他', count: 0 }
])

// 图表颜色
const typeColors = [
  '#FF6384', 
  '#36A2EB', 
  '#FFCE56', 
  '#4BC0C0', 
  '#9966FF'
]

// 扫描日历数据（模拟）
const scanCalendar = ref(generateCalendarData())

// 漏洞历史趋势（模拟数据）
const vulnerabilityHistory = ref([2, 5, 8, 6, 7, 5, 4])

// 漏洞趋势，正数表示上升，负数表示下降，0表示稳定
const vulnerabilityTrend = computed(() => {
  if (vulnerabilityHistory.value.length < 2) return 0
  const lastValue = vulnerabilityHistory.value[vulnerabilityHistory.value.length - 1]
  const prevValue = vulnerabilityHistory.value[vulnerabilityHistory.value.length - 2]
  return lastValue - prevValue
})

// 计算属性
const activeScansCount = computed(() => {
  return scanStore.activeScansCount || 0
})

const securityScore = computed(() => {
  // 基于漏洞数量计算安全评分
  if (stats.vulnerabilities === 0) return 100
  
  // 基础分100，每个漏洞减少分数，高风险漏洞影响更大
  let score = 100 - (stats.vulnerabilities * 5) - (stats.highRiskVulnerabilities * 10)
  return Math.max(0, Math.min(100, Math.round(score)))
})

const filteredRecentScans = computed(() => {
  if (scanFilter.value === 'all') return recentScans.value
  
  if (scanFilter.value === 'vulnerable') {
    return recentScans.value.filter(scan => getVulnerabilityCount(scan) > 0)
  }
  
  if (scanFilter.value === 'secure') {
    return recentScans.value.filter(scan => 
      scan.status === 'completed' && getVulnerabilityCount(scan) === 0
    )
  }
  
  return recentScans.value
})

// 获取空表格文本
function getEmptyTableText() {
  if (scanFilter.value === 'vulnerable') {
    return '暂无发现漏洞的扫描记录'
  } else if (scanFilter.value === 'secure') {
    return '暂无安全状态良好的扫描记录'
  }
  return '暂无扫描记录，点击下方按钮创建新扫描'
}

// 安全提示
const securityTips = [
  '定期更新您的网站依赖包以修复已知安全漏洞',
  '对所有用户输入进行验证和清洗，防止XSS和注入攻击',
  '使用HTTPS确保所有数据传输的安全性',
  '实施适当的密码策略和多因素认证',
  '定期备份重要数据，并测试恢复流程',
  '为敏感操作添加CSRF令牌保护',
  '限制登录尝试次数，防止暴力破解攻击',
  '配置安全响应头如Content-Security-Policy和X-Frame-Options',
  '使用参数化查询防止SQL注入攻击',
  '实施最小权限原则，仅授予必要的访问权限',
  '定期审查访问日志以检测可疑活动',
  '实施网络分段以限制安全事件的影响范围',
  '使用网站应用防火墙(WAF)防御常见攻击',
  '定期对系统进行渗透测试以发现潜在漏洞',
  '确保所有API端点都有适当的认证和授权'
]

const dailyTip = ref('')

// 获取安全评分颜色
function getScoreColor() {
  if (securityScore.value >= 90) return '#67C23A' // 绿色
  if (securityScore.value >= 70) return '#E6A23C' // 黄色
  return '#F56C6C' // 红色
}

// 获取评分消息
function getScoreMessage() {
  if (securityScore.value >= 90) return '您的网站安全状况良好'
  if (securityScore.value >= 70) return '您的网站存在一定安全风险'
  return '您的网站存在严重安全隐患'
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return dateString
  }
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'completed': '已完成',
    'in_progress': '进行中',
    'running': '进行中',
    'pending': '等待中',
    'failed': '失败',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

// 获取漏洞数量
function getVulnerabilityCount(scan) {
  if (typeof scan.vulnerabilities === 'number') {
    return scan.vulnerabilities
  }
  
  if (Array.isArray(scan.vulnerabilities)) {
    return scan.vulnerabilities.length
  }
  
  return 0
}

// 刷新安全提示
function refreshTip() {
  const randomIndex = Math.floor(Math.random() * securityTips.length)
  dailyTip.value = securityTips[randomIndex]
}

// 获取活跃扫描剩余时间估计
function getActiveTimeRemaining() {
  return '预计剩余5-10分钟'
}

// 生成模拟日历数据
function generateCalendarData() {
  const days = 30
  const result = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - i - 1))
    
    result.push({
      date: `${date.getMonth() + 1}月${date.getDate()}日`,
      count: Math.floor(Math.random() * 5) // 0-4个扫描
    })
  }
  
  return result
}

// 点击扫描行
function handleScanClick(row) {
  if (row.status === 'completed') {
    router.push(`/report/${row.id}`)
  } else {
    router.push(`/scan?id=${row.id}`)
  }
}

// 初始化漏洞类型图表
function initVulnerabilityChart() {
  if (!vulnerabilityChart.value) return
  
  // 确保总数不为0，避免图表渲染问题
  const hasData = vulnerabilityTypes.value.some(type => type.count > 0)
  if (!hasData) {
    // 如果没有数据，添加一个虚拟数据防止图表渲染错误
    vulnerabilityTypes.value[4].count = 1
  }
  
  if (chart) {
    chart.destroy()
  }
  
  try {
    const ctx = vulnerabilityChart.value.getContext('2d')
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: vulnerabilityTypes.value.map(type => type.name),
        datasets: [{
          data: vulnerabilityTypes.value.map(type => type.count),
          backgroundColor: typeColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || ''
                const value = context.raw || 0
                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                if (total === 0) return `${label}: 0 (0%)`
                const percentage = Math.round((value / total) * 100)
                return `${label}: ${value} (${percentage}%)`
              }
            }
          }
        },
        cutout: '65%'
      }
    })
  } catch (error) {
    console.error('初始化图表失败:', error)
  }
}

// 分析漏洞类型分布
function analyzeVulnerabilityTypes() {
  // 重置统计
  vulnerabilityTypes.value.forEach(type => type.count = 0)
  
  // 收集所有漏洞
  let allVulnerabilities = []
  
  recentScans.value.forEach(scan => {
    if (Array.isArray(scan.vulnerabilities)) {
      allVulnerabilities = allVulnerabilities.concat(scan.vulnerabilities)
    }
  })
  
  // 统计各类型数量
  allVulnerabilities.forEach(vuln => {
    if (vuln.type === 'sql_injection') {
      vulnerabilityTypes.value[0].count++
    } else if (vuln.type === 'xss') {
      vulnerabilityTypes.value[1].count++
    } else if (vuln.type === 'csrf') {
      vulnerabilityTypes.value[2].count++
    } else if (vuln.type === 'file_upload') {
      vulnerabilityTypes.value[3].count++
    } else {
      vulnerabilityTypes.value[4].count++
    }
  })
  
  // 更新图表
  nextTick(() => {
    initVulnerabilityChart()
  })
}

// 加载数据
async function loadDashboardData() {
  try {
    isLoading.value = true
    
    // 从Store获取数据
    let allScans = []
    let allResults = []
    
    try {
      allScans = await scanStore.getAllScans() || []
    } catch (e) {
      console.error('获取扫描列表失败:', e)
      allScans = []
    }
    
    try {
      allResults = await scanStore.getAllResults() || []
    } catch (e) {
      console.error('获取结果列表失败:', e)
      allResults = []
    }
    
    // 获取最近扫描结果（合并进行中和已完成的）
    const activeScans = allScans.filter(scan => 
      ['pending', 'running', 'in_progress'].includes(scan.status)
    )
    
    const completedScans = [...allResults]
    
    // 合并并按时间排序，最新的在前面
    recentScans.value = [...activeScans, ...completedScans]
      .filter(scan => scan && (scan.start_time || scan.date)) // 确保scan对象有效
      .sort((a, b) => {
        const dateA = new Date(a.start_time || a.date)
        const dateB = new Date(b.start_time || b.date)
        return dateB - dateA
      })
      .slice(0, 10) // 只取最近10条
    
    // 计算统计数据
    stats.totalScans = allScans.length + allResults.length
    stats.activeScans = activeScansCount.value
    
    // 统计漏洞数量
    let totalVulnerabilities = 0
    let highRiskCount = 0
    
    allScans.forEach(scan => {
      if (Array.isArray(scan.vulnerabilities)) {
        totalVulnerabilities += scan.vulnerabilities.length
        scan.vulnerabilities.forEach(vuln => {
          if (vuln.severity === '高') {
            highRiskCount++
          }
        })
      }
    })
    
    allResults.forEach(result => {
      if (Array.isArray(result.vulnerabilities)) {
        totalVulnerabilities += result.vulnerabilities.length
        result.vulnerabilities.forEach(vuln => {
          if (vuln.severity === '高') {
            highRiskCount++
          }
        })
      } else if (typeof result.vulnerabilities === 'number') {
        totalVulnerabilities += result.vulnerabilities
        // 假设高风险漏洞占30%
        highRiskCount += Math.ceil(result.vulnerabilities * 0.3)
      }
    })
    
    stats.vulnerabilities = totalVulnerabilities
    stats.highRiskVulnerabilities = highRiskCount
    stats.fixed = Math.floor(totalVulnerabilities * 0.65) // 模拟已修复数据
    
    // 分析漏洞类型分布
    analyzeVulnerabilityTypes()
    
    // 随机安全提示
    refreshTip()
  } catch (error) {
    console.error('加载仪表盘数据失败:', error)
    ElMessage.error('加载数据失败，请刷新重试')
    
    // 加载失败时使用默认数据
    stats.totalScans = 0
    stats.activeScans = 0
    stats.vulnerabilities = 0
    stats.fixed = 0
    stats.highRiskVulnerabilities = 0
    recentScans.value = []
  } finally {
    isLoading.value = false
  }
}

// 刷新数据
async function refreshData() {
  try {
    isRefreshing.value = true
    await loadDashboardData()
    ElMessage.success('数据已刷新')
  } finally {
    isRefreshing.value = false
  }
}

// 监听过滤器变化
watch(scanFilter, () => {
  // 可以添加过滤效果动画
})

// 生命周期挂载
onMounted(() => {
  loadDashboardData()
  
  // 检查路由是否可用
  try {
    const routes = router.getRoutes().map(route => route.path)
    console.log('可用路由:', routes)
  } catch (e) {
    console.error('获取路由失败:', e)
  }
  
  // 定时刷新活跃扫描状态
  const timer = setInterval(() => {
    if (activeScansCount.value > 0) {
      loadDashboardData()
    }
  }, 15000) // 每15秒刷新一次
  
  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(timer)
    if (chart) {
      chart.destroy()
    }
  })
})

// 检查是否有特定类型的漏洞
function hasVulnType(type) {
  const index = vulnerabilityTypes.value.findIndex(item => {
    return (type === 'sql_injection' && item.name === 'SQL注入') ||
           (type === 'xss' && item.name === 'XSS') ||
           (type === 'csrf' && item.name === 'CSRF') ||
           (type === 'file_upload' && item.name === '文件上传')
  })
  
  return index >= 0 && vulnerabilityTypes.value[index].count > 0
}

// 获取特定类型漏洞的数量
function getVulnTypeCount(type) {
  const index = vulnerabilityTypes.value.findIndex(item => {
    return (type === 'sql_injection' && item.name === 'SQL注入') ||
           (type === 'xss' && item.name === 'XSS') ||
           (type === 'csrf' && item.name === 'CSRF') ||
           (type === 'file_upload' && item.name === '文件上传')
  })
  
  return index >= 0 ? vulnerabilityTypes.value[index].count : 0
}
</script>

<style scoped>
.dashboard-view {
  min-height: calc(100vh - 64px);
}

/* 卡片悬停效果 */
.bg-white {
  transition: transform 0.2s, box-shadow 0.2s;
}

.bg-white:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* 防止长文本溢出 */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style> 