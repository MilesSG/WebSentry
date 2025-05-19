<template>
  <div class="scan-center p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">扫描中心</h1>
      <div class="flex space-x-2">
        <el-button type="primary" @click="startNewScan">
          <el-icon class="mr-1"><Plus /></el-icon>
          新建扫描
        </el-button>
        <el-button @click="refreshScans" :loading="isRefreshing">
          <el-icon class="mr-1"><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 活跃扫描 -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6" v-if="activeScans.length > 0">
      <h2 class="text-lg font-semibold mb-4">活跃扫描 ({{ activeScans.length }})</h2>
      
      <el-table
        :data="activeScans"
        style="width: 100%"
        border
        stripe
      >
        <el-table-column prop="id" label="扫描ID" width="180" />
        <el-table-column prop="url" label="目标URL" min-width="200">
          <template #default="{ row }">
            <el-link :href="row.url" target="_blank" type="primary">{{ row.url }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <ScanStatusBadge :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="进度" width="200">
          <template #default="{ row }">
            <div v-if="row.status === 'in_progress'">
              <el-progress 
                :percentage="calculateProgress(row)" 
                :stroke-width="10"
                :status="row.status === 'failed' ? 'exception' : ''"
              />
            </div>
            <span v-else-if="row.status === 'pending'">等待中...</span>
            <span v-else-if="row.status === 'failed'">扫描失败</span>
            <span v-else-if="row.status === 'completed'">已完成</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2">
              <el-button 
                size="small" 
                type="primary" 
                @click="viewScanDetails(row.id)"
              >
                详情
              </el-button>
              <el-button 
                size="small" 
                type="danger"
                @click="cancelScan(row)"
                v-if="row.status === 'pending' || row.status === 'in_progress'"
              >
                取消
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 历史扫描 -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">扫描历史</h2>
        
        <div class="flex items-center">
          <el-input
            v-model="searchQuery"
            placeholder="搜索URL或ID"
            clearable
            class="w-60 mr-2"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-select v-model="statusFilter" placeholder="状态筛选" clearable class="w-32 mr-2">
            <el-option label="全部" value="" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
          </el-select>
          
          <el-popconfirm
            title="确定要清空所有扫描记录吗？这将删除所有已完成和已失败的扫描记录。"
            @confirm="clearAllScanHistory"
            confirm-button-type="danger"
          >
            <template #reference>
              <el-button size="small" type="danger">清空历史</el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
      
      <el-table
        :data="filteredScans"
        style="width: 100%"
        border
        stripe
        v-loading="isLoading"
      >
        <el-table-column prop="id" label="扫描ID" width="180" />
        <el-table-column prop="url" label="目标URL" min-width="200">
          <template #default="{ row }">
            <el-link :href="row.url" target="_blank" type="primary">{{ row.url }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column label="完成时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <ScanStatusBadge :status="row.status" />
          </template>
        </el-table-column>
        <el-table-column label="漏洞" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.vulnerabilities && row.vulnerabilities.length > 0 ? 'danger' : 'success'"
              effect="dark"
            >
              {{ row.vulnerabilities ? row.vulnerabilities.length : 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <div class="flex flex-wrap gap-2">
              <el-button 
                size="small" 
                type="primary" 
                @click="viewScanDetails(row.id)"
              >
                详情
              </el-button>
              <el-button 
                size="small" 
                type="success" 
                @click="viewScanReport(row.id)"
                v-if="row.status === 'completed'"
              >
                报告
              </el-button>
              <el-button 
                size="small" 
                @click="runAgain(row)"
                v-if="row.status === 'completed' || row.status === 'failed'"
              >
                重新扫描
              </el-button>
              <el-popconfirm
                title="确定要删除此扫描记录吗？"
                @confirm="deleteScan(row)"
                confirm-button-type="danger"
              >
                <template #reference>
                  <el-button 
                    size="small" 
                    type="danger"
                    :icon="Delete"
                  />
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="flex justify-center mt-4">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalItems"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 添加扫描详情对话框 -->
    <el-dialog
      v-model="scanDetailsDialogVisible"
      :title="`扫描详情 - ${currentDetailScanId}`"
      width="70%"
      top="5vh"
    >
      <div v-if="currentScanDetails" class="scan-details-content">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 基本信息 -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">基本信息</h3>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="扫描ID">{{ currentDetailScanId }}</el-descriptions-item>
              <el-descriptions-item label="目标URL">
                <el-link :href="currentScanDetails.url" target="_blank" type="primary">{{ currentScanDetails.url }}</el-link>
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">{{ formatDateTime(currentScanDetails.start_time) }}</el-descriptions-item>
              <el-descriptions-item label="结束时间">
                {{ currentScanDetails.end_time ? formatDateTime(currentScanDetails.end_time) : '扫描中...' }}
              </el-descriptions-item>
              <el-descriptions-item label="状态">
                <ScanStatusBadge :status="currentScanDetails.status" />
              </el-descriptions-item>
              <el-descriptions-item v-if="currentScanDetails.status === 'in_progress'" label="进度">
                <el-progress 
                  :percentage="calculateProgress(currentScanDetails)" 
                  :stroke-width="10"
                  :status="currentScanDetails.status === 'failed' ? 'exception' : ''"
                />
              </el-descriptions-item>
              <el-descriptions-item v-if="currentScanDetails.status === 'failed'" label="错误信息">
                <span class="text-red-500">{{ currentScanDetails.error || '未知错误' }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
          
          <!-- 扫描统计 -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-3">扫描统计</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-3 rounded-md shadow-sm">
                <div class="text-sm text-gray-500">扫描页面数</div>
                <div class="text-2xl font-bold text-blue-600">{{ currentScanDetails.scannedPages || 0 }}</div>
              </div>
              <div class="bg-white p-3 rounded-md shadow-sm">
                <div class="text-sm text-gray-500">检测表单</div>
                <div class="text-2xl font-bold text-blue-600">{{ currentScanDetails.scannedForms || 0 }}</div>
              </div>
              <div class="bg-white p-3 rounded-md shadow-sm">
                <div class="text-sm text-gray-500">扫描资源</div>
                <div class="text-2xl font-bold text-blue-600">{{ currentScanDetails.scannedAssets || 0 }}</div>
              </div>
              <div class="bg-white p-3 rounded-md shadow-sm">
                <div class="text-sm text-gray-500">发现漏洞</div>
                <div class="text-2xl font-bold" :class="currentScanVulnerabilities.length > 0 ? 'text-red-600' : 'text-green-600'">
                  {{ currentScanVulnerabilities.length }}
                </div>
              </div>
            </div>
            <div class="mt-4 text-right text-sm text-gray-500">
              扫描耗时: {{ currentScanDetails.scanDuration || '计算中...' }}
            </div>
          </div>
        </div>
        
        <!-- 扫描配置 -->
        <div class="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-3">扫描配置</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="用户代理">{{ currentScanDetails.scanConfig?.userAgent }}</el-descriptions-item>
                <el-descriptions-item label="超时设置">{{ currentScanDetails.scanConfig?.timeout }}</el-descriptions-item>
                <el-descriptions-item label="扫描深度">{{ currentScanDetails.scanConfig?.maxDepth }}</el-descriptions-item>
              </el-descriptions>
            </div>
            <div>
              <p class="text-sm font-medium mb-2">启用的检测项:</p>
              <div class="flex flex-wrap gap-2">
                <el-tag 
                  v-for="(option, index) in currentScanDetails.scanConfig?.scanOptions" 
                  :key="index"
                  size="small"
                >
                  {{ option }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 扫描进度 -->
        <div class="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-3">扫描过程</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(phase, index) in currentScanDetails.scanProcess"
              :key="index"
              :type="phase.status === 'completed' ? 'success' : 
                    phase.status === 'in_progress' ? 'primary' : 
                    phase.status === 'pending' ? 'info' : 'warning'"
              :timestamp="phase.time"
              :hollow="phase.status !== 'completed'"
            >
              <div class="flex items-center">
                <span>{{ phase.phase }}</span>
                <el-tag 
                  size="small" 
                  class="ml-2"
                  :type="phase.status === 'completed' ? 'success' : 
                      phase.status === 'in_progress' ? 'warning' : 
                      phase.status === 'pending' ? 'info' : 'danger'"
                >
                  {{ phase.status === 'completed' ? '已完成' : 
                     phase.status === 'in_progress' ? '进行中' : 
                     phase.status === 'pending' ? '等待中' : '失败' }}
                </el-tag>
                <el-icon v-if="phase.status === 'in_progress'" class="ml-2 is-loading"><Loading /></el-icon>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
        
        <!-- 漏洞列表 -->
        <div v-if="currentScanVulnerabilities.length > 0" class="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-3">发现漏洞 ({{ currentScanVulnerabilities.length }})</h3>
          <el-table :data="currentScanVulnerabilities" border stripe>
            <el-table-column prop="id" label="漏洞ID" width="120" />
            <el-table-column prop="type" label="漏洞类型" width="120" />
            <el-table-column prop="location" label="位置" min-width="200" />
            <el-table-column label="严重程度" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.severity === '高' ? 'danger' : row.severity === '中' ? 'warning' : 'info'"
                  effect="dark"
                >
                  {{ row.severity }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="CVSS评分" width="100">
              <template #default="{ row }">
                <span 
                  :class="row.cvss >= 7.0 ? 'text-red-500' : 
                          row.cvss >= 4.0 ? 'text-yellow-500' : 'text-green-500'"
                  class="font-bold"
                >
                  {{ row.cvss }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="ElMessageBox.alert(row.description, `${row.type}漏洞详情`, {
                    dangerouslyUseHTMLString: true,
                    confirmButtonText: '了解'
                  })"
                >
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <!-- 没有漏洞时显示 -->
        <div v-else-if="currentScanDetails.status === 'completed'" class="mt-6 bg-green-50 p-6 rounded-lg text-center">
          <el-icon class="text-3xl text-green-500 mb-2"><CircleCheckFilled /></el-icon>
          <h3 class="text-lg font-semibold text-green-700">未发现安全漏洞</h3>
          <p class="text-green-600 mt-2">恭喜！您的网站没有检测到明显的安全漏洞。</p>
          <p class="text-gray-500 text-sm mt-2">请注意，安全扫描并不能保证100%发现所有漏洞，建议定期进行安全检查。</p>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="scanDetailsDialogVisible = false">关闭</el-button>
          <el-button 
            type="primary" 
            @click="showScanReportDialog(currentDetailScanId); scanDetailsDialogVisible = false"
            v-if="currentScanDetails && currentScanDetails.status === 'completed'"
          >
            查看报告
          </el-button>
          <el-button 
            type="success" 
            @click="exportReport('pdf')"
            v-if="currentScanDetails && currentScanDetails.status === 'completed'"
          >
            导出报告
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 扫描报告对话框 -->
    <el-dialog
      v-model="scanReportDialogVisible"
      :title="`安全扫描报告 - ${currentReportScanId}`"
      width="80%"
      top="5vh"
    >
      <div v-if="currentScanDetails" class="scan-report-content">
        <!-- 报告头部 -->
        <div class="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 class="text-xl font-bold">Web安全扫描报告</h2>
            <p class="text-gray-500">目标: {{ currentScanDetails.url }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500">报告ID: {{ currentReportScanId }}-R</p>
            <p class="text-sm text-gray-500">生成时间: {{ formatDateTime(new Date().toISOString()) }}</p>
          </div>
        </div>
        
        <!-- 安全评分 -->
        <div class="bg-gray-50 p-6 rounded-lg mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="flex flex-col items-center justify-center">
              <div class="relative">
                <el-progress 
                  type="dashboard" 
                  :percentage="currentScanVulnerabilities.length > 0 ? 
                    Math.max(0, 100 - currentScanVulnerabilities.length * 15) : 100" 
                  :color="currentScanVulnerabilities.length > 0 ? 
                    (currentScanVulnerabilities.length > 3 ? '#F56C6C' : '#E6A23C') : '#67C23A'"
                />
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-2xl font-bold">
                    {{ currentScanVulnerabilities.length > 0 ? 
                    Math.max(0, 100 - currentScanVulnerabilities.length * 15) : 100 }}
                  </span>
                </div>
              </div>
              <p class="mt-2 text-center">安全评分</p>
            </div>
            
            <div class="col-span-2">
              <h3 class="text-lg font-medium mb-3">安全评估</h3>
              <el-alert
                :title="currentScanVulnerabilities.length > 0 ? 
                  `发现 ${currentScanVulnerabilities.length} 个安全漏洞` : 
                  '未发现安全漏洞'"
                :type="currentScanVulnerabilities.length > 0 ? 
                  (currentScanVulnerabilities.length > 3 ? 'error' : 'warning') : 'success'"
                :description="currentScanVulnerabilities.length > 0 ? 
                  '您的网站存在安全风险，建议尽快修复以下漏洞。' : 
                  '您的网站安全状况良好，未检测到明显安全漏洞。'"
                show-icon
                :closable="false"
                class="mb-4"
              />
              
              <p class="text-sm text-gray-600">
                <span class="font-medium">扫描范围：</span> 共扫描了 {{ currentScanDetails.scannedPages }} 个页面，
                检测了 {{ currentScanDetails.scannedForms }} 个表单和 {{ currentScanDetails.scannedAssets }} 个资源文件。
                扫描深度为 {{ currentScanDetails.scanConfig?.maxDepth }}。
              </p>
            </div>
          </div>
        </div>
        
        <!-- 漏洞摘要 -->
        <div v-if="currentScanVulnerabilities.length > 0" class="mb-6">
          <h3 class="text-lg font-semibold mb-3">漏洞摘要</h3>
          
          <el-collapse>
            <el-collapse-item 
              v-for="(vulnerability, index) in currentScanVulnerabilities" 
              :key="index"
              :name="index"
            >
              <template #title>
                <div class="flex items-center">
                  <el-tag 
                    class="mr-2" 
                    :type="vulnerability.severity === '高' ? 'danger' : 
                      vulnerability.severity === '中' ? 'warning' : 'info'"
                    effect="dark"
                  >
                    {{ vulnerability.severity }}
                  </el-tag>
                  <span>{{ vulnerability.type }}</span>
                  <span class="ml-2 text-sm text-gray-500">- {{ vulnerability.id }}</span>
                </div>
              </template>
              
              <div class="vulnerability-details p-3">
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="漏洞ID">{{ vulnerability.id }}</el-descriptions-item>
                  <el-descriptions-item label="漏洞类型">{{ vulnerability.type }}</el-descriptions-item>
                  <el-descriptions-item label="CVSS评分">
                    <span 
                      :class="vulnerability.cvss >= 7.0 ? 'text-red-500' : 
                            vulnerability.cvss >= 4.0 ? 'text-yellow-500' : 'text-green-500'"
                      class="font-bold"
                    >
                      {{ vulnerability.cvss }}
                    </span>
                  </el-descriptions-item>
                  <el-descriptions-item label="位置">{{ vulnerability.location }}</el-descriptions-item>
                  <el-descriptions-item label="描述">{{ vulnerability.description }}</el-descriptions-item>
                  <el-descriptions-item label="修复建议">{{ vulnerability.solution }}</el-descriptions-item>
                </el-descriptions>
                
                <div class="mt-4 flex justify-end">
                  <el-button size="small" type="success">查看修复指南</el-button>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        
        <!-- 扫描统计图表 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-medium mb-3">漏洞类型分布</h3>
            <div class="h-60 flex items-center justify-center">
              <div v-if="currentScanVulnerabilities.length === 0" class="text-center text-gray-400">
                <p>无漏洞数据</p>
              </div>
              <div v-else class="w-full h-full">
                <!-- 这里实际项目中应插入图表组件 -->
                <div class="bg-white p-4 rounded-lg h-full flex items-center justify-center">
                  <p>漏洞类型分布图</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="text-lg font-medium mb-3">漏洞严重程度分布</h3>
            <div class="h-60 flex items-center justify-center">
              <div v-if="currentScanVulnerabilities.length === 0" class="text-center text-gray-400">
                <p>无漏洞数据</p>
              </div>
              <div v-else class="w-full h-full">
                <!-- 这里实际项目中应插入图表组件 -->
                <div class="bg-white p-4 rounded-lg h-full flex items-center justify-center">
                  <p>漏洞严重程度分布图</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 安全建议 -->
        <div class="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold mb-3">安全建议</h3>
          
          <div v-if="currentScanVulnerabilities.length > 0">
            <p class="mb-3">根据扫描结果，我们建议您采取以下措施提高网站安全性：</p>
            
            <ol class="list-decimal pl-6 mb-4 space-y-2">
              <li v-for="(vulnerability, index) in currentScanVulnerabilities.slice(0, 3)" :key="index">
                <span class="font-medium">修复{{ vulnerability.type }}漏洞：</span> {{ vulnerability.solution }}
              </li>
              <li v-if="currentScanVulnerabilities.length > 3">
                修复其他<strong>{{ currentScanVulnerabilities.length - 3 }}</strong>个漏洞，详见漏洞摘要部分。
              </li>
              <li>定期进行安全扫描，建议每月至少一次。</li>
              <li>确保所有软件和依赖库都保持最新版本。</li>
            </ol>
          </div>
          <div v-else>
            <p class="mb-3">虽然没有发现明显安全漏洞，但我们仍建议您：</p>
            
            <ol class="list-decimal pl-6 mb-4 space-y-2">
              <li>定期进行安全扫描，建议每月至少一次。</li>
              <li>确保所有软件和依赖库都保持最新版本。</li>
              <li>实施强密码策略和多因素认证。</li>
              <li>配置适当的内容安全策略(CSP)。</li>
              <li>对敏感数据进行加密。</li>
            </ol>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="scanReportDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="generatePDF">生成PDF</el-button>
          <el-dropdown @command="exportReport" trigger="click">
            <el-button type="primary">
              更多格式 <el-icon class="ml-1"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="pdf">PDF格式</el-dropdown-item>
                <el-dropdown-item command="html">HTML格式</el-dropdown-item>
                <el-dropdown-item command="csv">CSV格式</el-dropdown-item>
                <el-dropdown-item command="json">JSON格式</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="success" @click="emailReport()">邮件发送</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- PDF模板 (隐藏) -->
    <div v-show="false" ref="pdfContainer" class="pdf-container">
      <div id="report-pdf-template" class="pdf-template">
        <div class="report-header">
          <h1>Web安全扫描报告</h1>
          <div class="report-meta">
            <p><strong>报告ID:</strong> {{ currentReportScanId }}</p>
            <p><strong>目标URL:</strong> {{ currentScanDetails?.url }}</p>
            <p><strong>扫描时间:</strong> {{ formatDateTime(currentScanDetails?.start_time) }}</p>
            <p><strong>扫描状态:</strong> {{ currentScanDetails?.status === 'completed' ? '已完成' : currentScanDetails?.status }}</p>
          </div>
        </div>

        <div class="vulnerability-summary">
          <h2>漏洞统计</h2>
          <p>发现漏洞总数: {{ currentScanVulnerabilities?.length || 0 }}</p>
        </div>

        <div v-if="currentScanVulnerabilities?.length > 0" class="vulnerability-details">
          <h2>漏洞详情</h2>
          <div v-for="(vuln, index) in currentScanVulnerabilities" :key="index" class="vulnerability-item">
            <h3>{{ index + 1 }}. {{ vuln.type }} ({{ vuln.severity }})</h3>
            <p v-if="vuln.location"><strong>URL:</strong> {{ vuln.location }}</p>
            <p v-if="vuln.description"><strong>描述:</strong> {{ vuln.description }}</p>
          </div>
        </div>

        <div class="remediation-advice">
          <h2>安全建议</h2>
          <div v-if="currentScanVulnerabilities?.length > 0">
            <div v-for="vuln in currentScanVulnerabilities" :key="vuln.id" class="advice-item">
              <h3>{{ vuln.type }}修复建议:</h3>
              <p>{{ vuln.solution }}</p>
            </div>
          </div>
          <div v-else>
            <p>未发现安全漏洞，建议继续保持良好的安全实践。</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Refresh, 
  Search,
  Delete,
  ArrowDown
} from '@element-plus/icons-vue'
import ScanStatusBadge from '@/components/ScanStatusBadge.vue'
import { scanApi } from '@/api'
import { useScanStore } from '@/store/scanStore'

const scanStore = useScanStore()
const router = useRouter()

// 扫描数据和状态
const isLoading = ref(true)
const isRefreshing = ref(false)
const scans = ref([])
const activeScans = ref([])

// 分页和过滤
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')

// 添加对话框状态变量
const scanDetailsDialogVisible = ref(false)
const scanReportDialogVisible = ref(false)
const currentDetailScanId = ref('')
const currentReportScanId = ref('')

// 扫描详情数据
const currentScanDetails = ref(null)
const currentScanVulnerabilities = ref([])

// PDF生成相关
const pdfContainer = ref(null)

// 获取扫描列表
async function fetchScans() {
  isLoading.value = true
  
  try {
    // 从scanStore获取所有扫描记录
    const results = await scanStore.getAllScans()
    // 确保这里获取的是最新数据
    scans.value = [...results]
    totalItems.value = results.length
    
    // 获取活跃扫描
    activeScans.value = scans.value.filter(s => 
      s.status === 'pending' || s.status === 'in_progress'
    )
  } catch (error) {
    console.error('获取扫描记录失败:', error)
    ElMessage.error('获取扫描记录失败')
  } finally {
    isLoading.value = false
  }
}

// 刷新扫描列表
async function refreshScans() {
  isRefreshing.value = true
  try {
    await fetchScans()
    ElMessage.success('刷新成功')
  } catch (error) {
    console.error('刷新失败:', error)
  } finally {
    isRefreshing.value = false
  }
}

// 过滤扫描列表
const filteredScans = computed(() => {
  let result = [...scans.value]
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(scan => 
      scan.url.toLowerCase().includes(query) || 
      scan.id.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(scan => scan.status === statusFilter.value)
  }
  
  // 计算分页
  totalItems.value = result.length
  
  // 返回当前页的数据
  const startIndex = (currentPage.value - 1) * pageSize.value
  return result.slice(startIndex, startIndex + pageSize.value)
})

// 分页处理
function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
}

function handleCurrentChange(page) {
  currentPage.value = page
}

// 开始新的扫描
function startNewScan() {
  router.push('/scan')
}

// 查看扫描详情
function viewScanDetails(scanId) {
  // 打开详情对话框而不是导航到其他页面
  showScanDetailsDialog(scanId)
}

// 查看扫描报告
function viewScanReport(scanId) {
  // 打开报告对话框而不是导航到其他页面
  showScanReportDialog(scanId)
}

// 重新运行扫描
function runAgain(scan) {
  ElMessage.success(`开始重新扫描: ${scan.url}`)
  router.push({
    path: '/scan',
    query: { url: scan.url }
  })
}

// 删除扫描记录
async function deleteScan(scan) {
  try {
    // 使用scanStore实现删除，这样会同步更新localStorage
    await scanStore.deleteScan(scan.id)
    // 更新当前页面数据
    scans.value = scans.value.filter(s => s.id !== scan.id)
    ElMessage.success('扫描记录已删除')
  } catch (error) {
    console.error('删除扫描记录失败:', error)
    ElMessage.error('删除扫描失败: ' + (error.message || '未知错误'))
  }
}

// 取消正在进行的扫描
async function cancelScan(scan) {
  try {
    ElMessageBox.confirm(
      '确定要取消此扫描任务吗？',
      '取消扫描',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    ).then(async () => {
      // 实际项目中应调用API取消扫描
      // await scanApi.cancelScan(scan.id)
      
      // 模拟取消成功
      activeScans.value = activeScans.value.filter(s => s.id !== scan.id)
      ElMessage.success('扫描任务已取消')
    })
  } catch (error) {
    console.error('取消扫描失败:', error)
    ElMessage.error('取消扫描失败')
  }
}

// 计算扫描进度百分比
function calculateProgress(scan) {
  if (scan.progress !== undefined) return scan.progress
  
  // 如果后端没有提供进度信息，模拟一个随机进度
  // 在实际应用中应该调用API获取实时进度
  const startTime = new Date(scan.start_time).getTime()
  const now = Date.now()
  const elapsed = now - startTime
  
  // 假设扫描最长持续10分钟
  const progress = Math.min(95, Math.floor((elapsed / (10 * 60 * 1000)) * 100))
  return progress
}

// 格式化日期时间
function formatDateTime(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch (e) {
    return dateString
  }
}

// 显示扫描详情对话框
function showScanDetailsDialog(scanId) {
  currentDetailScanId.value = scanId
  
  // 模拟获取扫描详情数据
  const scan = [...scans.value, ...activeScans.value].find(s => s.id === scanId)
  
  if (scan) {
    // 创建详细信息
    currentScanDetails.value = {
      ...scan,
      scannedPages: Math.floor(Math.random() * 50) + 10,
      scannedForms: Math.floor(Math.random() * 20) + 5,
      scannedAssets: Math.floor(Math.random() * 30) + 8,
      scanDuration: `${Math.floor(Math.random() * 10) + 2}分${Math.floor(Math.random() * 50) + 10}秒`,
      scanConfig: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WebSentry/1.0',
        timeout: '30秒',
        maxDepth: scan.status === 'in_progress' ? '3级' : '2级',
        scanOptions: [
          '跨站脚本(XSS)',
          'SQL注入',
          'CSRF漏洞',
          '信息泄露检测',
          '目录遍历',
          'SSRF漏洞'
        ].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 4) + 2)
      },
      scanProcess: [
        { phase: '初始化', time: '00:00:00', status: 'completed' },
        { phase: '网站连接', time: '00:00:01', status: 'completed' },
        { phase: '爬取网站', time: '00:00:15', status: scan.status === 'in_progress' && calculateProgress(scan) < 50 ? 'in_progress' : 'completed' },
        { phase: '页面分析', time: '00:01:30', status: scan.status === 'in_progress' && calculateProgress(scan) >= 50 && calculateProgress(scan) < 80 ? 'in_progress' : (scan.status === 'in_progress' && calculateProgress(scan) < 50 ? 'pending' : 'completed') },
        { phase: '漏洞扫描', time: '00:02:45', status: scan.status === 'in_progress' && calculateProgress(scan) >= 80 ? 'in_progress' : (scan.status === 'in_progress' && calculateProgress(scan) < 80 ? 'pending' : 'completed') },
        { phase: '生成报告', time: '00:03:30', status: scan.status === 'completed' ? 'completed' : 'pending' }
      ]
    }
    
    // 如果有漏洞，获取漏洞详情
    if (scan.vulnerabilities && scan.vulnerabilities.length > 0) {
      currentScanVulnerabilities.value = scan.vulnerabilities.map(v => ({
        ...v,
        id: `VULN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        location: v.type === 'XSS' ? `${scan.url}/search?q=<script>` : 
                  v.type === 'SQL注入' ? `${scan.url}/product?id=1'` : 
                  `${scan.url}/page?id=${Math.floor(Math.random() * 100) + 1}`,
        description: getVulnerabilityDescription(v.type),
        solution: getVulnerabilitySolution(v.type),
        cvss: v.severity === '高' ? (Math.random() * 2 + 7).toFixed(1) : 
              v.severity === '中' ? (Math.random() * 2 + 4).toFixed(1) : 
              (Math.random() * 2 + 1).toFixed(1)
      }))
    } else {
      currentScanVulnerabilities.value = []
    }
  }
  
  scanDetailsDialogVisible.value = true
}

// 显示扫描报告对话框
function showScanReportDialog(scanId) {
  currentReportScanId.value = scanId
  
  // 自动打开漏洞详情对话框
  showScanDetailsDialog(scanId)
  
  // 然后关闭并打开报告对话框
  setTimeout(() => {
    scanDetailsDialogVisible.value = false
    scanReportDialogVisible.value = true
  }, 100)
}

// 获取漏洞描述
function getVulnerabilityDescription(type) {
  const descriptions = {
    'XSS': '跨站脚本(XSS)漏洞允许攻击者将恶意脚本注入到网页中，当其他用户浏览此页面时，脚本会在用户浏览器中执行，可能导致会话劫持、敏感信息泄露等风险。',
    'SQL注入': 'SQL注入漏洞允许攻击者将恶意SQL代码插入到应用程序的输入中，并在后端数据库上执行，可能导致未授权数据访问、数据泄露或数据损坏。',
    'CSRF': '跨站请求伪造(CSRF)漏洞允许攻击者诱导用户执行非预期的操作，如在用户不知情的情况下更改账户密码或转账。',
    '信息泄露': '信息泄露漏洞涉及应用程序无意中暴露敏感信息，如配置细节、内部路径或用户数据。',
    '配置错误': '配置错误是指系统、框架或应用服务器的安全配置不当，可能导致未授权访问或信息泄露。',
    '文件包含': '文件包含漏洞允许攻击者包含恶意文件，可能导致代码执行、信息泄露或服务器控制。',
    '目录遍历': '目录遍历漏洞允许攻击者访问预期目录外的文件，包括系统文件或其他敏感数据。',
    '敏感信息泄露': '敏感信息泄露是指应用程序在前端或响应中暴露了敏感数据，如API密钥、内部路径、用户数据等。'
  }
  
  return descriptions[type] || '此类型漏洞可能导致系统安全风险，需要及时修复。'
}

// 获取漏洞解决方案
function getVulnerabilitySolution(type) {
  const solutions = {
    'XSS': '对所有用户输入进行严格过滤和编码，使用内容安全策略(CSP)，采用现代框架的自动XSS防护功能。',
    'SQL注入': '使用参数化查询或预处理语句，对用户输入进行验证，采用最小权限数据库账户。',
    'CSRF': '实现Anti-CSRF令牌，验证Referer头，使用SameSite Cookie属性，要求重新认证敏感操作。',
    '信息泄露': '审查错误消息，配置适当的HTTP响应头，移除敏感数据，确保生产环境禁用调试信息。',
    '配置错误': '遵循安全配置指南，禁用不必要的功能，移除默认账户，实施最小权限原则。',
    '文件包含': '限制文件包含功能，验证和净化用户输入，使用预定义的文件列表而非直接接受用户输入。',
    '目录遍历': '使用安全函数处理文件路径，限制文件访问仅在特定目录内，验证用户输入。',
    '敏感信息泄露': '审查所有响应内容，实施适当的数据脱敏，配置安全的HTTP头，确保错误消息不泄露敏感信息。'
  }
  
  return solutions[type] || '建议联系安全专家进行详细评估和修复建议。'
}

// 导出报告
function exportReport(format = 'pdf') {
  ElMessage.success(`正在将报告导出为${format.toUpperCase()}格式...`)
  
  setTimeout(() => {
    ElMessage.success(`报告已成功导出`)
  }, 1500)
}

// 发送报告邮件
function emailReport(email) {
  if (!email) {
    ElMessageBox.prompt('请输入接收报告的邮箱地址', '发送报告', {
      confirmButtonText: '发送',
      cancelButtonText: '取消',
      inputPattern: /[\w!#$%&'*+/=?^_`{|}~-]+(?:\.[\w!#$%&'*+/=?^_`{|}~-]+)*@(?:[\w](?:[\w-]*[\w])?\.)+[\w](?:[\w-]*[\w])?/,
      inputErrorMessage: '请输入有效的邮箱地址'
    }).then(({ value }) => {
      ElMessage({
        type: 'success',
        message: `报告正在发送至 ${value}`
      })
    }).catch(() => {})
  } else {
    ElMessage({
      type: 'success',
      message: `报告正在发送至 ${email}`
    })
  }
}

// 生成PDF
async function generatePDF() {
  try {
    ElMessage.info('正在准备打印PDF报告，请稍候...')
    
    // 使用浏览器原生打印功能
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      throw new Error('请允许浏览器打开弹窗以生成PDF')
    }
    
    // 获取PDF模板元素
    const element = pdfContainer.value.querySelector('#report-pdf-template')
    if (!element) {
      throw new Error('无法找到PDF模板元素')
    }
    
    // 设置打印窗口内容
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>安全扫描报告 - ${currentReportScanId.value}</title>
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
    
    ElMessage.success('PDF打印窗口已打开，请选择"保存为PDF"选项')
  } catch (error) {
    console.error('生成PDF时出错:', error)
    ElMessage.error('生成PDF失败: ' + error.message)
  }
}

// 添加清空所有扫描历史记录功能
async function clearAllScanHistory() {
  try {
    await scanStore.clearAllScans()
    // 重新获取扫描列表
    fetchScans()
    ElMessage.success('扫描历史已清空')
  } catch (error) {
    console.error('清空扫描历史失败:', error)
    ElMessage.error('清空扫描历史失败: ' + (error.message || '未知错误'))
  }
}

onMounted(() => {
  fetchScans()
  
  // 模拟活跃扫描的进度更新
  const progressInterval = setInterval(() => {
    if (activeScans.value.length > 0) {
      activeScans.value.forEach(scan => {
        if (scan.status === 'in_progress') {
          scan.progress = Math.min(99, (scan.progress || 0) + Math.floor(Math.random() * 5) + 1)
          
          // 随机完成某些扫描
          if (scan.progress > 90 && Math.random() > 0.7) {
            scan.status = 'completed'
            scan.progress = 100
            scan.end_time = new Date().toISOString()
            
            // 添加到历史记录
            scans.value.unshift({
              id: scan.id,
              url: scan.url,
              start_time: scan.start_time,
              end_time: scan.end_time,
              status: 'completed',
              vulnerabilities: Math.random() > 0.5 ? 
                Array(Math.floor(Math.random() * 4) + 1).fill(0).map(() => {
                  const types = ['XSS', 'SQL注入', 'CSRF', '信息泄露', '配置错误']
                  const severities = ['高', '中', '低']
                  return { 
                    type: types[Math.floor(Math.random() * types.length)], 
                    severity: severities[Math.floor(Math.random() * severities.length)] 
                  }
                }) : []
            })
            
            // 更新localStorage
            scanStore.saveScansToLocalStorage && scanStore.saveScansToLocalStorage()
            
            // 通知用户
            ElMessage.success(`扫描任务 ${scan.id} 已完成`)
          }
        }
      })
      
      // 更新活跃扫描列表
      activeScans.value = activeScans.value.filter(scan => scan.status !== 'completed')
    }
  }, 3000)
  
  onUnmounted(() => {
    clearInterval(progressInterval)
  })
})
</script>

<style scoped>
.scan-center {
  min-height: calc(100vh - 64px);
  background-color: #f5f7fa;
}

/* PDF容器样式 */
.pdf-container {
  position: absolute;
  left: -9999px;
  top: 0;
  width: 210mm; /* A4宽度 */
  z-index: -1000;
}

.pdf-template {
  font-family: 'SimSun', 'Arial', sans-serif;
  background-color: white;
  padding: 20px;
  width: 210mm;
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

.vulnerability-details h2,
.vulnerability-summary h2,
.remediation-advice h2 {
  font-size: 18px;
  margin-top: 25px;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
}

.vulnerability-item {
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 5px;
}

.advice-item {
  margin-bottom: 15px;
}
</style> 