<template>
  <div class="scan-component">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">开始安全扫描</h2>
      
      <!-- 扫描表单 -->
      <el-form
        ref="scanFormRef"
        :model="scanForm"
        :rules="rules"
        label-position="top"
        class="mb-6"
      >
        <el-form-item label="目标网址" prop="url">
          <el-input 
            v-model="scanForm.url" 
            placeholder="请输入目标网站URL (例如: https://example.com)" 
            :disabled="isScanning"
            clearable
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
            <template #append>
              <el-popover
                placement="top"
                width="200"
                trigger="click"
              >
                <template #reference>
                  <el-button>历史</el-button>
                </template>
                <div>
                  <p class="text-xs text-gray-500 mb-2">最近扫描过的网站:</p>
                  <div v-if="recentlyScannedUrls.length === 0" class="text-center text-gray-400 text-xs">暂无历史记录</div>
                  <ul class="max-h-40 overflow-auto">
                    <li 
                      v-for="(url, idx) in recentlyScannedUrls" 
                      :key="idx"
                      class="cursor-pointer hover:bg-gray-100 p-1 text-sm text-blue-500 truncate"
                      @click="selectRecentUrl(url)"
                    >
                      {{ url }}
                    </li>
                  </ul>
                </div>
              </el-popover>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="扫描选项">
          <div class="flex flex-wrap gap-3">
            <el-checkbox 
              v-model="scanForm.options.xss" 
              label="XSS漏洞检测" 
              :disabled="isScanning"
            />
            <el-checkbox 
              v-model="scanForm.options.sqlInjection" 
              label="SQL注入检测" 
              :disabled="isScanning"
            />
            <el-checkbox 
              v-model="scanForm.options.csrf" 
              label="CSRF漏洞检测" 
              :disabled="isScanning"
            />
            <el-checkbox 
              v-model="scanForm.options.fileInclusion" 
              label="文件包含漏洞" 
              :disabled="isScanning"
            />
            <el-checkbox 
              v-model="scanForm.options.directoryTraversal" 
              label="目录遍历漏洞" 
              :disabled="isScanning"
            />
            <el-checkbox 
              v-model="scanForm.options.ssrf" 
              label="SSRF漏洞" 
              :disabled="isScanning"
            />
          </div>
          
          <div class="flex justify-between mt-2">
            <el-button size="small" @click="selectBasicOptions" :disabled="isScanning">基础选项</el-button>
            <el-button size="small" @click="selectAllOptions" :disabled="isScanning">全选</el-button>
            <el-button size="small" @click="selectNoOptions" :disabled="isScanning">清空</el-button>
            <el-popover
              placement="top"
              width="300"
              trigger="click"
            >
              <template #reference>
                <el-button size="small" type="primary" :disabled="isScanning">加载模板</el-button>
              </template>
              <div>
                <p class="font-medium mb-2">扫描模板</p>
                <div class="mb-4 space-y-2">
                  <div 
                    v-for="template in scanTemplates" 
                    :key="template.name"
                    class="hover:bg-gray-50 p-2 rounded cursor-pointer"
                    @click="loadTemplate(template)"
                  >
                    <div class="flex justify-between">
                      <span class="font-medium">{{ template.name }}</span>
                      <el-tag size="small" :type="getTemplateTagType(template.level)">{{ template.level }}</el-tag>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">{{ template.description }}</p>
                  </div>
                </div>
              </div>
            </el-popover>
          </div>
        </el-form-item>
        
        <el-form-item label="扫描深度" prop="depth">
          <el-slider
            v-model="scanForm.depth"
            :min="1"
            :max="5"
            :disabled="isScanning"
            :marks="{
              1: '快速',
              3: '标准',
              5: '深度'
            }"
          />
          
          <div class="text-xs text-gray-500 mt-1">
            <span v-if="scanForm.depth === 1">预计时间: 1-2分钟</span>
            <span v-else-if="scanForm.depth === 2">预计时间: 2-5分钟</span>
            <span v-else-if="scanForm.depth === 3">预计时间: 5-10分钟</span>
            <span v-else-if="scanForm.depth === 4">预计时间: 10-15分钟</span>
            <span v-else>预计时间: 15-30分钟</span>
          </div>
        </el-form-item>
        
        <el-divider />
        
        <el-form-item>
          <div class="flex items-center">
            <el-button 
              type="primary" 
              :loading="isScanning" 
              @click="submitForm"
              class="mr-4"
            >
              {{ isScanning ? '扫描中...' : '开始扫描' }}
            </el-button>
            
            <el-button 
              @click="resetForm" 
              :disabled="isScanning"
            >
              重置
            </el-button>
            
            <div v-if="isScanning" class="ml-auto flex items-center">
              <span class="text-primary mr-2">扫描进度：</span>
              <el-progress 
                :percentage="scanProgress" 
                :status="scanProgress === 100 ? 'success' : ''"
                class="w-32"
              />
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <!-- 扫描状态 -->
      <div v-if="isScanning || lastScanResult" class="mt-4">
        <el-divider>
          {{ isScanning ? '实时扫描信息' : '最近扫描结果' }}
        </el-divider>
        
        <div v-if="isScanning" class="bg-gray-50 p-4 rounded-md">
          <div class="mb-2 flex items-center">
            <el-icon class="mr-2 text-primary animate-spin"><Loading /></el-icon>
            <span>正在扫描 {{ scanForm.url }}</span>
            <el-tag size="small" type="warning" class="ml-2">{{ getStageLabel() }}</el-tag>
          </div>
          
          <div class="relative my-4 border border-gray-200 rounded-md">
            <div class="absolute top-0 left-0 bg-blue-50 h-full transition-all duration-500" :style="{ width: `${scanProgress}%` }"></div>
            <div class="relative z-10 flex justify-between px-4 py-2">
              <div class="flex flex-col items-center">
                <div :class="scanStage >= 1 ? 'bg-blue-500' : 'bg-gray-300'" class="rounded-full w-6 h-6 flex items-center justify-center text-white text-xs mb-1">1</div>
                <span class="text-xs">准备</span>
              </div>
              <div class="flex flex-col items-center">
                <div :class="scanStage >= 2 ? 'bg-blue-500' : 'bg-gray-300'" class="rounded-full w-6 h-6 flex items-center justify-center text-white text-xs mb-1">2</div>
                <span class="text-xs">爬取</span>
              </div>
              <div class="flex flex-col items-center">
                <div :class="scanStage >= 3 ? 'bg-blue-500' : 'bg-gray-300'" class="rounded-full w-6 h-6 flex items-center justify-center text-white text-xs mb-1">3</div>
                <span class="text-xs">检测</span>
              </div>
              <div class="flex flex-col items-center">
                <div :class="scanStage >= 4 ? 'bg-blue-500' : 'bg-gray-300'" class="rounded-full w-6 h-6 flex items-center justify-center text-white text-xs mb-1">4</div>
                <span class="text-xs">分析</span>
              </div>
              <div class="flex flex-col items-center">
                <div :class="scanStage >= 5 ? 'bg-blue-500' : 'bg-gray-300'" class="rounded-full w-6 h-6 flex items-center justify-center text-white text-xs mb-1">5</div>
                <span class="text-xs">完成</span>
              </div>
            </div>
          </div>
          
          <div class="text-sm text-gray-600 mt-3 h-40 overflow-auto border border-gray-200 rounded-md p-2 bg-white">
            <p v-for="(log, index) in scanLogs" :key="index" class="mb-1">
              <span class="text-gray-500 mr-2">[{{ log.time }}]</span>
              <span :class="{ 'text-red-500': log.type === 'error', 'text-yellow-500': log.type === 'warning', 'text-green-500': log.type === 'success' }">
                {{ log.message }}
              </span>
            </p>
          </div>
          
          <div class="mt-3 text-xs text-gray-500">
            <div class="flex justify-between">
              <span>已发现页面: {{ pagesFound }}</span>
              <span>已检测表单: {{ formsScanned }}</span>
              <span>扫描耗时: {{ formatElapsedTime() }}</span>
            </div>
          </div>
        </div>
        
        <div v-else-if="lastScanResult" class="mt-4">
          <div class="bg-gray-50 p-4 rounded-md" :class="{
            'bg-red-50': lastScanResult.vulnerabilitiesFound > 0,
            'bg-green-50': lastScanResult.vulnerabilitiesFound === 0
          }">
            <div class="flex">
              <div class="mr-4">
                <el-icon class="text-3xl" :class="{
                  'text-red-500': lastScanResult.vulnerabilitiesFound > 0,
                  'text-green-500': lastScanResult.vulnerabilitiesFound === 0
                }">
                  <CircleCheckFilled v-if="lastScanResult.vulnerabilitiesFound === 0" />
                  <WarningFilled v-else />
                </el-icon>
              </div>
              
              <div class="flex-1">
                <h3 class="font-semibold text-lg">扫描完成</h3>
                <div class="flex justify-between items-center mt-1">
                  <p v-if="lastScanResult.vulnerabilitiesFound === 0" class="text-green-600 font-medium">
                    恭喜！未发现安全漏洞
                  </p>
                  <p v-else class="text-red-600 font-medium">
                    发现 {{ lastScanResult.vulnerabilitiesFound }} 个潜在安全漏洞
                  </p>
                  <span class="text-sm text-gray-500">
                    扫描耗时: {{ lastScanResult.duration }}
                  </span>
                </div>
                
                <div class="grid grid-cols-4 gap-3 mt-3 text-center">
                  <div class="bg-white rounded p-2 shadow-sm">
                    <div class="text-lg font-bold text-blue-600">{{ pagesScanned }}</div>
                    <div class="text-xs text-gray-500">页面扫描</div>
                  </div>
                  <div class="bg-white rounded p-2 shadow-sm">
                    <div class="text-lg font-bold text-blue-600">{{ formsScanned }}</div>
                    <div class="text-xs text-gray-500">表单检测</div>
                  </div>
                  <div class="bg-white rounded p-2 shadow-sm">
                    <div class="text-lg font-bold text-blue-600">{{ jsFilesScanned }}</div>
                    <div class="text-xs text-gray-500">JS文件</div>
                  </div>
                  <div class="bg-white rounded p-2 shadow-sm">
                    <div class="text-lg font-bold" :class="lastScanResult.vulnerabilitiesFound > 0 ? 'text-red-600' : 'text-green-600'">
                      {{ lastScanResult.vulnerabilitiesFound }}
                    </div>
                    <div class="text-xs text-gray-500">漏洞发现</div>
                  </div>
                </div>
                
                <div class="mt-3 flex justify-between">
                  <div>
                    <el-button type="primary" @click="viewScanReport">
                      查看完整报告
                    </el-button>
                    <el-button @click="newScan">
                      新建扫描
                    </el-button>
                  </div>
                  <el-button type="primary" plain :disabled="!lastScanResult.url" @click="rescanUrl">
                    再次扫描
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 安全扫描说明 -->
    <div class="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 class="text-xl font-semibold mb-4">安全扫描说明</h2>
      
      <div class="space-y-4 text-gray-700">
        <p>
          网站安全扫描工具可帮助您发现网站中潜在的安全漏洞，对网站进行全面安全评估。通过模拟黑客攻击方式，检测网站是否存在各类常见安全隐患。
        </p>
        
        <el-collapse>
          <el-collapse-item title="支持的扫描类型" name="1">
            <div class="space-y-2 pl-4">
              <p><strong>XSS漏洞</strong>：检测网站是否存在跨站脚本攻击漏洞，此类漏洞可能导致攻击者在用户浏览器中执行恶意代码。</p>
              <p><strong>SQL注入</strong>：检测网站是否存在SQL注入漏洞，此类漏洞可能导致攻击者未经授权访问或修改数据库信息。</p>
              <p><strong>CSRF漏洞</strong>：检测网站是否存在跨站请求伪造漏洞，此类漏洞可能导致攻击者以用户身份执行恶意操作。</p>
              <p><strong>文件包含漏洞</strong>：检测网站是否允许未经授权包含或访问敏感文件。</p>
              <p><strong>目录遍历漏洞</strong>：检测网站是否允许访问网站目录结构之外的文件。</p>
              <p><strong>SSRF漏洞</strong>：检测网站是否存在服务器端请求伪造漏洞，此类漏洞可能导致服务器访问内部资源。</p>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="扫描深度说明" name="2">
            <div class="space-y-2 pl-4">
              <p><strong>快速扫描 (级别1)</strong>：只扫描网站首页和直接链接，适合快速检查。预计时间：1-2分钟。</p>
              <p><strong>标准扫描 (级别3)</strong>：深入扫描网站主要功能和常见入口点，适合定期安全检查。预计时间：5-10分钟。</p>
              <p><strong>深度扫描 (级别5)</strong>：全面扫描网站所有可访问页面和功能，进行详细的安全分析。预计时间：15-30分钟。</p>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="注意事项" name="3">
            <div class="space-y-2 pl-4">
              <p>1. 建议在非生产环境或低流量时段进行扫描，以避免对网站性能造成影响。</p>
              <p>2. 深度扫描可能会触发网站安全防护机制，如WAF或DDoS防护。</p>
              <p>3. 扫描结果仅供参考，建议结合专业安全团队的评估进行修复。</p>
              <p>4. 未经授权对第三方网站进行安全扫描可能违反法律法规，请确保您有权对目标网站进行扫描。</p>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  Link,
  Loading,
  CircleCheckFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import { scanApi } from '@/api'
import { useScanStore } from '@/store/scanStore'

const router = useRouter()
const scanStore = useScanStore()
const scanFormRef = ref(null)

const props = defineProps({
  initialUrl: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['scan-complete', 'scan-started'])

// 扫描模板
const scanTemplates = [
  {
    name: '基础安全检查',
    description: '检测最常见的XSS和SQL注入漏洞',
    level: '基础',
    options: {
      xss: true,
      sqlInjection: true,
      csrf: false,
      fileInclusion: false,
      directoryTraversal: false,
      ssrf: false
    },
    depth: 2
  },
  {
    name: '标准安全检测',
    description: '检测常见Web应用安全漏洞',
    level: '标准',
    options: {
      xss: true,
      sqlInjection: true,
      csrf: true,
      fileInclusion: true,
      directoryTraversal: false,
      ssrf: false
    },
    depth: 3
  },
  {
    name: '全面深度扫描',
    description: '全面扫描所有类型的安全漏洞',
    level: '高级',
    options: {
      xss: true,
      sqlInjection: true,
      csrf: true,
      fileInclusion: true,
      directoryTraversal: true,
      ssrf: true
    },
    depth: 5
  }
]

// 获取模板标签类型
function getTemplateTagType(level) {
  if (level === '基础') return 'info'
  if (level === '标准') return 'warning'
  return 'danger'
}

// 加载模板
function loadTemplate(template) {
  scanForm.options = { ...template.options }
  scanForm.depth = template.depth
  ElMessage.success(`已加载"${template.name}"模板`)
}

// 扫描表单
const scanForm = reactive({
  url: props.initialUrl,
  options: {
    xss: true,
    sqlInjection: true,
    csrf: false,
    fileInclusion: false,
    directoryTraversal: false,
    ssrf: false
  },
  depth: 3
})

// 监视initialUrl属性的变化，自动填充URL并可选启动扫描
watch(() => props.initialUrl, (newUrl) => {
  if (newUrl && !isScanning.value) {
    scanForm.url = newUrl
    // 如果URL是从"重新扫描"跳转过来的，延迟一小段时间后自动开始扫描
    setTimeout(() => {
      submitForm()
    }, 1000)
  }
}, { immediate: true })

// 表单验证规则
const rules = {
  url: [
    { required: true, message: '请输入目标网址', trigger: 'blur' },
    { 
      pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      message: '请输入有效的URL地址',
      trigger: 'blur'
    }
  ]
}

// 历史记录
const recentlyScannedUrls = ref([
  'https://example.com',
  'https://test-site.org',
  'https://demo.websecurity.com'
])

// 选择历史URL
function selectRecentUrl(url) {
  scanForm.url = url
  ElMessage.success('已选择历史URL')
}

// 扫描状态
const isScanning = ref(false)
const scanProgress = ref(0)
const scanStage = ref(0)
const scanStartTime = ref(null)
const scanLogs = ref([])
const lastScanResult = ref(null)

// 扫描统计
const pagesFound = ref(0)
const pagesScanned = ref(0)
const formsScanned = ref(0)
const jsFilesScanned = ref(0)

// 获取当前阶段标签
function getStageLabel() {
  const stages = ['准备中', '爬取中', '检测中', '分析中', '完成']
  return stages[scanStage.value - 1] || '等待中'
}

// 格式化已用时间
function formatElapsedTime() {
  if (!scanStartTime.value) return '00:00:00'
  
  const elapsed = Date.now() - scanStartTime.value
  const seconds = Math.floor((elapsed / 1000) % 60)
  const minutes = Math.floor((elapsed / (1000 * 60)) % 60)
  const hours = Math.floor(elapsed / (1000 * 60 * 60))
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 选择基础选项
function selectBasicOptions() {
  scanForm.options = {
    xss: true,
    sqlInjection: true,
    csrf: false,
    fileInclusion: false,
    directoryTraversal: false,
    ssrf: false
  }
  ElMessage.success('已选择基础扫描选项')
}

// 选择所有选项
function selectAllOptions() {
  Object.keys(scanForm.options).forEach(key => {
    scanForm.options[key] = true
  })
  ElMessage.success('已选择所有扫描选项')
}

// 清空所有选项
function selectNoOptions() {
  Object.keys(scanForm.options).forEach(key => {
    scanForm.options[key] = false
  })
  ElMessage.warning('已清空所有扫描选项')
}

// 再次扫描上次URL
function rescanUrl() {
  if (lastScanResult.value && lastScanResult.value.url) {
    scanForm.url = lastScanResult.value.url
    lastScanResult.value = null
    submitForm()
  }
}

// 提交表单
function submitForm() {
  if (!scanFormRef.value) return
  
  scanFormRef.value.validate(async (valid) => {
    if (valid) {
      startScan()
    }
  })
}

// 重置表单
function resetForm() {
  if (!scanFormRef.value) return
  
  scanFormRef.value.resetFields()
  scanForm.options = {
    xss: true,
    sqlInjection: true,
    csrf: false,
    fileInclusion: false,
    directoryTraversal: false,
    ssrf: false
  }
  scanForm.depth = 3
  
  scanLogs.value = []
  lastScanResult.value = null
}

// 新建扫描
function newScan() {
  lastScanResult.value = null
}

// 查看完整报告
function viewScanReport() {
  router.push('/reports')
}

// 启动扫描
async function startScan() {
  try {
    isScanning.value = true
    scanStartTime.value = Date.now()
    scanProgress.value = 0
    scanStage.value = 1
    pagesFound.value = 0
    formsScanned.value = 0
    scanLogs.value = []
    
    // 记录开始日志
    addScanLog('开始扫描: ' + scanForm.url, 'info')
    
    // 将URL添加到最近扫描历史
    addToRecentUrls(scanForm.url)
    
    // 获取启用的模块
    const enabledModules = []
    for (const [key, value] of Object.entries(scanForm.options)) {
      if (value) {
        enabledModules.push(key)
      }
    }
    
    // 创建扫描任务
    const scanId = await scanStore.createScan(scanForm.url, enabledModules)
    
    // 触发scan-started事件
    emit('scan-started', { 
      scanId, 
      url: scanForm.url,
      modules: enabledModules 
    })
    
    // 模拟扫描过程
    simulateScanProcess(scanId)
  } catch (error) {
    console.error('启动扫描失败:', error)
    ElMessage.error('启动扫描失败: ' + (error.message || '未知错误'))
    isScanning.value = false
  }
}

// 模拟扫描进度的函数
function simulateScanProcess(scanId) {
  // 根据深度调整扫描时间
  const totalTime = scanForm.depth * 20000 // 每个深度级别20秒
  const updateInterval = 500 // 每500ms更新一次状态
  const totalUpdates = totalTime / updateInterval
  
  let currentUpdate = 0
  
  // 初始阶段 - 准备阶段
  scanStage.value = 1
  addScanLog('正在初始化扫描环境...', 'info')
  setTimeout(() => {
    addScanLog('正在检查目标网站可访问性...', 'info')
  }, 1000)
  
  const intervalId = setInterval(() => {
    currentUpdate++
    const progress = Math.min(99, Math.floor((currentUpdate / totalUpdates) * 100))
    scanProgress.value = progress
    
    // 根据进度更新阶段和日志
    if (progress >= 15 && scanStage.value < 2) {
      scanStage.value = 2 // 爬取阶段
      addScanLog('网站可访问，开始爬取页面...', 'info')
      setTimeout(() => {
        pagesFound.value = Math.floor(Math.random() * 10) + 5
        addScanLog(`发现 ${pagesFound.value} 个页面和链接`, 'info')
      }, 1000)
    }
    
    if (progress >= 40 && scanStage.value < 3) {
      scanStage.value = 3 // 检测阶段
      addScanLog('开始检测潜在漏洞...', 'info')
      
      // 模拟发现表单
      formsScanned.value = Math.floor(Math.random() * 5) + 1
      addScanLog(`检测到 ${formsScanned.value} 个表单`, 'info')
      
      // 模拟发现JS文件
      jsFilesScanned.value = Math.floor(Math.random() * 8) + 3
      addScanLog(`分析 ${jsFilesScanned.value} 个JavaScript文件`, 'info')
      
      // 根据选中的选项生成漏洞日志
      setTimeout(() => {
        if (scanForm.options.xss) {
          if (Math.random() > 0.7) {
            addScanLog('发现潜在XSS漏洞: 表单输入未过滤', 'warning')
          }
        }
      }, 2000)
      
      setTimeout(() => {
        if (scanForm.options.sqlInjection) {
          if (Math.random() > 0.6) {
            addScanLog('发现潜在SQL注入漏洞: 查询参数未使用预处理', 'warning')
          }
        }
      }, 3500)
      
      setTimeout(() => {
        if (scanForm.options.fileInclusion) {
          if (Math.random() > 0.8) {
            addScanLog('发现潜在文件包含漏洞: 路径拼接不安全', 'warning')
          }
        }
      }, 5000)
    }
    
    if (progress >= 70 && scanStage.value < 4) {
      scanStage.value = 4 // 分析阶段
      addScanLog('正在分析收集的数据...', 'info')
      
      setTimeout(() => {
        // 计算扫描过的页面数
        pagesScanned.value = pagesFound.value
        addScanLog(`已完成 ${pagesScanned.value} 个页面的分析`, 'info')
      }, 1000)
    }
    
    if (progress >= 95) {
      scanStage.value = 5 // 完成阶段
      clearInterval(intervalId)
      
      // 模拟完成
      setTimeout(() => {
        completeScan(scanId)
      }, 1000)
    }
  }, updateInterval)
}

// 完成扫描
function completeScan(scanId) {
  // 更新状态
  isScanning.value = false
  scanProgress.value = 100
  
  // 计算发现的漏洞数
  const vulnerabilitiesFound = scanLogs.value.filter(log => log.type === 'warning').length
  
  // 添加最后的日志
  addScanLog(`扫描完成。发现 ${vulnerabilitiesFound} 个潜在安全漏洞。`, 
    vulnerabilitiesFound > 0 ? 'warning' : 'success')
  
  // 更新结果
  lastScanResult.value = {
    scanId: scanId,
    url: scanForm.url,
    scanDate: new Date().toISOString(),
    vulnerabilitiesFound,
    duration: formatElapsedTime()
  }
  
  // 显示通知
  ElMessage({
    message: vulnerabilitiesFound > 0 
      ? `扫描完成，发现 ${vulnerabilitiesFound} 个潜在安全漏洞。` 
      : '扫描完成，未发现安全漏洞。',
    type: vulnerabilitiesFound > 0 ? 'warning' : 'success'
  })
  
  // 触发扫描完成事件
  emit('scan-complete', lastScanResult.value)
}

// 添加扫描日志
function addScanLog(message, type = 'info') {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('zh-CN')
  
  scanLogs.value.push({
    time: timeStr,
    message,
    type
  })
  
  // 保持日志不会太长
  if (scanLogs.value.length > 50) {
    scanLogs.value.shift()
  }
}

// 添加URL到最近扫描历史
function addToRecentUrls(url) {
  if (!recentlyScannedUrls.value.includes(url)) {
    recentlyScannedUrls.value.unshift(url)
    if (recentlyScannedUrls.value.length > 5) {
      recentlyScannedUrls.value.pop()
    }
    // 保存到localStorage
    localStorage.setItem('recentScannedUrls', JSON.stringify(recentlyScannedUrls.value))
  }
}

// 生命周期钩子
onMounted(() => {
  // 可以在这里加载历史记录等
})
</script>

<style scoped>
.scan-component {
  width: 100%;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style> 