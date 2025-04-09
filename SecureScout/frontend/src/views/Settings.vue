<template>
  <div>
    <h1 class="text-2xl font-semibold text-gray-900 mb-6">系统设置</h1>
    
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <el-skeleton style="width: 100%" :rows="6" animated />
    </div>
    
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-red-700 mb-6">
      加载配置失败: {{ error }}
    </div>
    
    <div v-else>
      <!-- 基本设置 -->
      <div class="card mb-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">基本设置</h2>
        
        <el-form 
          :model="configForm" 
          label-position="top" 
          class="max-w-3xl"
          @submit.prevent="saveConfig"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <el-form-item label="扫描超时时间 (秒)">
              <el-input-number 
                v-model="configForm.scan_timeout" 
                :min="5" 
                :max="300" 
                class="w-full" 
              />
            </el-form-item>
            
            <el-form-item label="并发扫描数量">
              <el-input-number 
                v-model="configForm.concurrent_scans" 
                :min="1" 
                :max="20" 
                class="w-full" 
              />
            </el-form-item>
          </div>
          
          <el-form-item label="User-Agent">
            <el-input v-model="configForm.user_agent" />
          </el-form-item>
          
          <el-form-item label="默认扫描模块">
            <el-select 
              v-model="configForm.default_scan_modules" 
              multiple 
              class="w-full"
            >
              <el-option
                v-for="module in scanModules"
                :key="module.value"
                :label="module.label"
                :value="module.value"
              />
            </el-select>
          </el-form-item>
          
          <div class="flex justify-end space-x-4 mt-4">
            <el-button @click="resetConfig">
              重置为默认值
            </el-button>
            <el-button 
              type="primary" 
              @click="saveConfig" 
              :loading="isSaving"
            >
              保存设置
            </el-button>
          </div>
        </el-form>
      </div>
      
      <!-- 漏洞库设置 -->
      <div class="card">
        <h2 class="text-lg font-medium text-gray-900 mb-4">漏洞库配置</h2>
        
        <el-tabs>
          <el-tab-pane v-for="(vuln, key) in vulnerabilityLibrary" :key="key" :label="getVulnTypeName(key)">
            <el-form :model="vuln" label-position="top">
              <el-form-item label="严重程度">
                <el-select v-model="vuln.severity">
                  <el-option value="低" label="低" />
                  <el-option value="中" label="中" />
                  <el-option value="高" label="高" />
                  <el-option value="严重" label="严重" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="描述">
                <el-input v-model="vuln.description" />
              </el-form-item>
              
              <el-form-item v-if="vuln.patterns" label="检测模式">
                <el-tag
                  v-for="(pattern, index) in vuln.patterns"
                  :key="index"
                  closable
                  @close="removePattern(key, index)"
                  class="mr-2 mb-2"
                >
                  {{ pattern }}
                </el-tag>
                
                <el-input
                  v-if="inputVisible[key]"
                  ref="inputRef"
                  v-model="inputValue"
                  class="w-80 mt-2"
                  @keyup.enter="addPattern(key)"
                  @blur="addPattern(key)"
                />
                <el-button v-else class="mt-2" @click="showInput(key)">
                  添加模式
                </el-button>
              </el-form-item>
              
              <div class="flex justify-end space-x-4 mt-4">
                <el-button 
                  type="primary" 
                  @click="saveVulnerabilityRule(key)" 
                  :loading="isSavingRule"
                >
                  更新规则
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../store/configStore'

const configStore = useConfigStore()

// 表单数据
const configForm = ref({
  scan_timeout: 30,
  concurrent_scans: 5,
  user_agent: '',
  default_scan_modules: []
})

// 漏洞库数据
const vulnerabilityLibrary = ref({})

// 状态
const isLoading = ref(true)
const isSaving = ref(false)
const isSavingRule = ref(false)
const error = ref(null)

// 模式输入
const inputVisible = reactive({})
const inputValue = ref('')
const inputRef = ref(null)

// 扫描模块选项
const scanModules = [
  { label: 'SQL注入检测', value: 'sql_injection' },
  { label: 'XSS跨站脚本', value: 'xss' },
  { label: 'CSRF跨站请求伪造', value: 'csrf' },
  { label: '文件上传漏洞', value: 'file_upload' }
]

// 漏洞类型名称映射
const vulnTypeNames = {
  'sql_injection': 'SQL注入',
  'xss': '跨站脚本(XSS)',
  'csrf': '跨站请求伪造(CSRF)',
  'file_upload': '文件上传漏洞'
}

// 获取漏洞类型名称
function getVulnTypeName(type) {
  return vulnTypeNames[type] || type
}

// 显示输入框
function showInput(key) {
  inputVisible[key] = true
  inputValue.value = ''
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 添加模式
function addPattern(key) {
  if (inputValue.value && vulnerabilityLibrary.value[key].patterns) {
    if (!vulnerabilityLibrary.value[key].patterns.includes(inputValue.value)) {
      vulnerabilityLibrary.value[key].patterns.push(inputValue.value)
    }
  }
  inputVisible[key] = false
}

// 移除模式
function removePattern(key, index) {
  vulnerabilityLibrary.value[key].patterns.splice(index, 1)
}

// 保存配置
async function saveConfig() {
  isSaving.value = true
  
  try {
    await configStore.updateConfig(configForm.value)
    ElMessage.success('设置已保存')
  } catch (err) {
    ElMessage.error('保存设置失败')
    console.error('保存设置失败:', err)
  } finally {
    isSaving.value = false
  }
}

// 重置配置
async function resetConfig() {
  try {
    if (confirm('确定要重置所有设置到默认值吗？')) {
      const config = await configStore.resetConfig()
      configForm.value = { ...config }
      ElMessage.success('设置已重置为默认值')
    }
  } catch (err) {
    ElMessage.error('重置设置失败')
    console.error('重置设置失败:', err)
  }
}

// 保存漏洞规则
async function saveVulnerabilityRule(vulnType) {
  isSavingRule.value = true
  
  try {
    await configStore.updateVulnerabilityRule(vulnType, vulnerabilityLibrary.value[vulnType])
    ElMessage.success('规则已更新')
  } catch (err) {
    ElMessage.error('更新规则失败')
    console.error('更新规则失败:', err)
  } finally {
    isSavingRule.value = false
  }
}

// 加载数据
async function loadData() {
  isLoading.value = true
  error.value = null
  
  try {
    // 加载配置
    const config = await configStore.fetchConfig()
    configForm.value = { ...config }
    
    // 加载漏洞库
    const vulnLibrary = await configStore.fetchVulnerabilityLibrary()
    vulnerabilityLibrary.value = vulnLibrary
    
    // 初始化inputVisible
    Object.keys(vulnLibrary).forEach(key => {
      inputVisible[key] = false
    })
  } catch (err) {
    error.value = err.message || '加载数据失败'
    console.error('加载数据失败:', err)
  } finally {
    isLoading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  loadData()
})
</script> 