<template>
  <div class="reports-view min-h-screen bg-gray-50 p-6">
    <h1 class="text-2xl font-bold mb-6">安全扫描报告</h1>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-xl font-semibold mb-1">正在加载报告...</h2>
          <p class="text-gray-500">请稍候片刻</p>
        </div>
      </div>
      
      <!-- 骨架屏 -->
      <el-skeleton :rows="5" animated />
    </div>
    
    <!-- 无报告提示 -->
    <div v-else-if="reports.length === 0" class="bg-white rounded-lg shadow-md p-8 text-center">
      <el-empty 
        description="暂无扫描报告" 
        :image-size="200"
      >
        <template #extra>
          <el-button type="primary" @click="startNewScan">开始新的扫描</el-button>
        </template>
      </el-empty>
    </div>
    
    <!-- 报告列表 -->
    <div v-else class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold">扫描报告列表</h2>
        <el-button type="primary" @click="startNewScan">新建扫描</el-button>
      </div>
      
      <el-table 
        :data="reports" 
        style="width: 100%" 
        border 
        stripe 
        highlight-current-row
        @row-click="(row) => viewReport(row.id)"
      >
        <el-table-column label="ID" prop="id" width="80" />
        <el-table-column label="目标网址" prop="url" min-width="200">
          <template #default="{ row }">
            <el-link 
              type="primary" 
              :href="row.url" 
              target="_blank" 
              @click.stop
            >
              {{ row.url }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.scanDate) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="漏洞数量" width="120" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.vulnerabilities > 0 ? 'danger' : 'success'"
              effect="dark"
            >
              {{ row.vulnerabilities }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <div class="flex space-x-2">
              <el-button 
                size="small" 
                type="primary" 
                plain
                @click.stop="viewReport(row.id)"
              >
                查看详情
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                plain
                @click.stop="confirmDelete(row.id)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 报告详情对话框 -->
    <el-dialog
      v-model="showReportDialog"
      title="扫描报告详情"
      width="70%"
      destroy-on-close
    >
      <div v-if="selectedReport" class="report-detail">
        <!-- 基本信息 -->
        <div class="mb-6 p-4 bg-gray-50 rounded-md">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-gray-600">扫描ID：<span class="font-medium text-gray-800">{{ selectedReport.id }}</span></p>
              <p class="text-gray-600">目标网址：
                <el-link 
                  type="primary" 
                  :href="selectedReport.url" 
                  target="_blank"
                >
                  {{ selectedReport.url }}
                </el-link>
              </p>
              <p class="text-gray-600">扫描时间：<span class="font-medium text-gray-800">{{ formatDate(selectedReport.scanDate) }}</span></p>
            </div>
            <div>
              <p class="text-gray-600">
                状态：
                <el-tag :type="getStatusType(selectedReport.status)">{{ selectedReport.status }}</el-tag>
              </p>
              <p class="text-gray-600">扫描深度：<span class="font-medium text-gray-800">{{ selectedReport.depth || '标准' }}</span></p>
              <p class="text-gray-600">扫描时长：<span class="font-medium text-gray-800">{{ selectedReport.duration || '--' }}</span></p>
            </div>
          </div>
        </div>
        
        <!-- 漏洞概览 -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">漏洞概览</h3>
            <div>
              <el-tag 
                :type="selectedReport.vulnerabilities > 0 ? 'danger' : 'success'"
                size="large"
              >
                {{ selectedReport.vulnerabilities > 0 
                  ? `发现 ${selectedReport.vulnerabilities} 个漏洞` 
                  : '未发现漏洞' 
                }}
              </el-tag>
            </div>
          </div>
          
          <div v-if="selectedReport.vulnerabilities > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- 漏洞分布图 -->
            <div>
              <div ref="vulnChartRef" style="height: 250px;"></div>
            </div>
            
            <!-- 安全评分 -->
            <div class="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
              <div class="mb-2 text-lg font-semibold">网站安全评分</div>
              <div class="relative">
                <el-progress 
                  type="dashboard" 
                  :percentage="Math.max(0, 100 - selectedReport.vulnerabilities * (selectedReport.vulnerabilities > 3 ? 15 : 10))" 
                  :color="selectedReport.vulnerabilities > 3 ? '#F56C6C' : selectedReport.vulnerabilities > 0 ? '#E6A23C' : '#67C23A'"
                  :width="150"
                />
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-3xl font-bold">
                    {{ Math.max(0, 100 - selectedReport.vulnerabilities * (selectedReport.vulnerabilities > 3 ? 15 : 10)) }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-gray-500 mt-2">
                {{ selectedReport.vulnerabilities > 3 ? '网站存在严重安全风险' : 
                   selectedReport.vulnerabilities > 0 ? '网站存在潜在安全隐患' : 
                   '网站安全状况良好' }}
              </p>
            </div>
          </div>
          
          <div v-if="selectedReport.vulnerabilities === 0" class="text-center p-8">
            <el-result
              icon="success"
              title="恭喜！未发现安全漏洞"
              sub-title="您的网站在本次扫描中未发现安全漏洞，可以定期进行安全扫描以保持良好的安全状态。"
            />
          </div>
        </div>
        
        <!-- 漏洞详情 -->
        <div v-if="selectedReport.vulnerabilityDetails && selectedReport.vulnerabilityDetails.length > 0">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">漏洞详情</h3>
            <el-radio-group v-model="selectedFilter" size="small">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="high">高危</el-radio-button>
              <el-radio-button label="medium">中危</el-radio-button>
              <el-radio-button label="low">低危</el-radio-button>
            </el-radio-group>
          </div>
          
          <div v-if="filteredVulnerabilities.length === 0" class="text-center p-4 bg-gray-50 rounded">
            <p class="text-gray-500">当前筛选条件下没有漏洞</p>
          </div>
          
          <el-collapse accordion v-else>
            <el-collapse-item 
              v-for="(vuln, index) in filteredVulnerabilities" 
              :key="index"
              :title="vuln.type"
              :name="index"
            >
              <template #title>
                <div class="flex items-center">
                  <el-tag 
                    :type="getSeverityType(vuln.severity)" 
                    size="small" 
                    class="mr-2"
                  >
                    {{ vuln.severity }}
                  </el-tag>
                  <span>{{ vuln.type }}</span>
                </div>
              </template>
              
              <div class="vuln-detail pl-2">
                <p class="mb-2"><strong>位置：</strong> {{ vuln.location }}</p>
                <p class="mb-2"><strong>描述：</strong> {{ vuln.description }}</p>
                
                <el-divider>详细信息</el-divider>
                
                <p class="mb-2"><strong>风险级别：</strong> {{ vuln.severity }}</p>
                <p class="mb-2"><strong>影响：</strong> {{ vuln.impact }}</p>
                
                <div v-if="vuln.evidence" class="mt-4">
                  <p class="font-medium mb-1">证据：</p>
                  <div class="bg-gray-100 p-3 rounded font-mono text-sm overflow-auto max-h-40">
                    {{ vuln.evidence }}
                  </div>
                </div>
                
                <el-divider>修复建议</el-divider>
                <p class="mb-3">{{ vuln.remediation }}</p>
                
                <div class="flex justify-end">
                  <el-button size="small" type="success" @click.stop="viewRemediationGuide(vuln.type)">
                    查看详细修复指南
                  </el-button>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-between">
          <el-button @click="showReportDialog = false">关闭</el-button>
          <div class="space-x-2">
            <el-dropdown @command="exportReport" trigger="click">
              <el-button type="primary" :loading="isExporting">
                导出报告 <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pdf">PDF格式</el-dropdown-item>
                  <el-dropdown-item command="html">HTML格式</el-dropdown-item>
                  <el-dropdown-item command="csv">CSV格式</el-dropdown-item>
                  <el-dropdown-item command="docx">Word格式</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="success" @click="shareReport">
              分享报告
            </el-button>
            <el-button type="primary" plain @click="generatePdfReport">
              生成PDF
            </el-button>
            <el-button type="danger" @click="confirmDelete(selectedReport?.id)" plain>
              删除报告
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
    
    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="确认删除"
      width="30%"
    >
      <p>您确定要删除此扫描报告吗？此操作无法撤销。</p>
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" @click="deleteReport" :loading="isDeleting">
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 分享对话框 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享安全报告"
      width="40%"
    >
      <div class="share-dialog-content">
        <p class="mb-4">您可以通过以下方式分享此安全报告：</p>
        
        <div class="mb-6">
          <h4 class="font-medium mb-2">通过邮件发送</h4>
          <el-form>
            <el-form-item>
              <el-input
                v-model="emailAddresses"
                placeholder="请输入接收者邮箱地址，多个邮箱请用逗号分隔"
                type="textarea"
                :rows="2"
              />
            </el-form-item>
          </el-form>
        </div>
        
        <div class="mb-6">
          <h4 class="font-medium mb-2">或通过链接分享</h4>
          <div class="flex space-x-2">
            <el-input
              v-model="reportLink"
              readonly
            />
            <el-button type="primary" @click="ElMessage.success('链接已复制到剪贴板')">
              复制
            </el-button>
          </div>
          <p class="text-xs text-gray-500 mt-1">此链接有效期为7天，访问需要授权</p>
        </div>
        
        <div>
          <h4 class="font-medium mb-2">导出格式选项</h4>
          <el-radio-group v-model="shareFormat">
            <el-radio label="pdf">PDF格式</el-radio>
            <el-radio label="html">HTML格式</el-radio>
            <el-radio label="docx">Word格式</el-radio>
          </el-radio-group>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-between">
          <el-button @click="showShareDialog = false">取消</el-button>
          <el-button type="primary" @click="sendEmailReport" :loading="isSendingEmail">
            发送
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'

const router = useRouter()

// 状态
const isLoading = ref(true)
const reports = ref([])
const showReportDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedReport = ref(null)
const reportToDelete = ref(null)
const isDeleting = ref(false)
const isExporting = ref(false)
const showShareDialog = ref(false)
const emailAddresses = ref('')
const isSendingEmail = ref(false)
const vulnChartRef = ref(null)
const selectedFilter = ref('all')
const shareFormat = ref('pdf')
const reportLink = ref('')
let vulnChart = null

// 初始化
onMounted(() => {
  loadReports()
})

// 加载报告列表
async function loadReports() {
  isLoading.value = true
  
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据 - 添加更多测试样本
    reports.value = [
      {
        id: 'SCN-2023-0001',
        url: 'https://example.com',
        scanDate: '2023-10-15T08:30:00Z',
        status: '已完成',
        vulnerabilities: 3,
        depth: '标准 (3)',
        duration: '00:02:34',
        vulnerabilityDetails: [
          {
            type: 'XSS跨站脚本攻击',
            severity: '高',
            location: '/search?q=',
            description: '搜索功能存在反射型XSS漏洞，可能导致恶意脚本注入。',
            impact: '攻击者可以在用户的浏览器中执行恶意脚本，窃取用户的会话信息或执行其他恶意操作。',
            evidence: '&lt;script&gt;alert("XSS")&lt;/script&gt; 被直接插入到了页面中而没有被转义。',
            remediation: '对所有用户输入进行适当的转义和过滤，使用Content-Security-Policy头部防止不受信任的脚本执行。'
          },
          {
            type: 'SQL注入漏洞',
            severity: '严重',
            location: '/user?id=',
            description: '用户查询页面存在SQL注入漏洞，可能导致未授权的数据库访问。',
            impact: '攻击者可以执行任意SQL查询，获取敏感数据，修改数据库内容，甚至在某些情况下获取服务器权限。',
            evidence: 'id=1 OR 1=1 返回了所有用户记录，表明SQL查询未经参数化处理。',
            remediation: '使用参数化查询或预处理语句，限制数据库用户权限，实施输入验证和过滤。'
          },
          {
            type: '敏感信息泄露',
            severity: '中',
            location: '/js/main.js',
            description: '前端JavaScript代码中发现了API密钥和其他敏感配置信息。',
            impact: '攻击者可以利用泄露的API密钥或配置信息访问受限资源或服务。',
            evidence: 'const API_KEY = "sk_test_abcdef123456";\nconst DB_CONFIG = { host: "db.example.com", user: "admin" };',
            remediation: '避免在前端代码中存储敏感信息，使用环境变量和后端API来管理密钥和配置。考虑使用代码混淆和最小化工具。'
          }
        ]
      },
      {
        id: 'SCN-2023-0002',
        url: 'https://secure-demo.org',
        scanDate: '2023-10-20T14:15:00Z',
        status: '已完成',
        vulnerabilities: 0,
        depth: '深度 (5)',
        duration: '00:08:12',
        vulnerabilityDetails: []
      },
      {
        id: 'SCN-2023-0003',
        url: 'https://test-vulnerability.net',
        scanDate: '2023-10-22T09:45:00Z',
        status: '已完成',
        vulnerabilities: 2,
        depth: '快速 (1)',
        duration: '00:01:05',
        vulnerabilityDetails: [
          {
            type: 'CSRF跨站请求伪造',
            severity: '中',
            location: '/account/settings',
            description: '用户设置页面没有实施CSRF保护机制。',
            impact: '攻击者可以诱使已认证用户在不知情的情况下执行非预期的操作，如更改密码或电子邮件。',
            evidence: '表单提交不包含CSRF令牌，且没有其他防护措施如检查Referer头。',
            remediation: '在所有状态改变操作中实施CSRF令牌，验证Referer/Origin头，考虑使用SameSite Cookie属性。'
          },
          {
            type: '缺少安全响应头',
            severity: '低',
            location: '全站',
            description: '网站缺少关键的安全HTTP响应头。',
            impact: '缺少适当的安全头可能使网站更容易受到各种攻击，如XSS、点击劫持和中间人攻击。',
            evidence: '缺少X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, Strict-Transport-Security等头部。',
            remediation: '配置Web服务器以发送适当的安全HTTP头，如X-Content-Type-Options: nosniff, X-Frame-Options: DENY, 以及适当的Content-Security-Policy。'
          }
        ]
      },
      {
        id: 'SCN-2023-0004',
        url: 'https://shop.example.org',
        scanDate: '2023-10-25T11:30:00Z',
        status: '已完成',
        vulnerabilities: 5,
        depth: '标准 (3)',
        duration: '00:04:20',
        vulnerabilityDetails: [
          {
            type: 'XSS跨站脚本攻击',
            severity: '高',
            location: '/product/reviews',
            description: '产品评论功能存在存储型XSS漏洞。',
            impact: '攻击者可以提交包含恶意脚本的评论，所有浏览该页面的用户都会执行该脚本。',
            evidence: '评论内容未经适当过滤即显示在页面上。',
            remediation: '对所有用户输入进行HTML编码，实施内容安全策略。'
          },
          {
            type: 'SQL注入漏洞',
            severity: '严重',
            location: '/product?category=',
            description: '产品分类查询存在SQL注入漏洞。',
            impact: '攻击者可以执行任意SQL查询，获取敏感数据。',
            evidence: 'category=1\' OR \'1\'=\'1 返回所有产品，表明存在SQL注入。',
            remediation: '使用参数化查询，对输入进行验证和过滤。'
          },
          {
            type: 'CSRF跨站请求伪造',
            severity: '中',
            location: '/cart/checkout',
            description: '结账功能未实施CSRF保护。',
            impact: '攻击者可以诱导用户在不知情的情况下完成购买。',
            evidence: '结账表单不包含CSRF令牌。',
            remediation: '为所有敏感操作实施CSRF令牌保护。'
          },
          {
            type: '敏感信息泄露',
            severity: '中',
            location: '/api/products',
            description: 'API端点暴露了敏感的商品信息。',
            impact: '攻击者可以获取未发布商品的详细信息。',
            evidence: 'API返回包含内部标记和定价策略的数据。',
            remediation: '实施API认证和授权，限制数据返回。'
          },
          {
            type: '不安全的文件上传',
            severity: '高',
            location: '/admin/products/upload',
            description: '产品图片上传功能允许上传任意文件类型。',
            impact: '攻击者可能上传恶意脚本文件并执行。',
            evidence: '成功上传了后缀为.php的文件。',
            remediation: '严格验证文件类型和内容，限制文件扩展名，将上传目录配置为不执行脚本。'
          }
        ]
      },
      {
        id: 'SCN-2023-0005',
        url: 'https://api.example.com',
        scanDate: '2023-10-26T16:45:00Z',
        status: '已完成',
        vulnerabilities: 3,
        depth: '深度 (4)',
        duration: '00:05:45',
        vulnerabilityDetails: [
          {
            type: 'API密钥泄露',
            severity: '严重',
            location: '/docs/examples',
            description: 'API文档示例中包含真实的API密钥。',
            impact: '攻击者可使用泄露的API密钥访问敏感资源。',
            evidence: '文档中显示: "Authorization: Bearer sk_live_12345abcdef"',
            remediation: '使用明显是示例的密钥(如"YOUR_API_KEY")，确保文档不包含真实凭证。'
          },
          {
            type: '缺少速率限制',
            severity: '高',
            location: '/api/auth',
            description: '认证端点没有实施速率限制。',
            impact: '攻击者可以进行暴力破解攻击。',
            evidence: '能够在短时间内发送大量认证请求而不被阻止。',
            remediation: '实施API速率限制，对失败的认证尝试增加延迟。'
          },
          {
            type: '授权缺陷',
            severity: '高',
            location: '/api/users',
            description: '用户API端点存在越权访问漏洞。',
            impact: '普通用户可以访问和修改其他用户的数据。',
            evidence: '使用普通用户令牌能够请求/api/users/admin的资源。',
            remediation: '实施严格的访问控制，验证用户只能访问自己的资源。'
          }
        ]
      }
    ]
  } catch (error) {
    console.error('加载报告失败:', error)
    ElMessage.error('加载报告失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 计算属性：按漏洞严重性筛选
const filteredVulnerabilities = computed(() => {
  if (!selectedReport.value) return []
  
  const vulns = selectedReport.value.vulnerabilityDetails || []
  
  if (selectedFilter.value === 'all') {
    return vulns
  } else {
    return vulns.filter(v => {
      if (selectedFilter.value === 'high') return v.severity === '高' || v.severity === '严重'
      if (selectedFilter.value === 'medium') return v.severity === '中'
      if (selectedFilter.value === 'low') return v.severity === '低'
      return true
    })
  }
})

// 查看报告详情
function viewReport(id) {
  const report = reports.value.find(r => r.id === id)
  if (report) {
    selectedReport.value = report
    showReportDialog.value = true
    selectedFilter.value = 'all'
    
    // 初始化图表
    setTimeout(() => {
      initVulnerabilityChart()
    }, 300)
  }
}

// 确认删除
function confirmDelete(id) {
  if (!id) return
  
  reportToDelete.value = id
  showReportDialog.value = false
  showDeleteDialog.value = true
}

// 删除报告
async function deleteReport() {
  if (!reportToDelete.value) return
  
  isDeleting.value = true
  
  try {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 删除报告
    reports.value = reports.value.filter(r => r.id !== reportToDelete.value)
    
    ElMessage({
      type: 'success',
      message: '报告已成功删除'
    })
    
    showDeleteDialog.value = false
    reportToDelete.value = null
  } catch (error) {
    console.error('删除报告失败:', error)
    ElMessage.error('删除报告失败，请稍后重试')
  } finally {
    isDeleting.value = false
  }
}

// 导出报告
async function exportReport(format = 'pdf') {
  if (!selectedReport.value) return
  
  isExporting.value = true
  
  try {
    // 模拟导出过程
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    ElMessage({
      type: 'success',
      message: `报告已成功导出为${format.toUpperCase()}格式`
    })
  } catch (error) {
    console.error('导出报告失败:', error)
    ElMessage.error('导出报告失败，请稍后重试')
  } finally {
    isExporting.value = false
  }
}

// 分享报告
function shareReport() {
  if (!selectedReport.value) return
  showReportDialog.value = false
  showShareDialog.value = true
  emailAddresses.value = ''
  // 设置分享链接
  reportLink.value = 'https://secure-scout.example.com/reports/' + selectedReport.value.id
}

// 发送邮件报告
async function sendEmailReport() {
  if (!emailAddresses.value.trim()) {
    ElMessage.warning('请输入有效的邮箱地址')
    return
  }
  
  isSendingEmail.value = true
  
  try {
    // 模拟发送邮件过程
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    ElMessage({
      type: 'success',
      message: `报告已成功发送至: ${emailAddresses.value}`
    })
    
    showShareDialog.value = false
  } catch (error) {
    console.error('发送邮件失败:', error)
    ElMessage.error('发送邮件失败，请稍后重试')
  } finally {
    isSendingEmail.value = false
  }
}

// 开始新扫描
function startNewScan() {
  router.push('/scan')
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '-'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (e) {
    return dateString
  }
}

// 获取状态类型
function getStatusType(status) {
  if (status === '已完成') return 'success'
  if (status === '进行中') return 'primary'
  if (status === '失败') return 'danger'
  return 'info'
}

// 获取严重程度类型
function getSeverityType(severity) {
  if (severity === '严重' || severity === '高') return 'danger'
  if (severity === '中') return 'warning'
  if (severity === '低') return 'info'
  return 'info'
}

// 初始化漏洞图表
function initVulnerabilityChart() {
  if (!vulnChartRef.value || !selectedReport.value) return
  
  const vulns = selectedReport.value.vulnerabilityDetails || []
  if (vulns.length === 0) return
  
  // 销毁旧图表实例
  if (vulnChart) {
    vulnChart.dispose()
  }
  
  // 确保DOM元素可见
  if (vulnChartRef.value && vulnChartRef.value.offsetHeight > 0) {
    // 创建新图表实例
    vulnChart = echarts.init(vulnChartRef.value)
    
    // 准备数据
    const severityCounts = {
      '严重': 0,
      '高': 0,
      '中': 0,
      '低': 0
    }
    
    const typeCounts = {}
    
    vulns.forEach(vuln => {
      // 计算严重程度分布
      if (vuln.severity === '严重' || vuln.severity === '高') {
        severityCounts[vuln.severity]++
      } else {
        severityCounts[vuln.severity]++
      }
      
      // 计算类型分布
      typeCounts[vuln.type] = (typeCounts[vuln.type] || 0) + 1
    })
    
    // 准备图表数据
    const severityData = Object.entries(severityCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }))
    
    const typeData = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
    
    // 设置图表配置
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: typeData.map(item => item.name)
      },
      series: [
        {
          name: '漏洞严重程度',
          type: 'pie',
          radius: ['40%', '60%'],
          center: ['30%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          data: severityData.map(item => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: item.name === '严重' || item.name === '高' ? '#F56C6C' : 
                    item.name === '中' ? '#E6A23C' : '#67C23A'
            }
          }))
        },
        {
          name: '漏洞类型',
          type: 'pie',
          radius: ['0%', '30%'],
          center: ['30%', '50%'],
          label: {
            position: 'inner',
            fontSize: 12
          },
          data: typeData
        }
      ]
    }
    
    // 应用配置
    vulnChart.setOption(option)
    
    // 添加窗口缩放监听
    window.addEventListener('resize', () => {
      vulnChart && vulnChart.resize()
    })
  }
}

// 生成PDF格式报告
async function generatePdfReport() {
  if (!selectedReport.value) return
  
  try {
    ElMessage.info('正在准备打印PDF报告，请稍候...')
    
    // 使用浏览器原生打印功能
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      throw new Error('请允许浏览器打开弹窗以生成PDF')
    }
    
    // 构建报告HTML
    const reportHtml = `
      <div class="pdf-template">
        <div class="report-header">
          <h1>Web安全扫描报告</h1>
          <div class="report-meta">
            <p><strong>报告ID:</strong> ${selectedReport.value.id}</p>
            <p><strong>目标URL:</strong> ${selectedReport.value.url}</p>
            <p><strong>扫描时间:</strong> ${formatDate(selectedReport.value.scanDate)}</p>
            <p><strong>扫描状态:</strong> ${selectedReport.value.status}</p>
            <p><strong>扫描深度:</strong> ${selectedReport.value.depth}</p>
            <p><strong>扫描时长:</strong> ${selectedReport.value.duration}</p>
          </div>
        </div>

        <div class="vulnerability-summary">
          <h2>漏洞统计</h2>
          <p>发现漏洞总数: ${selectedReport.value.vulnerabilities || 0}</p>
        </div>

        ${selectedReport.value.vulnerabilityDetails && selectedReport.value.vulnerabilityDetails.length > 0 
          ? `<div class="vulnerability-details">
              <h2>漏洞详情</h2>
              ${selectedReport.value.vulnerabilityDetails.map((vuln, index) => `
                <div class="vulnerability-item">
                  <h3>${index + 1}. ${vuln.type} (${vuln.severity})</h3>
                  <p><strong>位置:</strong> ${vuln.location}</p>
                  <p><strong>描述:</strong> ${vuln.description}</p>
                  <p><strong>影响:</strong> ${vuln.impact}</p>
                  <p><strong>证据:</strong> ${vuln.evidence}</p>
                  <p><strong>修复建议:</strong> ${vuln.remediation}</p>
                </div>
              `).join('')}
            </div>`
          : '<div class="no-vulnerabilities"><p>未发现安全漏洞，请继续保持良好的安全实践。</p></div>'
        }
      </div>
    `
    
    // 设置打印窗口内容
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>安全扫描报告 - ${selectedReport.value.id}</title>
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
          .no-vulnerabilities {
            padding: 20px;
            background-color: #f0f9eb;
            border-radius: 5px;
            color: #67c23a;
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
        ${reportHtml}
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
    
    ElMessage.success('PDF打印窗口已打开，请选择"保存为PDF"选项')
  } catch (error) {
    console.error('生成PDF时出错:', error)
    ElMessage.error('生成PDF失败: ' + error.message)
  }
}

// 跳转到漏洞修复指南
function viewRemediationGuide(vulnType) {
  ElMessage({
    type: 'info',
    message: `正在打开${vulnType}修复指南...`
  })
}
</script>

<style scoped>
.reports-view {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.vuln-detail {
  font-size: 14px;
  line-height: 1.6;
}
</style> 