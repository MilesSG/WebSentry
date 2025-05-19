<template>
  <div class="settings-container p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">安全设置</h1>
      <div>
        <el-button @click="goBack">
          <el-icon class="mr-1"><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">扫描配置</h2>
      
      <el-form 
        :model="scanConfig" 
        label-position="top" 
        class="max-w-3xl"
      >
        <el-form-item label="扫描超时设置 (秒)">
          <el-slider 
            v-model="scanConfig.timeout" 
            :min="10" 
            :max="300" 
            :step="10"
            show-input
          />
        </el-form-item>
        
        <el-form-item label="最大并发扫描任务数">
          <el-radio-group v-model="scanConfig.concurrent_scans">
            <el-radio-button :label="1">1</el-radio-button>
            <el-radio-button :label="3">3</el-radio-button>
            <el-radio-button :label="5">5</el-radio-button>
            <el-radio-button :label="10">10</el-radio-button>
          </el-radio-group>
          <div class="text-sm text-gray-500 mt-1">
            允许同时进行的最大扫描任务数，较高的设置可能会影响系统性能
          </div>
        </el-form-item>
        
        <el-form-item label="浏览器用户代理">
          <el-input v-model="scanConfig.user_agent" />
          <div class="text-sm text-gray-500 mt-1">
            扫描时使用的用户代理标识
          </div>
        </el-form-item>
        
        <el-divider />
        
        <h3 class="font-semibold mb-4">默认启用的扫描模块</h3>
        <div class="flex flex-wrap gap-3">
          <el-checkbox 
            v-for="(def, key) in scanConfig.vulnerability_definitions" 
            :key="key"
            v-model="scanConfig.default_modules"
            :label="key"
          >
            {{ moduleLabels[key] || key }}
            <el-tag size="small" class="ml-1" :type="getSeverityType(def.severity)">
              {{ def.severity }}
            </el-tag>
          </el-checkbox>
        </div>
        
        <el-divider />
        
        <div class="flex justify-between mt-4">
          <el-button @click="resetConfig">
            恢复默认设置
          </el-button>
          <el-button type="primary" @click="saveConfig">
            保存设置
          </el-button>
        </div>
      </el-form>
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">通知设置</h2>
      
      <el-form label-position="top" class="max-w-3xl">
        <el-form-item label="电子邮件通知">
          <el-switch v-model="notificationSettings.email.enabled" />
          <div class="text-sm text-gray-500 mt-1">
            启用后，扫描完成时将自动发送报告到指定邮箱
          </div>
        </el-form-item>
        
        <el-form-item label="通知接收邮箱" v-if="notificationSettings.email.enabled">
          <el-input v-model="notificationSettings.email.address" placeholder="输入接收通知的邮箱地址" />
        </el-form-item>
        
        <el-form-item label="通知条件">
          <el-checkbox v-model="notificationSettings.onComplete">扫描完成时</el-checkbox>
          <el-checkbox v-model="notificationSettings.onVulnerabilityFound">发现漏洞时</el-checkbox>
          <el-checkbox v-model="notificationSettings.onHighRisk">发现高风险漏洞时</el-checkbox>
        </el-form-item>
        
        <div class="flex justify-end mt-4">
          <el-button type="primary" @click="saveNotificationSettings">
            保存通知设置
          </el-button>
        </div>
      </el-form>
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">账户安全</h2>
      
      <el-form label-position="top" class="max-w-3xl">
        <el-form-item label="API密钥">
          <div class="flex items-center">
            <el-input 
              v-model="apiKey" 
              placeholder="无API密钥" 
              :type="showApiKey ? 'text' : 'password'"
              class="mr-2"
              readonly
            />
            <el-button @click="showApiKey = !showApiKey">
              {{ showApiKey ? '隐藏' : '显示' }}
            </el-button>
            <el-button type="primary" @click="regenerateApiKey">
              重新生成
            </el-button>
          </div>
          <div class="text-sm text-gray-500 mt-1">
            用于API访问，请妥善保管
          </div>
        </el-form-item>
        
        <el-form-item label="双因素认证">
          <el-switch v-model="securitySettings.twoFactor" />
          <div class="text-sm text-gray-500 mt-1">
            增强账户安全，登录时需要额外验证
          </div>
        </el-form-item>
        
        <div class="flex justify-end mt-4">
          <el-button type="primary" @click="saveSecuritySettings">
            保存账户安全设置
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useScanStore } from '@/store/scanStore'

const router = useRouter()
const scanStore = useScanStore()

// 扫描配置
const scanConfig = ref({
  timeout: 60,
  concurrent_scans: 3,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  default_modules: ['sql_injection', 'xss', 'csrf'],
  vulnerability_definitions: {
    'sql_injection': {
      severity: '高',
      description: 'SQL注入漏洞允许攻击者将恶意SQL查询注入应用程序，可能导致数据泄露或损坏'
    },
    'xss': {
      severity: '中',
      description: '跨站脚本攻击允许攻击者在受害者浏览器中注入和执行恶意脚本'
    },
    'csrf': {
      severity: '中',
      description: '跨站请求伪造漏洞允许攻击者诱导用户执行非预期操作'
    },
    'file_upload': {
      severity: '高',
      description: '不安全的文件上传允许攻击者上传恶意文件，可能导致远程代码执行'
    }
  }
})

// 模块标签映射
const moduleLabels = {
  'sql_injection': 'SQL注入检测',
  'xss': '跨站脚本(XSS)检测',
  'csrf': '跨站请求伪造检测',
  'file_upload': '文件上传漏洞检测'
}

// 通知设置
const notificationSettings = reactive({
  email: {
    enabled: false,
    address: ''
  },
  onComplete: true,
  onVulnerabilityFound: true,
  onHighRisk: true
})

// 安全设置
const securitySettings = reactive({
  twoFactor: false
})

// API密钥
const apiKey = ref('sk_test_abcdefghijklmnopqrstuvwxyz123456')
const showApiKey = ref(false)

// 获取严重程度类型
function getSeverityType(severity) {
  if (severity === '严重' || severity === '高') return 'danger'
  if (severity === '中') return 'warning'
  if (severity === '低') return 'info'
  return 'info'
}

// 加载设置
async function loadScanConfig() {
  try {
    const config = await scanStore.loadConfig()
    if (config) {
      scanConfig.value = { ...config }
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  }
}

// 保存扫描配置
async function saveConfig() {
  try {
    await scanStore.saveConfig(scanConfig.value)
    ElMessage.success('配置已保存')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  }
}

// 重置配置
function resetConfig() {
  scanConfig.value = {
    timeout: 60,
    concurrent_scans: 3,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    default_modules: ['sql_injection', 'xss', 'csrf'],
    vulnerability_definitions: {
      'sql_injection': {
        severity: '高',
        description: 'SQL注入漏洞允许攻击者将恶意SQL查询注入应用程序，可能导致数据泄露或损坏'
      },
      'xss': {
        severity: '中',
        description: '跨站脚本攻击允许攻击者在受害者浏览器中注入和执行恶意脚本'
      },
      'csrf': {
        severity: '中',
        description: '跨站请求伪造漏洞允许攻击者诱导用户执行非预期操作'
      },
      'file_upload': {
        severity: '高',
        description: '不安全的文件上传允许攻击者上传恶意文件，可能导致远程代码执行'
      }
    }
  }
  ElMessage.info('已恢复默认设置')
}

// 保存通知设置
function saveNotificationSettings() {
  ElMessage.success('通知设置已保存')
}

// 保存安全设置
function saveSecuritySettings() {
  ElMessage.success('安全设置已保存')
}

// 重新生成API密钥
function regenerateApiKey() {
  // 生成随机API密钥
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let newKey = 'sk_test_'
  for (let i = 0; i < 32; i++) {
    newKey += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  apiKey.value = newKey
  ElMessage.success('API密钥已重新生成')
}

// 返回上一页
function goBack() {
  router.push('/')
}

// 在组件加载时获取当前配置
onMounted(() => {
  loadScanConfig()
})
</script>

<style scoped>
.settings-container {
  min-height: calc(100vh - 64px);
  background-color: #f5f7fa;
}
</style> 