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
      
      <!-- 漏洞可视化分析模块 -->
      <VulnerabilityVisualizer 
        v-if="report.vulnerabilities && report.vulnerabilities.length > 0"
        :vulnerabilities="report.vulnerabilities"
        title="漏洞分析与可视化"
        class="mb-6"
      />
      
      <!-- 漏洞详情切换选项卡 -->
      <div v-if="report.vulnerabilities && report.vulnerabilities.length > 0" class="card mb-6">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="全部漏洞" name="all">
            <VulnerabilityTable :vulnerabilities="report.vulnerabilities" @view-details="showVulnDetails" />
          </el-tab-pane>
          
          <el-tab-pane 
            v-if="hasVulnType('sql_injection')" 
            label="SQL注入漏洞" 
            name="sql_injection"
          >
            <div class="mb-4">
              <SQLInjectionGuidance />
            </div>
            <VulnerabilityTable 
              :vulnerabilities="getVulnerabilitiesByType('sql_injection')" 
              @view-details="showVulnDetails"
            />
          </el-tab-pane>
          
          <el-tab-pane 
            v-if="hasVulnType('xss')" 
            label="XSS漏洞" 
            name="xss"
          >
            <div class="mb-4">
              <XSSGuidance />
            </div>
            <VulnerabilityTable 
              :vulnerabilities="getVulnerabilitiesByType('xss')" 
              @view-details="showVulnDetails"
            />
          </el-tab-pane>
          
          <el-tab-pane 
            v-if="hasVulnType('csrf') || hasVulnType('file_upload')" 
            label="其他漏洞" 
            name="other"
          >
            <div class="mb-4">
              <OtherVulnerabilitiesGuidance />
            </div>
            <VulnerabilityTable 
              :vulnerabilities="getOtherVulnerabilities()" 
              @view-details="showVulnDetails"
            />
          </el-tab-pane>
        </el-tabs>
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
        
        <el-dropdown @command="exportReport" trigger="click">
          <el-button type="primary">
            导出报告 <el-icon class="ml-1"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="pdf">PDF格式</el-dropdown-item>
              <el-dropdown-item command="json">JSON格式</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      
      <!-- 漏洞详情对话框 -->
      <el-dialog
        v-model="showDetailDialog"
        title="漏洞详情"
        width="70%"
        destroy-on-close
      >
        <template v-if="selectedVulnerability">
          <div class="vuln-detail">
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
              <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-medium">{{ getVulnTypeName(selectedVulnerability.type) }}</h3>
                <VulnerabilityBadge :severity="selectedVulnerability.severity" />
              </div>
              <p>{{ selectedVulnerability.description }}</p>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div v-if="selectedVulnerability.url">
                <div class="text-sm text-gray-500 mb-1">URL:</div>
                <div class="break-all">{{ selectedVulnerability.url }}</div>
              </div>
              
              <div v-if="selectedVulnerability.test_url">
                <div class="text-sm text-gray-500 mb-1">测试URL:</div>
                <div class="break-all">{{ selectedVulnerability.test_url }}</div>
              </div>
            </div>
            
            <div v-if="selectedVulnerability.details" class="mb-4">
              <div class="text-sm text-gray-500 mb-1">详细信息:</div>
              <div class="bg-gray-50 p-3 rounded font-mono text-sm overflow-auto max-h-40">
                {{ selectedVulnerability.details }}
              </div>
            </div>
            
            <el-divider>修复建议</el-divider>
            
            <div v-if="selectedVulnerability.type === 'sql_injection'">
              <SQLInjectionGuidance />
            </div>
            <div v-else-if="selectedVulnerability.type === 'xss'">
              <XSSGuidance />
            </div>
            <div v-else-if="selectedVulnerability.type === 'csrf' || selectedVulnerability.type === 'file_upload'">
              <OtherVulnerabilitiesGuidance />
            </div>
            <div v-else>
              <div class="text-sm">
                {{ getRemediationAdvice(selectedVulnerability.type) }}
              </div>
            </div>
          </div>
        </template>
        
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showDetailDialog = false">关闭</el-button>
            <el-button type="primary" @click="exportReport('pdf')">生成PDF</el-button>
          </span>
        </template>
      </el-dialog>
    </template>
    
    <!-- 添加PDF模板组件，但默认隐藏 -->
    <div v-show="showPdfTemplate" ref="pdfContainer" class="pdf-container">
      <ReportPDFTemplate :report="report" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowDown } from '@element-plus/icons-vue'
import { useScanStore } from '../store/scanStore'
import ScanStatusBadge from '../components/ScanStatusBadge.vue'
import VulnerabilityBadge from '../components/VulnerabilityBadge.vue'
import VulnerabilityVisualizer from '../components/VulnerabilityVisualizer.vue'
import VulnerabilityTable from '../components/VulnerabilityTable.vue'
import SQLInjectionGuidance from '../components/guidance/SQLInjectionGuidance.vue'
import XSSGuidance from '../components/guidance/XSSGuidance.vue'
import OtherVulnerabilitiesGuidance from '../components/guidance/OtherVulnerabilitiesGuidance.vue'
import ReportPDFTemplate from '../components/ReportPDFTemplate.vue'

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
const activeTab = ref('all')
const showDetailDialog = ref(false)
const selectedVulnerability = ref(null)

// PDF生成相关
const pdfContainer = ref(null)
const showPdfTemplate = ref(false)

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
  return remediationAdvice[type] || '请参考安全最佳实践进行修复。'
}

// 检查是否有特定类型的漏洞
function hasVulnType(type) {
  if (!report.value?.vulnerabilities) return false
  return report.value.vulnerabilities.some(vuln => vuln.type === type)
}

// 获取指定类型的漏洞
function getVulnerabilitiesByType(type) {
  if (!report.value?.vulnerabilities) return []
  return report.value.vulnerabilities.filter(vuln => vuln.type === type)
}

// 获取其他类型漏洞
function getOtherVulnerabilities() {
  if (!report.value?.vulnerabilities) return []
  return report.value.vulnerabilities.filter(vuln => 
    vuln.type === 'csrf' || vuln.type === 'file_upload'
  )
}

// 显示漏洞详情
function showVulnDetails(vuln) {
  selectedVulnerability.value = vuln
  showDetailDialog.value = true
}

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '未知'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

// 计算持续时间
function calculateDuration(startStr, endStr) {
  if (!startStr || !endStr) return '--'
  
  const start = new Date(startStr)
  const end = new Date(endStr)
  const diffMs = end - start
  
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}秒`
  
  const diffMin = Math.floor(diffSec / 60)
  const remainSec = diffSec % 60
  if (diffMin < 60) return `${diffMin}分${remainSec}秒`
  
  const diffHour = Math.floor(diffMin / 60)
  const remainMin = diffMin % 60
  return `${diffHour}小时${remainMin}分`
}

// 删除报告
async function deleteReport() {
  try {
    await scanStore.deleteReport(reportId.value)
    ElMessage.success('报告已删除')
    router.push('/reports')
  } catch (err) {
    ElMessage.error('删除报告失败: ' + (err.message || '未知错误'))
  }
}

// 导出报告
async function exportReport(format = 'json') {
  if (!report.value) return
  
  if (format === 'json') {
    // 创建报告内容
    const reportContent = {
      id: report.value.id,
      url: report.value.url,
      scanDate: report.value.start_time,
      status: report.value.status,
      modules: report.value.modules,
      vulnerabilities: report.value.vulnerabilities
    }
    
    // 转换为JSON
    const jsonStr = JSON.stringify(reportContent, null, 2)
    
    // 创建Blob对象
    const blob = new Blob([jsonStr], { type: 'application/json' })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-report-${report.value.id}.json`
    
    // 触发下载
    document.body.appendChild(a)
    a.click()
    
    // 清理
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
    
    ElMessage.success('JSON报告已导出')
  } else if (format === 'pdf') {
    try {
      ElMessage.info('正在准备打印PDF报告，请稍候...')
      
      // 显示PDF模板
      showPdfTemplate.value = true
      
      // 等待组件渲染
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 使用浏览器原生打印功能
      const printWindow = window.open('', '_blank')
      
      if (!printWindow) {
        throw new Error('请允许浏览器打开弹窗以生成PDF')
      }
      
      // 获取PDF模板元素
      const element = pdfContainer.value.querySelector('.pdf-template')
      if (!element) {
        throw new Error('无法找到PDF模板元素')
      }
      
      // 设置打印窗口内容
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>安全扫描报告 - ${report.value.id}</title>
          <style>
            body {
              font-family: 'SimSun', 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
            }
            .report-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #eee;
            }
            .report-header h1 {
              font-size: 24px;
              margin-bottom: 15px;
            }
            .report-meta {
              text-align: left;
            }
            .report-meta p {
              margin: 5px 0;
            }
            h2 {
              font-size: 18px;
              margin-top: 25px;
              margin-bottom: 10px;
              padding-bottom: 5px;
              border-bottom: 1px solid #eee;
            }
            h3 {
              font-size: 16px;
              margin-top: 15px;
              margin-bottom: 10px;
            }
            .vulnerability-item {
              margin-bottom: 20px;
              padding: 10px;
              background-color: #f9f9f9;
              border-radius: 5px;
            }
            .vulnerability-item h3 {
              margin-top: 0;
            }
            .advice-item {
              margin-bottom: 15px;
            }
            ul {
              padding-left: 20px;
            }
            li {
              margin-bottom: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
              .print-controls {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-controls" style="margin-bottom: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 8px 16px; background-color: #409EFF; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">打印PDF</button>
            <button onclick="window.close()" style="padding: 8px 16px; background-color: #F56C6C; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭窗口</button>
          </div>
          ${element.outerHTML}
        </body>
        </html>
      `)
      
      printWindow.document.close()
      
      // 自动触发打印
      setTimeout(() => {
        try {
          printWindow.focus() // 确保窗口获得焦点
          printWindow.print() // 直接打开打印对话框
        } catch (e) {
          console.error('自动打印失败:', e)
        }
      }, 1000)
      
      // 隐藏PDF模板
      showPdfTemplate.value = false
      
      ElMessage.success('PDF打印窗口已打开，请选择"保存为PDF"选项')
    } catch (error) {
      console.error('生成PDF时出错:', error)
      ElMessage.error('生成PDF失败: ' + error.message)
      
      // 确保隐藏PDF模板
      showPdfTemplate.value = false
    }
  }
}

// 加载报告数据
async function loadReport() {
  try {
    isLoading.value = true
    error.value = null
    
    // 模拟实际API调用 - 在真实环境中将使用scanStore.getReport(reportId.value)
    const result = await scanStore.getAllResults()
    const foundReport = result.find(r => r.id === reportId.value)
    
    if (foundReport) {
      report.value = foundReport
    } else {
      error.value = '未找到指定报告'
    }
  } catch (err) {
    error.value = '加载报告失败: ' + (err.message || '未知错误')
    console.error('加载报告失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 初始加载
onMounted(() => {
  loadReport()
})

// 监听路由变化，重新加载数据
watch(
  () => route.params.id,
  () => {
    if (route.name === 'report-detail') {
      loadReport()
    }
  }
)
</script>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}

/* PDF容器样式 */
.pdf-container {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 210mm; /* A4宽度 */
  z-index: -1000;
}
</style> 