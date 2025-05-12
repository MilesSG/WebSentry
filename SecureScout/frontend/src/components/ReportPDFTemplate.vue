<template>
  <div id="report-pdf-template" ref="pdfTemplate" class="pdf-template">
    <div class="report-header">
      <h1>Web安全扫描报告</h1>
      <div class="report-meta">
        <p><strong>报告ID:</strong> {{ report.id }}</p>
        <p><strong>目标URL:</strong> {{ report.url }}</p>
        <p><strong>扫描时间:</strong> {{ formatDate(report.start_time) }}</p>
        <p><strong>扫描状态:</strong> {{ formatStatus(report.status) }}</p>
      </div>
    </div>

    <div class="vulnerability-summary">
      <h2>漏洞统计</h2>
      <p>发现漏洞总数: {{ report.vulnerabilities?.length || 0 }}</p>
      
      <div v-if="vulnerabilitiesBySeverity && Object.keys(vulnerabilitiesBySeverity).length > 0">
        <h3>漏洞严重程度分布:</h3>
        <ul>
          <li v-for="(count, severity) in vulnerabilitiesBySeverity" :key="severity">
            {{ severity }}: {{ count }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="report.vulnerabilities && report.vulnerabilities.length > 0" class="vulnerability-details">
      <h2>漏洞详情</h2>
      <div v-for="(vuln, index) in report.vulnerabilities" :key="index" class="vulnerability-item">
        <h3>{{ index + 1 }}. {{ getVulnTypeName(vuln.type) }} ({{ vuln.severity }})</h3>
        <p v-if="vuln.url"><strong>URL:</strong> {{ vuln.url }}</p>
        <p v-if="vuln.description"><strong>描述:</strong> {{ vuln.description }}</p>
      </div>
    </div>

    <div class="remediation-advice">
      <h2>安全建议</h2>
      <div v-if="uniqueVulnTypes.length > 0">
        <div v-for="type in uniqueVulnTypes" :key="type" class="advice-item">
          <h3>{{ getVulnTypeName(type) }}修复建议:</h3>
          <ul>
            <li v-for="(line, i) in getRemediationAdvice(type).split('\n')" :key="i">
              {{ line }}
            </li>
          </ul>
        </div>
      </div>
      <div v-else>
        <p>未发现安全漏洞，建议继续保持良好的安全实践。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  report: {
    type: Object,
    required: true
  }
})

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
  if (!props.report?.vulnerabilities) return null
  
  const result = {}
  
  props.report.vulnerabilities.forEach(vuln => {
    const severity = vuln.severity || '中'
    if (result[severity]) {
      result[severity]++
    } else {
      result[severity] = 1
    }
  })
  
  return result
})

// 获取漏洞类型名称
function getVulnTypeName(type) {
  return vulnTypeNames[type] || type
}

// 获取修复建议
function getRemediationAdvice(type) {
  return remediationAdvice[type] || '请参考安全最佳实践进行修复。'
}

// 获取唯一的漏洞类型列表
const uniqueVulnTypes = computed(() => {
  if (!props.report?.vulnerabilities) return []
  return [...new Set(props.report.vulnerabilities.map(v => v.type))]
})

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

// 格式化状态
function formatStatus(status) {
  const statusMap = {
    'completed': '已完成',
    'in_progress': '进行中',
    'pending': '等待中',
    'failed': '失败'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.pdf-template {
  font-family: 'SimSun', 'Arial', sans-serif;
  max-width: 210mm; /* A4纸宽度 */
  margin: 0 auto;
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
</style> 