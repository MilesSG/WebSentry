import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { scanApi, reportApi } from '../api'

export const useScanStore = defineStore('scan', () => {
  // 状态
  const isLoading = ref(false)
  const error = ref(null)
  const scanResults = ref([])
  const scans = ref([])
  const scanConfig = ref({
    timeout: 60,
    concurrent_scans: 3,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    default_modules: ['sql_injection', 'xss', 'csrf'],
    vulnerability_definitions: {
      'sql_injection': {
        severity: '高',
        description: 'SQL注入漏洞允许攻击者将恶意SQL查询注入应用程序，可能导致数据泄露或损坏',
        patterns: [
          'SQL syntax', 'mysql_fetch_array', 'You have an error in your SQL syntax',
          'ORA-', 'PostgreSQL', 'SQLite3::', 'microsoft JET Database'
        ]
      },
      'xss': {
        severity: '中',
        description: '跨站脚本攻击允许攻击者在受害者浏览器中注入和执行恶意脚本',
        patterns: [
          '<script>alert', 'javascript:alert', 'onerror=alert', 'document.cookie', 
          'eval(', 'document.domain', 'document.write'
        ]
      },
      'csrf': {
        severity: '中',
        description: '跨站请求伪造漏洞允许攻击者诱导用户执行非预期操作',
        patterns: [
          'no CSRF token', 'missing CSRF', 'csrf verification failed'
        ]
      },
      'file_upload': {
        severity: '高',
        description: '不安全的文件上传允许攻击者上传恶意文件，可能导致远程代码执行',
        patterns: [
          '.php', '.jsp', '.asp', '.exe', '.sh', '.py'
        ]
      }
    }
  })
  
  // 获取活跃扫描任务数量
  const activeScansCount = computed(() => {
    return scans.value.filter(scan => ['pending', 'running'].includes(scan.status)).length
  })
  
  // 保存配置到后端
  async function saveConfig(newConfig) {
    try {
      isLoading.value = true
      error.value = null
      
      // 模拟API请求 - 在真实环境中替换为实际API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 保存到本地状态
      scanConfig.value = { ...scanConfig.value, ...newConfig }
      
      // 保存到本地存储
      localStorage.setItem('scanConfig', JSON.stringify(scanConfig.value))
      
      return true
    } catch (err) {
      error.value = '保存配置失败: ' + (err.message || '未知错误')
      console.error('保存配置失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 加载配置
  async function loadConfig() {
    try {
      isLoading.value = true
      error.value = null
      
      // 尝试从本地存储加载
      const savedConfig = localStorage.getItem('scanConfig')
      if (savedConfig) {
        scanConfig.value = JSON.parse(savedConfig)
      }
      
      return scanConfig.value
    } catch (err) {
      error.value = '加载配置失败: ' + (err.message || '未知错误')
      console.error('加载配置失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 创建新扫描
  async function createScan(url, modules = []) {
    try {
      isLoading.value = true
      error.value = null
      
      // 验证是否已经存在相同URL的活跃扫描
      const existingScan = scans.value.find(
        scan => scan.url === url && ['pending', 'running'].includes(scan.status)
      )
      
      if (existingScan) {
        throw new Error('该URL已经在扫描队列中')
      }
      
      // 检查是否超过最大并发扫描数
      if (activeScansCount.value >= scanConfig.value.concurrent_scans) {
        throw new Error(`已达到最大并发扫描数 (${scanConfig.value.concurrent_scans})`)
      }
      
      // 创建新扫描对象
      const date = new Date();
      const formattedDate = 
        date.getFullYear().toString().substring(2) + 
        (date.getMonth() + 1).toString().padStart(2, '0') + 
        date.getDate().toString().padStart(2, '0');
      
      // 确保扫描ID不重复，格式为SCN-YYYYMMDD-xxx
      const todayScans = scans.value.filter(scan => scan.id.includes(`SCN-${formattedDate}`));
      const sequenceNumber = (todayScans.length + 1).toString().padStart(3, '0');
      const scanId = `SCN-${formattedDate}-${sequenceNumber}`;
      
      const newScan = {
        id: scanId,
        url: url,
        modules: modules.length > 0 ? modules : scanConfig.value.default_modules,
        status: 'pending',
        progress: 0,
        start_time: new Date().toISOString(),
        end_time: null,
        vulnerabilities: [],
        error: null
      }
      
      // 添加到扫描列表
      scans.value.push(newScan)
      
      // 同步到本地存储
      saveScansToLocalStorage()
      
      // 模拟API调用 - 在真实环境中替换为实际API调用
      setTimeout(() => {
        // 更新状态为运行中
        updateScanStatus(scanId, { status: 'running' })
        
        // 模拟扫描进度更新
        simulateScanProgress(scanId)
      }, 500)
      
      return scanId
    } catch (err) {
      error.value = '创建扫描失败: ' + (err.message || '未知错误')
      console.error('创建扫描失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 模拟扫描进度
  function simulateScanProgress(scanId) {
    const scan = scans.value.find(s => s.id === scanId)
    if (!scan || scan.status !== 'running') return
    
    let progress = 0
    const interval = setInterval(() => {
      // 增加进度
      progress += Math.random() * 15
      
      if (progress >= 100) {
        // 扫描完成
        progress = 100
        clearInterval(interval)
        
        // 生成模拟漏洞结果
        const vulnerabilities = generateMockVulnerabilities(scan.url, scan.modules)
        
        // 更新扫描状态
        updateScanStatus(scanId, {
          status: 'completed',
          progress: 100,
          end_time: new Date().toISOString(),
          vulnerabilities
        })
        
        // 添加到扫描结果
        scanResults.value.push({
          ...scan,
          status: 'completed',
          progress: 100,
          end_time: new Date().toISOString(),
          vulnerabilities
        })
        
        // 保存结果到本地存储
        saveScanResultsToLocalStorage()
      } else {
        // 更新进度
        updateScanStatus(scanId, { 
          progress: Math.min(Math.round(progress), 99)
        })
      }
    }, 1000)
  }
  
  // 更新扫描状态
  function updateScanStatus(scanId, updates) {
    const scanIndex = scans.value.findIndex(s => s.id === scanId)
    if (scanIndex === -1) return false
    
    // 更新扫描对象
    scans.value[scanIndex] = {
      ...scans.value[scanIndex],
      ...updates
    }
    
    // 同步到本地存储
    saveScansToLocalStorage()
    
    return true
  }
  
  // 获取扫描状态
  async function getScanStatus(scanId) {
    try {
      isLoading.value = true
      error.value = null
      
      // 尝试从本地扫描列表获取
      const scan = scans.value.find(s => s.id === scanId)
      if (scan) return { ...scan }
      
      // 尝试从结果列表获取
      const result = scanResults.value.find(r => r.id === scanId)
      if (result) return { ...result }
      
      throw new Error('未找到扫描记录')
    } catch (err) {
      error.value = '获取扫描状态失败: ' + (err.message || '未知错误')
      console.error('获取扫描状态失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 获取所有扫描
  async function getAllScans() {
    try {
      isLoading.value = true
      error.value = null
      
      // 模拟API请求 - 在真实环境中替换为实际API调用
      await new Promise(resolve => setTimeout(resolve, 300))
      
      return [...scans.value]
    } catch (err) {
      error.value = '获取扫描列表失败: ' + (err.message || '未知错误')
      console.error('获取扫描列表失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 获取所有扫描结果
  async function getAllResults() {
    try {
      isLoading.value = true
      error.value = null
      
      // 模拟API请求 - 在真实环境中替换为实际API调用
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // 返回模拟数据
      return [
        {
          id: 'SCN-2023-0001',
          url: 'https://example.com',
          scanDate: '2023-10-15T08:30:00Z',
          status: '已完成',
          vulnerabilities: [
            {
              type: 'xss',
              severity: '高',
              location: '/search?q=',
              description: 'XSS漏洞'
            },
            {
              type: 'sql_injection',
              severity: '严重',
              location: '/user?id=',
              description: 'SQL注入漏洞'
            },
            {
              type: 'info_leak',
              severity: '中',
              location: '/js/main.js',
              description: '敏感信息泄露'
            }
          ]
        },
        {
          id: 'SCN-2023-0002',
          url: 'https://secure-demo.org',
          scanDate: '2023-10-20T14:15:00Z',
          status: '已完成',
          vulnerabilities: []
        }
      ]
    } catch (error) {
      console.error('获取扫描结果失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  // 取消扫描
  async function cancelScan(scanId) {
    try {
      isLoading.value = true
      error.value = null
      
      const scanIndex = scans.value.findIndex(s => s.id === scanId)
      if (scanIndex === -1) {
        throw new Error('未找到扫描任务')
      }
      
      const scan = scans.value[scanIndex]
      if (!['pending', 'running'].includes(scan.status)) {
        throw new Error('只能取消等待中或运行中的扫描')
      }
      
      // 更新扫描状态
      scans.value[scanIndex] = {
        ...scan,
        status: 'cancelled',
        end_time: new Date().toISOString()
      }
      
      // 同步到本地存储
      saveScansToLocalStorage()
      
      return true
    } catch (err) {
      error.value = '取消扫描失败: ' + (err.message || '未知错误')
      console.error('取消扫描失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 删除扫描
  async function deleteScan(scanId) {
    try {
      isLoading.value = true
      error.value = null
      
      // 从扫描列表中删除
      const scanIndex = scans.value.findIndex(s => s.id === scanId)
      if (scanIndex !== -1) {
        const scan = scans.value[scanIndex]
        if (['pending', 'running'].includes(scan.status)) {
          throw new Error('无法删除正在进行的扫描')
        }
        
        scans.value.splice(scanIndex, 1)
        saveScansToLocalStorage()
        
        // 同时检查结果列表中是否有对应ID的扫描，如果有也删除
        const resultIndex = scanResults.value.findIndex(r => r.id === scanId)
        if (resultIndex !== -1) {
          scanResults.value.splice(resultIndex, 1)
          saveScanResultsToLocalStorage()
        }
      }
      
      return true
    } catch (err) {
      error.value = '删除扫描失败: ' + (err.message || '未知错误')
      console.error('删除扫描失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 清空所有扫描记录
  async function clearAllScans() {
    try {
      isLoading.value = true
      error.value = null
      
      // 清空扫描列表(保留正在进行的扫描)
      scans.value = scans.value.filter(s => ['pending', 'running'].includes(s.status))
      saveScansToLocalStorage()
      
      // 清空结果列表
      scanResults.value = []
      saveScanResultsToLocalStorage()
      
      return true
    } catch (err) {
      error.value = '清空扫描记录失败: ' + (err.message || '未知错误')
      console.error('清空扫描记录失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 删除报告
  async function deleteReport(reportId) {
    try {
      isLoading.value = true
      error.value = null
      
      // 从结果列表中删除
      const resultIndex = scanResults.value.findIndex(r => r.id === reportId)
      if (resultIndex !== -1) {
        scanResults.value.splice(resultIndex, 1)
        saveScanResultsToLocalStorage()
      } else {
        throw new Error('未找到报告')
      }
      
      return true
    } catch (err) {
      error.value = '删除报告失败: ' + (err.message || '未知错误')
      console.error('删除报告失败:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // 生成模拟漏洞结果
  function generateMockVulnerabilities(url, modules) {
    const vulnerabilities = []
    
    // 为每个启用的模块生成0-3个漏洞
    modules.forEach(module => {
      // 随机决定是否找到漏洞
      const vulnerabilityCount = Math.floor(Math.random() * 4) // 0-3个漏洞
      
      for (let i = 0; i < vulnerabilityCount; i++) {
        const moduleConfig = scanConfig.value.vulnerability_definitions[module]
        if (!moduleConfig) continue
        
        // 随机选择一个模式
        const randomPatternIndex = Math.floor(Math.random() * moduleConfig.patterns.length)
        const pattern = moduleConfig.patterns[randomPatternIndex]
        
        // 创建漏洞对象
        vulnerabilities.push({
          type: module,
          severity: moduleConfig.severity,
          description: moduleConfig.description,
          url: url,
          test_url: `${url}?id=${module}_test_${i + 1}`,
          details: `在测试过程中发现了可能的${moduleConfig.description}。检测到模式: "${pattern}"`
        })
      }
    })
    
    return vulnerabilities
  }
  
  // 保存扫描到本地存储
  function saveScansToLocalStorage() {
    try {
      localStorage.setItem('scans', JSON.stringify(scans.value))
    } catch (e) {
      console.error('保存扫描到本地存储失败:', e)
    }
  }
  
  // 保存扫描结果到本地存储
  function saveScanResultsToLocalStorage() {
    try {
      localStorage.setItem('scanResults', JSON.stringify(scanResults.value))
    } catch (e) {
      console.error('保存扫描结果到本地存储失败:', e)
    }
  }
  
  // 从本地存储加载数据
  function loadFromLocalStorage() {
    try {
      // 加载扫描
      const savedScans = localStorage.getItem('scans')
      if (savedScans) {
        scans.value = JSON.parse(savedScans)
      }
      
      // 加载扫描结果
      const savedResults = localStorage.getItem('scanResults')
      if (savedResults) {
        scanResults.value = JSON.parse(savedResults)
      }
      
      // 加载配置
      const savedConfig = localStorage.getItem('scanConfig')
      if (savedConfig) {
        scanConfig.value = JSON.parse(savedConfig)
      }
    } catch (e) {
      console.error('从本地存储加载数据失败:', e)
    }
  }
  
  // 初始化加载
  loadFromLocalStorage()

  // 初始化模拟数据（如果本地存储为空）
  function initMockDataIfEmpty() {
    // 如果本地存储中没有扫描数据，初始化模拟数据
    if (scans.value.length === 0) {
      const mockScans = [
        {
          id: 'SCN-20231020-001',
          url: 'https://secure-demo.org',
          start_time: '2023-10-20T22:15:00Z',
          end_time: '2023-10-20T22:18:30Z',
          status: 'completed',
          vulnerabilities: []
        },
        {
          id: 'SCN-20231010-003',
          url: 'https://test-site.com',
          start_time: '2023-10-10T14:20:00Z',
          end_time: '2023-10-10T14:22:15Z',
          status: 'failed',
          error: '连接超时'
        },
        {
          id: 'SCN-20231005-004',
          url: 'https://blog.example.org',
          start_time: '2023-10-05T09:30:00Z',
          end_time: '2023-10-05T09:38:22Z',
          status: 'completed',
          vulnerabilities: [
            { type: 'CSRF', severity: '中' },
            { type: '配置错误', severity: '低' }
          ]
        },
        {
          id: 'SCN-20231001-005',
          url: 'https://shop.example.com',
          start_time: '2023-10-01T11:45:00Z',
          end_time: '2023-10-01T11:52:10Z',
          status: 'completed',
          vulnerabilities: [
            { type: 'XSS', severity: '中' },
            { type: '文件包含', severity: '高' },
            { type: '目录遍历', severity: '高' },
            { type: '敏感信息泄露', severity: '中' }
          ]
        },
        {
          id: 'SCN-20230925-006',
          url: 'https://api.test.com',
          start_time: '2023-09-25T15:20:00Z',
          end_time: '2023-09-25T15:23:45Z',
          status: 'completed',
          vulnerabilities: []
        },
        {
          id: 'SCN-20230920-007',
          url: 'https://admin.example.org',
          start_time: '2023-09-20T08:10:00Z',
          end_time: '2023-09-20T08:15:32Z',
          status: 'failed',
          error: '认证失败'
        }
      ]
      
      scans.value = mockScans
      saveScansToLocalStorage()
    }
  }

  // 调用初始化函数
  initMockDataIfEmpty()
  
  return {
    // 状态
    isLoading,
    error,
    scanResults,
    scans,
    scanConfig,
    activeScansCount,
    
    // 方法
    createScan,
    getScanStatus,
    getAllScans,
    getAllResults,
    cancelScan,
    deleteScan,
    clearAllScans,
    deleteReport,
    saveConfig,
    loadConfig,
    updateScanStatus,
    initMockDataIfEmpty,
    saveScansToLocalStorage,
    saveScanResultsToLocalStorage
  }
}) 