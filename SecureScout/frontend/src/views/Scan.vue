<template>
  <div class="scan-container p-6">
    <h1 class="text-2xl font-bold mb-6">创建安全扫描</h1>
    
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <ScanComponent :initial-url="initialUrl" @scan-complete="handleScanComplete" />
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-lg font-semibold mb-4">批量扫描（企业版功能）</h2>
      
      <el-alert
        type="info"
        show-icon
        :closable="false"
      >
        <template #title>
          批量扫描功能允许您同时扫描多个网站，提高工作效率。
        </template>
        <template #default>
          <p class="mt-2">企业版功能包括：</p>
          <ul class="list-disc ml-6 mt-2">
            <li>同时扫描多达50个网站</li>
            <li>导入CSV文件批量添加目标</li>
            <li>定时自动扫描</li>
            <li>自定义扫描策略</li>
            <li>高级漏洞检测模块</li>
          </ul>
          <div class="mt-4">
            <el-button type="primary">升级到企业版</el-button>
          </div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import ScanComponent from '@/components/ScanComponent.vue'

const route = useRoute()
const router = useRouter()

// 如果从URL参数中传入了初始URL，则使用它
const initialUrl = computed(() => route.query.url || '')

// 处理扫描完成事件
function handleScanComplete(result) {
  if (result.scanId) {
    ElMessage({
      message: '扫描已完成，正在跳转到报告页面...',
      type: 'success'
    })
    
    // 延迟跳转到报告页面
    setTimeout(() => {
      router.push(`/reports/${result.scanId}`)
    }, 1500)
  }
}
</script>

<style scoped>
.scan-container {
  min-height: calc(100vh - 64px);
  background-color: #f5f7fa;
}
</style> 