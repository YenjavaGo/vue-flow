<template>
  <div class="flow-manager">
    <!-- 標籤頁切換 -->
    <div class="tab-header">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <!-- 保存的流程 -->
    <div v-if="activeTab === 'saved'" class="tab-content">
      <div class="section-header">
        <h3>已保存的流程</h3>
        <button class="refresh-btn" @click="loadSavedFlows">🔄 刷新</button>
      </div>
      
      <div v-if="savedFlows.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <p>還沒有保存的流程</p>
        <p class="empty-hint">創建流程後點擊保存按鈕來保存您的流程</p>
      </div>
      
      <div v-else class="flow-list">
        <div 
          v-for="flow in savedFlows" 
          :key="flow.id"
          class="flow-item"
          :class="{ 'current-flow': flow.id === currentFlowId }"
        >
          <div class="flow-info">
            <div class="flow-name">{{ flow.name }}</div>
            <div class="flow-meta">
              <span class="flow-date">{{ formatDate(flow.updatedAt) }}</span>
              <span class="flow-nodes">{{ flow.nodes.length }} 個節點</span>
            </div>
            <div v-if="flow.description" class="flow-description">
              {{ flow.description }}
            </div>
          </div>
          
          <div class="flow-actions">
            <button 
              class="action-btn load-btn"
              @click="loadFlowFromManager(flow)"
              title="載入流程"
            >
              📂 載入
            </button>
            <button 
              class="action-btn export-btn"
              @click="exportFlowFromManager(flow)"
              title="導出流程"
            >
              📤 導出
            </button>
            <button 
              class="action-btn delete-btn"
              @click="deleteFlowFromManager(flow.id)"
              title="刪除流程"
            >
              🗑️ 刪除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 流程模板 -->
    <div v-if="activeTab === 'templates'" class="tab-content">
      <div class="section-header">
        <h3>流程模板</h3>
        <p class="section-description">選擇預設模板快速開始</p>
      </div>
      
      <div class="template-grid">
        <div 
          v-for="template in flowTemplates" 
          :key="template.id"
          class="template-card"
        >
          <div class="template-header">
            <div class="template-icon">{{ getTemplateIcon(template.category) }}</div>
            <div class="template-info">
              <div class="template-name">{{ template.name }}</div>
              <div class="template-category">{{ template.category }}</div>
            </div>
          </div>
          
          <div class="template-description">
            {{ template.description }}
          </div>
          
          <div class="template-stats">
            <span class="stat-item">
              <span class="stat-label">節點:</span>
              <span class="stat-value">{{ template.nodes.length }}</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">連線:</span>
              <span class="stat-value">{{ template.edges.length }}</span>
            </span>
          </div>
          
          <button 
            class="template-use-btn"
            @click="useTemplate(template)"
          >
            🚀 使用模板
          </button>
        </div>
      </div>
    </div>
    
    <!-- 執行歷史 -->
    <div v-if="activeTab === 'history'" class="tab-content">
      <div class="section-header">
        <h3>執行歷史</h3>
        <div class="history-actions">
          <button class="refresh-btn" @click="loadExecutionHistory">🔄 刷新</button>
          <button class="export-btn" @click="exportHistory">📊 導出</button>
          <button class="clear-btn" @click="clearHistory">🗑️ 清空</button>
        </div>
      </div>
      
      <!-- 統計信息 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">{{ executionStats.totalExecutions }}</div>
          <div class="stat-label">總執行次數</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ executionStats.successRate }}%</div>
          <div class="stat-label">成功率</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ formatExecutionTime(executionStats.averageExecutionTime) }}</div>
          <div class="stat-label">平均執行時間</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ executionStats.totalNodesExecuted }}</div>
          <div class="stat-label">總節點執行數</div>
        </div>
      </div>
      
      <div v-if="executionHistory.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <p>還沒有執行記錄</p>
        <p class="empty-hint">執行流程後會在這裡顯示歷史記錄</p>
      </div>
      
      <div v-else class="history-list">
        <div 
          v-for="entry in executionHistory" 
          :key="entry.id"
          class="history-item"
          :class="getHistoryItemClass(entry.status)"
        >
          <div class="history-info">
            <div class="history-name">{{ entry.flowName }}</div>
            <div class="history-meta">
              <span class="history-time">{{ formatDateTime(entry.startTime) }}</span>
              <span class="history-duration">{{ formatExecutionTime(entry.executionTime) }}</span>
            </div>
            <div class="history-results">
              <span class="result-success">✓ {{ entry.successCount }}</span>
              <span v-if="entry.errorCount > 0" class="result-error">✗ {{ entry.errorCount }}</span>
              <span class="result-total">/ {{ entry.totalNodes }}</span>
            </div>
          </div>
          
          <div class="history-status">
            <span :class="getStatusClass(entry.status)">
              {{ getStatusText(entry.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 導入流程 -->
    <div v-if="activeTab === 'import'" class="tab-content">
      <div class="section-header">
        <h3>導入流程</h3>
        <p class="section-description">從JSON文件導入流程</p>
      </div>
      
      <div class="import-area">
        <div class="file-drop-zone" @click="triggerFileInput">
          <div class="drop-zone-content">
            <div class="drop-zone-icon">📁</div>
            <div class="drop-zone-text">
              <p>點擊選擇文件或拖拽JSON文件到此處</p>
              <p class="drop-zone-hint">支援的格式：JSON流程文件</p>
            </div>
          </div>
        </div>
        
        <input 
          ref="fileInput"
          type="file"
          accept=".json"
          @change="handleFileImport"
          style="display: none"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  saveFlow, 
  getSavedFlows, 
  loadFlow, 
  deleteFlow, 
  importFlow, 
  getFlowTemplates 
} from '../utils/flowStorage.js'
import { 
  getExecutionHistory, 
  getExecutionStats, 
  exportExecutionHistory, 
  clearExecutionHistory,
  formatExecutionTime,
  formatDateTime
} from '../utils/executionHistory.js'

// Props
const props = defineProps({
  currentFlowId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['load-flow', 'use-template', 'import-flow'])

// 響應式數據
const activeTab = ref('saved')
const savedFlows = ref([])
const executionHistory = ref([])
const executionStats = ref({})
const fileInput = ref(null)

// 標籤頁配置
const tabs = [
  { id: 'saved', name: '已保存' },
  { id: 'templates', name: '模板' },
  { id: 'history', name: '歷史' },
  { id: 'import', name: '導入' }
]

// 流程模板
const flowTemplates = computed(() => getFlowTemplates())

// 初始化
onMounted(() => {
  loadSavedFlows()
  loadExecutionHistory()
})

// 載入保存的流程
const loadSavedFlows = () => {
  savedFlows.value = getSavedFlows()
}

// 載入執行歷史
const loadExecutionHistory = () => {
  executionHistory.value = getExecutionHistory()
  executionStats.value = getExecutionStats()
}

// 載入流程
const loadFlowFromManager = (flow) => {
  emit('load-flow', flow)
}

// 刪除流程
const deleteFlowFromManager = (flowId) => {
  if (confirm('確定要刪除此流程嗎？此操作無法撤銷。')) {
    if (deleteFlow(flowId)) {
      loadSavedFlows()
    }
  }
}

// 導出流程
const exportFlowFromManager = (flow) => {
  import('../utils/flowStorage.js').then(({ exportFlow: exportFlowUtil }) => {
    exportFlowUtil(flow, `${flow.name}.json`)
  })
}

// 使用模板
const useTemplate = (template) => {
  emit('use-template', template)
}

// 觸發文件選擇
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 處理文件導入
const handleFileImport = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    const flowData = await importFlow(file)
    emit('import-flow', flowData)
    alert('流程導入成功！')
  } catch (error) {
    alert('導入失敗：' + error.message)
  }
  
  // 清空文件輸入
  event.target.value = ''
}

// 導出歷史記錄
const exportHistory = () => {
  exportExecutionHistory()
}

// 清空歷史記錄
const clearHistory = () => {
  if (confirm('確定要清空所有執行歷史記錄嗎？此操作無法撤銷。')) {
    clearExecutionHistory()
    loadExecutionHistory()
  }
}

// 格式化日期
const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString('zh-TW')
}

// 獲取模板圖標
const getTemplateIcon = (category) => {
  const icons = {
    '認證流程': '🔐',
    '風險管理': '🛡️',
    '支付處理': '💳',
    '數據處理': '📊'
  }
  return icons[category] || '📋'
}

// 獲取歷史項目樣式類
const getHistoryItemClass = (status) => {
  return {
    'history-success': status === 'success',
    'history-partial': status === 'partial_success',
    'history-error': status === 'error'
  }
}

// 獲取狀態樣式類
const getStatusClass = (status) => {
  return {
    'status-success': status === 'success',
    'status-partial': status === 'partial_success',
    'status-error': status === 'error'
  }
}

// 獲取狀態文本
const getStatusText = (status) => {
  const statusMap = {
    'success': '成功',
    'partial_success': '部分成功',
    'error': '失敗'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.flow-manager {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-header {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.tab-button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #e9ecef;
}

.tab-button.active {
  background: white;
  color: #4285f4;
  border-bottom: 2px solid #4285f4;
}

.tab-content {
  padding: 20px;
  max-height: 500px;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.section-description {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.refresh-btn, .export-btn, .clear-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.refresh-btn:hover, .export-btn:hover {
  background: #f8f9fa;
}

.clear-btn:hover {
  background: #ffebee;
  border-color: #f44336;
  color: #f44336;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
}

/* 流程列表 */
.flow-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.2s;
}

.flow-item:hover {
  border-color: #4285f4;
  background: white;
}

.flow-item.current-flow {
  border-color: #4285f4;
  background: #e3f2fd;
}

.flow-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.flow-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.flow-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.flow-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.load-btn:hover {
  background: #e3f2fd;
  border-color: #4285f4;
  color: #4285f4;
}

.export-btn:hover {
  background: #e8f5e8;
  border-color: #4caf50;
  color: #4caf50;
}

.delete-btn:hover {
  background: #ffebee;
  border-color: #f44336;
  color: #f44336;
}

/* 模板網格 */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.template-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background: white;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: #4285f4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.template-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.template-icon {
  font-size: 24px;
  margin-right: 12px;
}

.template-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.template-category {
  font-size: 12px;
  color: #666;
}

.template-description {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 12px;
}

.template-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.stat-value {
  font-weight: 500;
  color: #333;
}

.template-use-btn {
  width: 100%;
  padding: 8px 16px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.template-use-btn:hover {
  background: #3367d6;
}

/* 統計網格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #4285f4;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* 歷史記錄 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  background: white;
}

.history-success {
  border-left: 4px solid #4caf50;
}

.history-partial {
  border-left: 4px solid #ff9800;
}

.history-error {
  border-left: 4px solid #f44336;
}

.history-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.history-results {
  font-size: 12px;
}

.result-success {
  color: #4caf50;
}

.result-error {
  color: #f44336;
}

.result-total {
  color: #666;
}

.history-status {
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  color: #4caf50;
}

.status-partial {
  color: #ff9800;
}

.status-error {
  color: #f44336;
}

/* 導入區域 */
.import-area {
  text-align: center;
}

.file-drop-zone {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-drop-zone:hover {
  border-color: #4285f4;
  background: #f8f9fa;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.drop-zone-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.drop-zone-text {
  color: #666;
}

.drop-zone-hint {
  font-size: 12px;
  margin-top: 8px;
  color: #999;
}
</style> 