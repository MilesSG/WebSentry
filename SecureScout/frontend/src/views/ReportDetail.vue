<template>
  <div>
    <div class="flex items-center mb-6">
      <router-link to="/reports" class="text-primary hover:text-primary-dark mr-2">
        <el-icon><ArrowLeft /></el-icon>
      </router-link>
      <h1 class="text-2xl font-semibold text-gray-900">扫描报告详情</h1>
    </div>
    
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <el-skeleton style="width: 100%" :rows="6" animated />
    </div>
    
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 mb-6">
      加载报告失败: {{ error }}
    </div>
    
    <div v-else-if="!report" class="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-700 mb-6">
      未找到报告
    </div>
    
    <template v-else>
      <!-- 报告标题和概览 -->
      <div class="card mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">
          <span v-if="report.url" class="max-w-full break-all">{{ report.url }}</span>
          <span v-else class="text-gray-500">未知URL</span>
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div class="bg-gray-50 p-4 rounded-md">
            <div class="text-sm text-gray-500 mb-1">扫描状态</div>
            <div class="flex items-center">
              <ScanStatusBadge :status="report.status" size="large" />
              <span v-if="report.status === 'failed'" class="ml-2 text-red-600 text-sm">
                {{ report.error || '未知错误' }}
              </span>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-md">
            <div class="text-sm text-gray-500 mb-1">扫描时间</div>
            <div>
              <div>开始: {{ formatDate(report.start_time) }}</div>
              <div v-if="report.end_time">结束: {{ formatDate(report.end_time) }}</div>
              <div v-if="report.start_time && report.end_time">
                耗时: {{ calculateDuration(report.start_time, report.end_time) }}
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-md">
            <div class="text-sm text-gray-500 mb-1">漏洞统计</div>
            <div class="flex items-center">
              <div class="text-lg font-semibold">{{ report.vulnerabilities?.length || 0 }}</div>
              <div class="ml-4 flex flex-wrap gap-1">
                <template v-if="vulnerabilitiesBySeverity">
                  <div v-for="(count, severity) in vulnerabilitiesBySeverity" :key="severity" class="flex items-center mr-3">
                    <VulnerabilityBadge :severity="severity" size="small" />
                    <span class="ml-1 text-sm">{{ count }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 扫描模块信息 -->
      <div class="card mb-6" v-if="report.modules && report.modules.length > 0">
        <h3 class="text-lg font-medium text-gray-900 mb-2">扫描模块</h3>
        <div class="flex flex-wrap gap-2">
          <el-tag v-for="module in report.modules" :key="module">
            {{ getModuleName(module) }}
          </el-tag>
        </div>
      </div>
      
      <!-- 漏洞列表 -->
      <div class="card mb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">漏洞详情</h3>
        
        <div v-if="!report.vulnerabilities || report.vulnerabilities.length === 0" class="text-gray-500">
          未发现漏洞
        </div>
        
        <div v-else>
          <div class="mb-4">
            <el-input 
              v-model="vulnSearchQuery" 
              placeholder="搜索漏洞..." 
              clearable
              class="w-full md:w-80"
            />
          </div>
          
          <div class="space-y-4">
            <div 
              v-for="(vuln, index) in filteredVulnerabilities" 
              :key="index" 
              class="border border-gray-200 rounded-md overflow-hidden"
            >
              <div class="flex justify-between items-center bg-gray-50 px-4 py-3">
                <div class="font-medium">{{ getVulnTypeName(vuln.type) }}</div>
                <VulnerabilityBadge :severity="vuln.severity" />
              </div>
              
              <div class="p-4">
                <div class="mb-3">
                  <div class="text-gray-700">{{ vuln.description }}</div>
                </div>
                
                <div v-if="vuln.url" class="mb-3 text-sm">
                  <div class="text-gray-500 mb-1">URL:</div>
                  <div class="break-all">{{ vuln.url }}</div>
                </div>
                
                <div v-if="vuln.test_url" class="mb-3 text-sm">
                  <div class="text-gray-500 mb-1">测试URL:</div>
                  <div class="break-all">{{ vuln.test_url }}</div>
                </div>
                
                <div v-if="vuln.details" class="text-sm">
                  <div class="text-gray-500 mb-1">详细信息:</div>
                  <pre class="bg-gray-50 p-2 rounded whitespace-pre-wrap">{{ vuln.details }}</pre>
                </div>
              </div>
              
              <div class="bg-gray-50 px-4 py-3">
                <h4 class="font-medium mb-2">修复建议</h4>
                <div class="text-sm text-gray-700">
                  {{ getRemediationAdvice(vuln.type) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex justify-end space-x-4">
        <el-popconfirm
          title="确定要删除此报告吗？"
          @confirm="deleteReport"
        >
          <template #reference>
            <el-button type="danger">删除报告</el-button>
          </template>
        </el-popconfirm>
        
        <el-button type="primary" @click="exportReport">导出报告</el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useScanStore } from '../store/scanStore'
import ScanStatusBadge from '../components/ScanStatusBadge.vue'
import VulnerabilityBadge from '../components/VulnerabilityBadge.vue'

const route = useRoute()
const router = useRouter()
const scanStore = useScanStore()

// 报告数据
const reportId = computed(() => route.params.id)
const report = ref(null)

// 状态
const isLoading = ref(true)
const error = ref(null)
const vulnSearchQuery = ref('')

// 模块名称映射
const moduleNames = {
  'sql_injection': 'SQL注入检测',
  'xss': 'XSS跨站脚本',
  'csrf': '跨站请求伪造',
  'file_upload': '文件上传漏洞'
}

// 漏洞类型名称映射
const vulnTypeNames = {
  'sql_injection': 'SQL注入',
  'xss': '跨站脚本(XSS)',
  'csrf': '跨站请求伪造(CSRF)',
  'file_upload': '文件上传漏洞',
  'error': '错误'
}

// 漏洞修复建议
const remediationAdvice = {
  'sql_injection': '1. 使用参数化查询或预编译语句\n2. 对所有用户输入进行严格验证\n3. 使用ORM框架\n4. 限制数据库账户权限\n5. 在应用层实施输入/输出过滤',
  'xss': '1. 对所有用户输入进行HTML转义\n2. 实施内容安全策略(CSP)\n3. 使用现代框架的安全绑定\n4. 设置适当的X-XSS-Protection头\n5. 避免直接将用户输入插入到JavaScript中',
  'csrf': '1. 在所有表单中使用CSRF令牌\n2. 验证请求头中的Referer\n3. 对敏感操作使用验证码\n4. 使用SameSite Cookie属性\n5. 实施双重提交Cookie模式',
  'file_upload': '1. 验证文件类型、大小和内容\n2. 使用安全的文件名和存储路径\n3. 不要运行上传的文件\n4. 将文件存储在Web根目录之外\n5. 使用CDN或专用服务器处理文件',
  'error': '检查系统日志以获取更多信息'
}

// 按严重程度分组的漏洞数量
const vulnerabilitiesBySeverity = computed(() => {
  if (!report.value?.vulnerabilities) return null
  
  const result = {}
  
  report.value.vulnerabilities.forEach(vuln => {
    const severity = vuln.severity || '中'
    if (result[severity]) {
      result[severity]++
    } else {
      result[severity] = 1
    }
  })
  
  return result
})

// 搜索过滤后的漏洞
const filteredVulnerabilities = computed(() => {
  if (!report.value?.vulnerabilities) return []
  
  if (!vulnSearchQuery.value) {
    return report.value.vulnerabilities
  }
  
  const query = vulnSearchQuery.value.toLowerCase()
  return report.value.vulnerabilities.filter(vuln => {
    return (
      (vuln.type && vuln.type.toLowerCase().includes(query)) ||
      (vuln.description && vuln.description.toLowerCase().includes(query)) ||
      (vuln.details && vuln.details.toLowerCase().includes(query))
    )
  })
})

// 获取模块名称
function getModuleName(moduleId) {
  return moduleNames[moduleId] || moduleId
}

// 获取漏洞类型名称
function getVulnTypeName(type) {
  return vulnTypeNames[type] || type
}

// 获取修复建议
function getRemediationAdvice(type) {
  return remediationAdvice[type] || '请咨询安全专家以获取针对此类型漏洞的具体修复建议。'
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 计算扫描持续时间
function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return ''
  
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = end - start
  
  if (durationMs < 0) return '无效时间'
  
  // 转换为可读格式
  const seconds = Math.floor(durationMs / 1000) % 60
  const minutes = Math.floor(durationMs / (1000 * 60)) % 60
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  
  let result = ''
  if (hours > 0) result += `${hours}小时 `
  if (minutes > 0) result += `${minutes}分钟 `
  result += `${seconds}秒`
  
  return result
}

// 删除报告
async function deleteReport() {
  try {
    await scanStore.deleteReport(reportId.value)
    ElMessage.success('报告已删除')
    router.push('/reports')
  } catch (err) {
    ElMessage.error('删除报告失败')
    console.error('删除报告失败:', err)
  }
}

// 导出报告
function exportReport() {
  if (!report.value) return
  
  try {
    // 创建报告内容
    const reportContent = {
      url: report.value.url,
      scan_id: report.value.id,
      status: report.value.status,
      start_time: report.value.start_time,
      end_time: report.value.end_time,
      vulnerabilities: report.value.vulnerabilities || []
    }
    
    // 转换为JSON字符串
    const jsonString = JSON.stringify(reportContent, null, 2)
    
    // 创建Blob
    const blob = new Blob([jsonString], { type: 'application/json' })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // 设置文件名 (URL的域名部分 + 日期)
    let fileName = 'security_report'
    try {
      if (report.value.url) {
        const urlObj = new URL(report.value.url)
        fileName = urlObj.hostname
      }
    } catch (e) {}
    
    // 添加日期时间戳
    const date = new Date()
    const timestamp = date.toISOString().replace(/[:.]/g, '-').substring(0, 19)
    
    a.download = `${fileName}_${timestamp}.json`
    
    // 点击下载
    document.body.appendChild(a)
    a.click()
    
    // 清理
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    ElMessage.success('报告已导出')
  } catch (err) {
    ElMessage.error('导出报告失败')
    console.error('导出报告失败:', err)
  }
}

// 加载报告数据
async function loadReportData() {
  isLoading.value = true
  error.value = null
  
  try {
    // 尝试从 store 中获取扫描结果
    if (scanStore.scanResults?.length) {
      const foundReport = scanStore.scanResults.find(r => r.id === reportId.value)
      if (foundReport) {
        report.value = foundReport
        return
      }
    }
    
    // 如果 store 中没有，则从 API 获取
    const data = await scanStore.getScanStatus(reportId.value)
    report.value = data
  } catch (err) {
    error.value = err.message || '加载报告失败'
    console.error('加载报告失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 监听路由参数变化，重新加载数据
watch(() => route.params.id, (newId, oldId) => {
  if (newId !== oldId) {
    loadReportData()
  }
})

// 生命周期钩子
onMounted(() => {
  loadReportData()
})
</script> 