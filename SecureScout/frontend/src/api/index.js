import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  }
)

// 扫描API
export const scanApi = {
  // 开始单个URL扫描
  startScan(data) {
    return api.post('/scan/start', data)
  },
  
  // 批量扫描多个URL
  batchScan(data) {
    return api.post('/scan/batch', data)
  },
  
  // 获取扫描状态
  getScanStatus(scanId) {
    return api.get(`/scan/status/${scanId}`)
  },
  
  // 获取所有活动扫描
  getActiveScans() {
    return api.get('/scan/active')
  }
}

// 报告API
export const reportApi = {
  // 获取所有报告
  getAllReports() {
    return api.get('/report')
  },
  
  // 获取单个报告详情
  getReport(reportId) {
    return api.get(`/report/${reportId}`)
  },
  
  // 获取最近报告摘要
  getRecentSummary(days = 7) {
    return api.get(`/report/summary/recent?days=${days}`)
  },
  
  // 删除报告
  deleteReport(reportId) {
    return api.delete(`/report/${reportId}`)
  },
  
  // 获取漏洞类型统计
  getVulnerabilityStats() {
    return api.get('/report/stats/vulnerability_types')
  }
}

// 配置API
export const configApi = {
  // 获取配置
  getConfig() {
    return api.get('/config')
  },
  
  // 更新配置
  updateConfig(data) {
    return api.patch('/config', data)
  },
  
  // 获取漏洞库
  getVulnerabilityLibrary() {
    return api.get('/config/vulnerabilities')
  },
  
  // 更新漏洞规则
  updateVulnerabilityRule(vulnType, data) {
    return api.patch(`/config/vulnerabilities/${vulnType}`, data)
  },
  
  // 重置配置
  resetConfig() {
    return api.post('/config/reset')
  }
} 