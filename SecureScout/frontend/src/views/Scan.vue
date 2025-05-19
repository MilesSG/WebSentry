<template>
  <div class="scan-container p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">创建安全扫描</h1>
      <div>
        <el-button @click="goBack">
          <el-icon class="mr-1"><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
    </div>
    
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <ScanComponent 
        :initial-url="initialUrl" 
        @scan-complete="handleScanComplete" 
        @scan-started="handleScanStarted"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import ScanComponent from '@/components/ScanComponent.vue'
import { useScanStore } from '@/store/scanStore'

const route = useRoute()
const router = useRouter()
const scanStore = useScanStore()

// 如果从URL参数中传入了初始URL，则使用它
const initialUrl = computed(() => route.query.url || '')
const currentScanId = ref(null)

// 处理扫描开始事件
function handleScanStarted(data) {
  currentScanId.value = data.scanId
  ElMessage({
    message: `扫描任务 ${data.scanId} 已开始`,
    type: 'success'
  })
}

// 处理扫描完成事件
function handleScanComplete(result) {
  if (result.scanId) {
    ElMessage({
      message: '扫描已完成，即将跳转到报告页面...',
      type: 'success'
    })
    
    // 延迟跳转到扫描中心页面
    setTimeout(() => {
      router.push('/scan-center')
    }, 1500)
  }
}

// 返回上一页
function goBack() {
  if (currentScanId.value) {
    ElMessageBox.confirm(
      '扫描正在进行中，返回将继续在后台运行。确定要返回吗？',
      '确认返回',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      router.push('/scan-center')
    }).catch(() => {})
  } else {
    router.push('/scan-center')
  }
}

// 在组件挂载时，检查是否从其他页面传入URL参数
onMounted(() => {
  // 如果是从其他页面跳转过来的，可以加载扫描配置
  scanStore.loadConfig()
  
  // 如果URL中有传递的URL参数，表示是从"重新扫描"按钮跳转过来的
  // 延迟一下，确保ScanComponent已经完全加载
  if (route.query.url) {
    ElMessage.info(`准备扫描: ${route.query.url}`)
  }
})
</script>

<style scoped>
.scan-container {
  min-height: calc(100vh - 64px);
  background-color: #f5f7fa;
}
</style> 