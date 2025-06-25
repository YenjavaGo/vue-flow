<template>
  <div class="flow-container">
    <!-- 左側畫布區域 -->
    <div class="flow-canvas">
      <VueFlow
        ref="vueFlowRef"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        @drop="onDrop"
        @dragover="onDragOver"
        @node-click="onNodeClick"
        @node-double-click="onNodeDoubleClick"
        @edge-click="onEdgeClick"
        @connect="onConnect"
        @keydown="onKeyDown"
        @pane-click="onPaneClick"
        :default-edge-options="{ type: 'smoothstep' }"
        :nodes-connectable="true"
        :edges-updatable="true"
        :delete-key-code="['Delete', 'Backspace']"
        fit-view-on-init
        tabindex="0"
      >
      </VueFlow>
    </div>
    
    <!-- 右側節點面板 -->
    <div class="flow-sidebar">
      <!-- 控制面板 -->
      <div class="control-panel">
        <button 
          class="execute-button" 
          :class="{ 
            'executing': isExecuting,
            'disabled': !canExecute
          }"
          @click="executeFlow"
          :disabled="!canExecute || isExecuting"
        >
          <span v-if="!isExecuting">▶ 啟動</span>
          <span v-else>⏸ 執行中...</span>
        </button>
        
        <div v-if="executionSummary" class="execution-summary">
          <div class="summary-item">
            <span>總節點: {{ executionSummary.totalNodes }}</span>
          </div>
          <div class="summary-item success">
            <span>成功: {{ executionSummary.successCount }}</span>
          </div>
          <div class="summary-item error" v-if="executionSummary.errorCount > 0">
            <span>失敗: {{ executionSummary.errorCount }}</span>
          </div>
        </div>
        
        <!-- 批量操作按鈕 -->
        <div v-if="nodes.length > 0 || edges.length > 0" class="bulk-actions">
          <button 
            class="clear-button" 
            :class="{ 'disabled': isExecuting }"
            @click="clearAll"
            :disabled="isExecuting"
            title="清空所有節點和連線"
          >
            🗑️ 清空畫布
          </button>
          <div class="stats">
            節點: {{ nodes.length }} | 連線: {{ edges.length }}
          </div>
        </div>
      </div>
      
      <div class="node-panel">
        <h3>可用節點</h3>
        <div
          v-for="nodeConfig in availableNodes"
          :key="nodeConfig.id"
          class="node-item"
          draggable="true"
          @dragstart="onDragStart($event, nodeConfig)"
        >
          <div 
            class="node-icon" 
            :style="{ backgroundColor: nodeConfig.color }"
          >
            {{ nodeConfig.icon }}
          </div>
          <div class="node-info">
            <div class="node-name">{{ nodeConfig.name }}</div>
            <div class="node-type">{{ nodeConfig.type }}</div>
          </div>
        </div>
      </div>
      
      <!-- 節點屬性面板 -->
      <div v-if="selectedNode" class="node-panel">
        <h3>節點屬性</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
          <div style="margin-bottom: 10px;">
            <strong>節點ID:</strong> {{ selectedNode.id }}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>節點類型:</strong> {{ selectedNode.type }}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>標籤:</strong> {{ selectedNode.data?.label }}
          </div>
          <div style="margin-bottom: 15px;">
            <strong>位置:</strong> 
            x: {{ Math.round(selectedNode.position.x) }}, 
            y: {{ Math.round(selectedNode.position.y) }}
          </div>
          
          <!-- 操作按鈕組 -->
          <div class="action-buttons">
            <button 
              class="edit-button" 
              :class="{ 'disabled': isExecuting }"
              @click="openEditModal(selectedNode)"
              :disabled="isExecuting"
              title="編輯節點 (雙擊節點)"
            >
              ✏️ 編輯節點
            </button>
            
            <button 
              class="delete-button" 
              :class="{ 'disabled': isExecuting }"
              @click="deleteSelectedNode"
              :disabled="isExecuting"
              title="刪除節點 (Delete鍵)"
            >
              🗑️ 刪除節點
            </button>
          </div>
        </div>
      </div>
      
      <!-- 邊屬性面板 -->
      <div v-if="selectedEdge" class="node-panel">
        <h3>連線屬性</h3>
        <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
          <div style="margin-bottom: 10px;">
            <strong>連線ID:</strong> {{ selectedEdge.id }}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>來源節點:</strong> {{ getNodeLabel(selectedEdge.source) }}
          </div>
          <div style="margin-bottom: 10px;">
            <strong>目標節點:</strong> {{ getNodeLabel(selectedEdge.target) }}
          </div>
          <div style="margin-bottom: 15px;">
            <strong>連線類型:</strong> {{ selectedEdge.type }}
          </div>
          
          <!-- 刪除按鈕 -->
          <button 
            class="delete-button" 
            :class="{ 'disabled': isExecuting }"
            @click="deleteSelectedEdge"
            :disabled="isExecuting"
            title="刪除連線 (Delete鍵)"
          >
            🗑️ 刪除連線
          </button>
        </div>
      </div>
    </div>
    
    <!-- 節點編輯模態窗口 -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>編輯節點配置</h3>
          <button class="close-btn" @click="closeEditModal">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>節點名稱</label>
            <input 
              v-model="editingNode.label" 
              type="text" 
              class="form-input"
              placeholder="輸入節點名稱"
            />
          </div>
          
          <div class="form-group">
            <label>節點描述</label>
            <textarea 
              v-model="editingNode.description" 
              class="form-textarea"
              placeholder="輸入節點功能描述"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>業務配置</label>
            <div class="config-section">
              
              <!-- 通用配置 -->
              <div class="config-item">
                <label class="config-label">超時時間 (秒)</label>
                <input 
                  v-model.number="editingNode.config.timeout" 
                  type="number" 
                  class="config-input"
                  min="1"
                  max="300"
                />
              </div>
              
              <div class="config-item">
                <label class="config-label">重試次數</label>
                <input 
                  v-model.number="editingNode.config.retries" 
                  type="number" 
                  class="config-input"
                  min="0"
                  max="10"
                />
              </div>
              
              <!-- 動態配置根據節點類型 -->
              <template v-if="editingNode.type === 'auth'">
                <div class="config-item">
                  <label class="config-label">認證方式</label>
                  <select v-model="editingNode.config.authMethod" class="config-select">
                    <option value="oauth2">OAuth 2.0</option>
                    <option value="jwt">JWT Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key</option>
                  </select>
                </div>
                
                <div class="config-item">
                  <label class="config-label">會話超時 (秒)</label>
                  <input 
                    v-model.number="editingNode.config.sessionTimeout" 
                    type="number" 
                    class="config-input"
                    min="300"
                    max="86400"
                  />
                </div>
                
                <div class="config-item">
                  <label class="config-checkbox">
                    <input 
                      v-model="editingNode.config.multiFactorAuth" 
                      type="checkbox"
                    />
                    啟用多因子認證
                  </label>
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'transaction'">
                <div class="config-item">
                  <label class="config-label">最大交易金額</label>
                  <input 
                    v-model.number="editingNode.config.maxAmount" 
                    type="number" 
                    class="config-input"
                    min="1"
                  />
                </div>
                
                <div class="config-item">
                  <label class="config-label">支援幣別</label>
                  <input 
                    v-model="editingNode.config.currencies" 
                    type="text" 
                    class="config-input"
                    placeholder="如: TWD,USD,EUR"
                  />
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'risk'">
                <div class="config-item">
                  <label class="config-label">風險閾值</label>
                  <input 
                    v-model.number="editingNode.config.riskThreshold" 
                    type="number" 
                    class="config-input"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
                
                <div class="config-item">
                  <label class="config-checkbox">
                    <input 
                      v-model="editingNode.config.autoBlock" 
                      type="checkbox"
                    />
                    自動攔截高風險交易
                  </label>
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'fraud'">
                <div class="config-item">
                  <label class="config-label">檢測敏感度</label>
                  <input 
                    v-model.number="editingNode.config.sensitivity" 
                    type="number" 
                    class="config-input"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
                
                <div class="config-item">
                  <label class="config-label">ML模型</label>
                  <select v-model="editingNode.config.mlModel" class="config-select">
                    <option value="xgboost">XGBoost</option>
                    <option value="randomforest">Random Forest</option>
                    <option value="neural">Neural Network</option>
                    <option value="svm">SVM</option>
                  </select>
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'notify'">
                <div class="config-item">
                  <label class="config-label">通知渠道</label>
                  <div class="checkbox-group">
                    <label class="config-checkbox">
                      <input type="checkbox" value="email" v-model="editingNode.config.channels" />
                      電子郵件
                    </label>
                    <label class="config-checkbox">
                      <input type="checkbox" value="sms" v-model="editingNode.config.channels" />
                      簡訊
                    </label>
                    <label class="config-checkbox">
                      <input type="checkbox" value="push" v-model="editingNode.config.channels" />
                      推播通知
                    </label>
                    <label class="config-checkbox">
                      <input type="checkbox" value="webhook" v-model="editingNode.config.channels" />
                      Webhook
                    </label>
                  </div>
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'payment'">
                <div class="config-item">
                  <label class="config-label">支付閘道</label>
                  <input 
                    v-model="editingNode.config.gateways" 
                    type="text" 
                    class="config-input"
                    placeholder="如: visa,mastercard,applepay"
                  />
                </div>
                
                <div class="config-item">
                  <label class="config-label">手續費率 (%)</label>
                  <input 
                    v-model.number="editingNode.config.feeRate" 
                    type="number" 
                    class="config-input"
                    min="0"
                    max="10"
                    step="0.01"
                  />
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'account'">
                <div class="config-item">
                  <label class="config-label">帳戶類型</label>
                  <input 
                    v-model="editingNode.config.accountTypes" 
                    type="text" 
                    class="config-input"
                    placeholder="如: 儲蓄,支票,信用"
                  />
                </div>
                
                <div class="config-item">
                  <label class="config-label">最大帳戶數</label>
                  <input 
                    v-model.number="editingNode.config.maxAccounts" 
                    type="number" 
                    class="config-input"
                    min="1"
                    max="100"
                  />
                </div>
              </template>
              
              <template v-else-if="editingNode.type === 'audit'">
                <div class="config-item">
                  <label class="config-label">保存期限</label>
                  <select v-model="editingNode.config.retention" class="config-select">
                    <option value="1year">1年</option>
                    <option value="3years">3年</option>
                    <option value="5years">5年</option>
                    <option value="7years">7年</option>
                    <option value="10years">10年</option>
                  </select>
                </div>
                
                <div class="config-item">
                  <label class="config-checkbox">
                    <input 
                      v-model="editingNode.config.encryption" 
                      type="checkbox"
                    />
                    啟用加密儲存
                  </label>
                </div>
              </template>
              
            </div>
          </div>
          
          <div class="form-group">
            <label>備註</label>
            <textarea 
              v-model="editingNode.notes" 
              class="form-textarea"
              placeholder="添加額外備註或說明"
              rows="2"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEditModal">取消</button>
          <button class="save-btn" @click="saveNodeChanges">保存變更</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw, nextTick } from 'vue'
import { VueFlow } from '@vue-flow/core'
import CustomNode from './components/CustomNode.vue'
import { executeFlow as runFlow, validateFlow } from './utils/flowExecutor.js'

// Vue Flow 參考
const vueFlowRef = ref(null)

// 執行狀態
const isExecuting = ref(false)
const executionSummary = ref(null)

// 自定義節點類型 (使用markRaw避免組件被響應式包裝)
const nodeTypes = markRaw({
  custom: CustomNode
})

// 流程圖節點和邊 (預設為空)
const nodes = ref([])

const edges = ref([])

// 選中的節點和邊
const selectedNode = ref(null)
const selectedEdge = ref(null)

// 編輯相關狀態
const showEditModal = ref(false)
const editingNode = ref({
  id: '',
  label: '',
  description: '',
  type: '',
  config: {},
  notes: ''
})

// 帳戶交易系統節點清單
const availableNodes = ref([
  {
    id: 'auth',
    name: '用戶認證系統',
    type: '核心系統',
    icon: '🔐',
    color: '#4285f4',
    nodeType: 'custom'
  },
  {
    id: 'account',
    name: '帳戶管理系統',
    type: '核心系統',
    icon: '👤',
    color: '#34a853',
    nodeType: 'custom'
  },
  {
    id: 'transaction',
    name: '交易處理系統',
    type: '核心系統',
    icon: '💰',
    color: '#ea4335',
    nodeType: 'custom'
  },
  {
    id: 'risk',
    name: '風險控制系統',
    type: '核心系統',
    icon: '🛡️',
    color: '#ff9800',
    nodeType: 'custom'
  },
  {
    id: 'payment',
    name: '支付閘道系統',
    type: '核心系統',
    icon: '💳',
    color: '#9c27b0',
    nodeType: 'custom'
  },
  {
    id: 'verify',
    name: '身份驗證服務',
    type: '微服務',
    icon: '✅',
    color: '#2196f3',
    nodeType: 'custom'
  },
  {
    id: 'balance',
    name: '餘額查詢服務',
    type: '微服務',
    icon: '💵',
    color: '#607d8b',
    nodeType: 'custom'
  },
  {
    id: 'validate',
    name: '交易驗證服務',
    type: '微服務',
    icon: '🔍',
    color: '#795548',
    nodeType: 'custom'
  },
  {
    id: 'fraud',
    name: '欺詐檢測服務',
    type: '微服務',
    icon: '🚨',
    color: '#f44336',
    nodeType: 'custom'
  },
  {
    id: 'notify',
    name: '通知服務',
    type: '微服務',
    icon: '📧',
    color: '#3f51b5',
    nodeType: 'custom'
  },
  {
    id: 'audit',
    name: '審計日誌服務',
    type: '微服務',
    icon: '📋',
    color: '#009688',
    nodeType: 'custom'
  },
  {
    id: 'report',
    name: '報表生成服務',
    type: '微服務',
    icon: '📊',
    color: '#e91e63',
    nodeType: 'custom'
  },
  {
    id: 'sync',
    name: '資料同步服務',
    type: '微服務',
    icon: '🔄',
    color: '#00bcd4',
    nodeType: 'custom'
  }
])

// 節點點擊事件
const onNodeClick = (event) => {
  selectedNode.value = event.node
  selectedEdge.value = null // 清空邊選擇
}

// 節點雙擊事件
const onNodeDoubleClick = (event) => {
  // 檢查是否正在執行流程
  if (isExecuting.value) {
    alert('流程執行中，無法編輯節點')
    return
  }
  
  openEditModal(event.node)
}

// 邊點擊事件
const onEdgeClick = (event) => {
  selectedEdge.value = event.edge
  selectedNode.value = null // 清空節點選擇
  console.log('邊被點擊:', event.edge)
}

// 連接事件 - 當用戶拖拽連接兩個節點時觸發
const onConnect = (connection) => {
  const newEdge = {
    id: `edge-${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    type: 'smoothstep'
  }
  edges.value.push(newEdge)
  console.log('新連線建立:', newEdge)
}

// 拖拽開始
const onDragStart = (event, nodeConfig) => {
  event.dataTransfer.setData('application/vueflow', JSON.stringify(nodeConfig))
  event.dataTransfer.effectAllowed = 'move'
}

// 拖拽懸停
const onDragOver = (event) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽放置
const onDrop = async (event) => {
  event.preventDefault()
  
  // 獲取拖拽的資料
  const nodeData = JSON.parse(event.dataTransfer.getData('application/vueflow'))
  
  // 計算相對於畫布的座標
  const flowContainer = event.currentTarget
  const rect = flowContainer.getBoundingClientRect()
  
  // 計算畫布中心點位置，讓新節點出現在視野中心附近
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  // 使用滑鼠位置，但確保在合理範圍內
  let x = event.clientX - rect.left
  let y = event.clientY - rect.top
  
  // 如果拖拽位置超出畫布邊界，則放置在中心附近
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
    x = centerX + (Math.random() - 0.5) * 200 // 在中心附近隨機偏移
    y = centerY + (Math.random() - 0.5) * 200
  }
  
  const position = { x, y }

  const newNode = {
    id: `${nodeData.id}_${Date.now()}`,
    type: nodeData.nodeType,
    position,
    data: {
      label: nodeData.name,
      subtitle: nodeData.type,
      icon: nodeData.icon,
      color: nodeData.color
    }
  }

  nodes.value.push(newNode)
  
  // 等待下一個tick讓DOM更新，然後嘗試將視野調整到包含所有節點
  await nextTick()
  console.log('新節點已添加到畫布:', newNode)
}

// 檢查是否可以執行流程
const canExecute = computed(() => {
  return nodes.value.length > 0 && !isExecuting.value
})

// 更新節點狀態
const updateNodeStatus = (nodeId, statusUpdate) => {
  const nodeIndex = nodes.value.findIndex(node => node.id === nodeId)
  if (nodeIndex !== -1) {
    nodes.value[nodeIndex].data = {
      ...nodes.value[nodeIndex].data,
      ...statusUpdate
    }
  }
}

// 執行流程
const executeFlow = async () => {
  // 驗證流程
  const validation = validateFlow(nodes.value, edges.value)
  if (!validation.valid) {
    alert(validation.message)
    return
  }
  
  isExecuting.value = true
  executionSummary.value = null
  
  console.log('開始執行流程...')
  
  try {
    const summary = await runFlow(
      nodes.value,
      edges.value,
      updateNodeStatus,
      (summary) => {
        executionSummary.value = summary
        isExecuting.value = false
        
        // 顯示執行結果
        const message = summary.errorCount > 0 
          ? `流程執行完成！成功: ${summary.successCount}，失敗: ${summary.errorCount}`
          : `流程執行成功！所有 ${summary.successCount} 個節點都已完成`
        
        alert(message)
      }
    )
  } catch (error) {
    console.error('流程執行錯誤:', error)
    alert('流程執行發生錯誤: ' + error.message)
    isExecuting.value = false
  }
}

// 更新可用節點的方法（從後端API取得）
const updateAvailableNodes = async () => {
  try {
    // 這裡可以替換為實際的API呼叫
    // const response = await fetch('/api/nodes')
    // const nodeData = await response.json()
    // 或者從JSON檔案載入
    const { loadNodesFromJson } = await import('./utils/nodeLoader.js')
    const loadedNodes = loadNodesFromJson()
    availableNodes.value = loadedNodes
    
    console.log('節點設定已從JSON更新:', loadedNodes.length, '個節點')
  } catch (error) {
    console.error('取得節點設定失敗:', error)
  }
}

// 鍵盤事件處理
const onKeyDown = (event) => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    
    if (selectedNode.value) {
      deleteSelectedNode()
    } else if (selectedEdge.value) {
      deleteSelectedEdge()
    }
  }
}

// 刪除選中的節點
const deleteSelectedNode = () => {
  if (!selectedNode.value) return
  
  // 檢查是否正在執行流程
  if (isExecuting.value) {
    alert('流程執行中，無法刪除節點')
    return
  }
  
  const nodeId = selectedNode.value.id
  
  // 確認刪除
  if (confirm(`確定要刪除節點「${selectedNode.value.data?.label}」嗎？\n這將同時刪除所有相關的連線。`)) {
    // 刪除節點
    nodes.value = nodes.value.filter(node => node.id !== nodeId)
    
    // 刪除相關的邊
    edges.value = edges.value.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    )
    
    // 清空選擇
    selectedNode.value = null
    
    console.log(`節點 ${nodeId} 及相關連線已刪除`)
  }
}

// 刪除選中的邊
const deleteSelectedEdge = () => {
  if (!selectedEdge.value) return
  
  // 檢查是否正在執行流程
  if (isExecuting.value) {
    alert('流程執行中，無法刪除連線')
    return
  }
  
  const edgeId = selectedEdge.value.id
  
  // 確認刪除
  if (confirm(`確定要刪除這條連線嗎？`)) {
    // 刪除邊
    edges.value = edges.value.filter(edge => edge.id !== edgeId)
    
    // 清空選擇
    selectedEdge.value = null
    
    console.log(`連線 ${edgeId} 已刪除`)
  }
}

// 獲取節點標籤（用於顯示邊的來源和目標節點名稱）
const getNodeLabel = (nodeId) => {
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? node.data?.label : nodeId
}

// 點擊空白區域取消選擇
const onPaneClick = () => {
  selectedNode.value = null
  selectedEdge.value = null
}

// 清空所有節點和邊
const clearAll = () => {
  // 檢查是否正在執行流程
  if (isExecuting.value) {
    alert('流程執行中，無法清空畫布')
    return
  }
  
  if (confirm(`確定要清空畫布嗎？\n這將刪除所有 ${nodes.value.length} 個節點和 ${edges.value.length} 條連線。`)) {
    nodes.value = []
    edges.value = []
    selectedNode.value = null
    selectedEdge.value = null
    executionSummary.value = null
    
    console.log('畫布已清空')
  }
}

// 獲取默認配置
const getDefaultConfig = (nodeType) => {
  const baseConfig = {
    timeout: 30,
    retries: 3
  }
  
  const typeConfigs = {
    'auth': {
      authMethod: 'oauth2',
      sessionTimeout: 3600,
      multiFactorAuth: true
    },
    'account': {
      accountTypes: '儲蓄,支票,信用',
      maxAccounts: 10
    },
    'transaction': {
      maxAmount: 1000000,
      currencies: 'TWD,USD,EUR'
    },
    'risk': {
      riskThreshold: 0.7,
      autoBlock: true,
      alertLevel: 'medium'
    },
    'payment': {
      gateways: 'visa,mastercard,applepay',
      feeRate: 2.5
    },
    'verify': {
      methods: ['sms', 'email', 'biometric'],
      otpExpiry: 300
    },
    'balance': {
      cacheTimeout: 60,
      precision: 2
    },
    'validate': {
      rules: ['amount', 'frequency', 'recipient'],
      strict: true
    },
    'fraud': {
      mlModel: 'xgboost',
      sensitivity: 0.8,
      realtime: true
    },
    'notify': {
      channels: ['email', 'sms'],
      templates: true
    },
    'audit': {
      retention: '7years',
      encryption: true,
      compliance: 'SOX'
    },
    'report': {
      formats: ['pdf', 'excel', 'csv'],
      scheduled: true,
      customizable: true
    },
    'sync': {
      mode: 'real-time',
      conflictResolution: 'latest-wins'
    }
  }
  
  return { ...baseConfig, ...(typeConfigs[nodeType] || {}) }
}

// 打開編輯模態窗口
const openEditModal = (node) => {
  const nodeType = node.id.split('_')[0]
  
  editingNode.value = {
    id: node.id,
    label: node.data?.label || '',
    description: node.data?.description || '',
    type: nodeType,
    config: { ...getDefaultConfig(nodeType), ...(node.data?.config || {}) },
    notes: node.data?.notes || ''
  }
  
  showEditModal.value = true
}

// 關閉編輯模態窗口
const closeEditModal = () => {
  showEditModal.value = false
  editingNode.value = {
    id: '',
    label: '',
    description: '',
    type: '',
    config: {},
    notes: ''
  }
}

// 保存節點變更
const saveNodeChanges = () => {
  const nodeIndex = nodes.value.findIndex(node => node.id === editingNode.value.id)
  
  if (nodeIndex !== -1) {
    // 更新節點數據
    nodes.value[nodeIndex].data = {
      ...nodes.value[nodeIndex].data,
      label: editingNode.value.label,
      description: editingNode.value.description,
      config: { ...editingNode.value.config },
      notes: editingNode.value.notes
    }
    
    console.log('節點配置已更新:', editingNode.value)
    closeEditModal()
  }
}

// 元件掛載時取得節點設定
updateAvailableNodes()
</script>

<style scoped>
/* 主要佈局 */
.flow-container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.flow-canvas {
  flex: 1;
  height: 100%;
  position: relative;
}

.flow-sidebar {
  width: 350px;
  background: #f8f9fa;
  border-left: 1px solid #e9ecef;
  overflow-y: auto;
  padding: 20px;
}

/* 控制面板樣式 */
.control-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.execute-button {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.execute-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #3367d6, #2e7d32);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
}

.execute-button.executing {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  animation: executing-pulse 2s infinite;
}

.execute-button.disabled,
.execute-button:disabled {
  background: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.execution-summary {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #4285f4;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item.success {
  color: #4caf50;
  font-weight: 500;
}

.summary-item.error {
  color: #f44336;
  font-weight: 500;
}

@keyframes executing-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 節點面板樣式 */
.node-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.node-panel h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.node-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.node-item:hover {
  background: white;
  border-color: #4285f4;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.1);
  transform: translateY(-1px);
}

.node-item:active {
  cursor: grabbing;
}

.node-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.node-info {
  flex: 1;
}

.node-info .node-name {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  line-height: 1.2;
}

.node-info .node-type {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

/* 操作按鈕組 */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-buttons button {
  flex: 1;
}

/* 編輯按鈕樣式 */
.edit-button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #2196f3, #1976d2);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.edit-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #1976d2, #1565c0);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(33, 150, 243, 0.3);
}

/* 刪除按鈕樣式 */
.delete-button {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.delete-button:hover {
  background: linear-gradient(135deg, #d32f2f, #b71c1c);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(244, 67, 54, 0.3);
}

.delete-button:active {
  transform: translateY(0);
}

.delete-button.disabled,
.delete-button:disabled {
  background: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 批量操作區域 */
.bulk-actions {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #ff9800;
}

.clear-button {
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.clear-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #f57c00, #ef6c00);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(255, 152, 0, 0.3);
}

.clear-button.disabled,
.clear-button:disabled {
  background: #e0e0e0;
  color: #9e9e9e;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.stats {
  font-size: 12px;
  color: #666;
  text-align: center;
  font-weight: 500;
}

/* 編輯模態窗口樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e9ecef;
  color: #333;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.config-section {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  background: #f8f9fa;
}

.config-item {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-item:last-child {
  margin-bottom: 0;
}

.config-label {
  min-width: 120px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  margin-bottom: 0 !important;
}

.config-input,
.config-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  max-width: 200px;
}

.config-input:focus,
.config-select:focus {
  outline: none;
  border-color: #4285f4;
}

.config-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
  margin-bottom: 0 !important;
  cursor: pointer;
}

.config-checkbox input[type="checkbox"] {
  margin: 0;
}

.checkbox-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.cancel-btn,
.save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}

.save-btn {
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
}

.save-btn:hover {
  background: linear-gradient(135deg, #3367d6, #2e7d32);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
}
</style> 