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
    
    <!-- 側邊欄切換按鈕 -->
    <button 
      class="sidebar-toggle" 
      @click="toggleSidebar"
      :class="{ 'collapsed': sidebarCollapsed }"
      title="展開/收起側邊欄"
    >
      {{ sidebarCollapsed ? '◀' : '▶' }}
    </button>
    
    <!-- 右側節點面板 -->
    <div class="flow-sidebar" :class="{ 'collapsed': sidebarCollapsed }">
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
          
          <!-- 顯示條件檢查詳情 -->
          <div v-if="executionSummary.results && executionSummary.results.length > 0" class="condition-details">
            <div class="condition-header">執行路徑:</div>
            <div 
              v-for="(result, index) in executionSummary.results" 
              :key="index"
              class="condition-item"
              :class="{ 'condition-success': result.success, 'condition-error': !result.success }"
            >
              <div class="condition-node">
                {{ getNodeLabel(result.nodeId) }}
              </div>
              <div v-if="result.conditionCheck" class="condition-message">
                {{ result.conditionCheck.message }}
              </div>
              <div v-if="result.conditionCheck && result.conditionCheck.matchedCategory" class="condition-match">
                匹配分類: {{ result.conditionCheck.matchedCategory }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 流程管理按鈕 -->
        <div class="flow-management">
          <button 
            class="save-flow-btn"
            @click="showSaveFlowModal = true"
            :disabled="nodes.length === 0"
            title="儲存目前流程"
          >
            💾 儲存流程
          </button>
          
          <button 
            class="load-flow-btn"
            @click="showFlowManager = !showFlowManager"
            title="載入流程或使用模板"
          >
            📂 流程管理
          </button>
        </div>
        
        <!-- 全域變數顯示 -->
        <div v-if="Object.keys(globalVariables).length > 0" class="global-variables">
          <div class="global-variables-header">
            <h4>🌐 全域變數</h4>
          </div>
          <div class="global-variables-list">
            <div 
              v-for="(variable, name) in globalVariables" 
              :key="name"
              class="global-variable-item"
            >
              <div class="variable-name">{{ name }}</div>
              <div class="variable-info">
                <span class="variable-type">{{ variable.type }}</span>
                <span class="variable-value">{{ variable.value }}</span>
              </div>
            </div>
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
      
      <!-- 流程管理器 -->
      <div v-if="showFlowManager" class="flow-manager-container">
        <FlowManager 
          :current-flow-id="currentFlowId"
          @load-flow="loadFlowFromManager"
          @use-template="useTemplateFromManager"
          @import-flow="importFlowFromManager"
        />
      </div>
      
      <!-- 節點面板 -->
      <div v-if="!showFlowManager" class="node-panel">
        <h3>可用節點</h3>
        <div
          v-for="category in nodeCategories"
          :key="category.name"
          class="node-category"
        >
          <div 
            class="category-header"
            @click="toggleCategory(category.name)"
          >
            <div class="category-info">
              <span 
                class="category-toggle"
                :class="{ 'collapsed': collapsedCategories[category.name] }"
              >
                ▼
              </span>
              <div class="category-name">{{ category.name }}</div>
            </div>
            <div class="category-count">{{ category.nodes.length }}</div>
          </div>
          <div 
            v-show="!collapsedCategories[category.name]"
            class="category-nodes"
          >
            <div
              v-for="nodeConfig in category.nodes"
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
        </div>
      </div>
      
      <!-- 節點屬性面板 -->
      <div v-if="selectedNode && !showFlowManager" class="node-panel">
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
          <div v-if="selectedNode.data?.inputParameters" style="margin-bottom: 10px;">
            <strong>輸入參數:</strong>
            <div style="margin-top: 4px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #34a853;">
              <pre style="font-size: 12px; color: #333; line-height: 1.4; margin: 0; white-space: pre-wrap; font-family: 'Courier New', monospace;">{{ selectedNode.data.inputParameters }}</pre>
            </div>
          </div>
          <div v-if="selectedNode.data?.categories && selectedNode.data.categories.length > 0" style="margin-bottom: 10px;">
            <strong>分類:</strong>
            <div style="margin-top: 4px;">
              <span 
                v-for="(category, index) in selectedNode.data.categories" 
                :key="index"
                style="display: inline-block; background: rgba(66, 133, 244, 0.1); color: #4285f4; font-size: 11px; font-weight: 500; padding: 2px 6px; border-radius: 8px; border: 1px solid rgba(66, 133, 244, 0.2); margin-right: 4px; margin-bottom: 2px;"
              >
                {{ category }}
              </span>
            </div>
            <!-- 條件設置 -->
            <div v-if="selectedNode.data?.categoryConditions && selectedNode.data.categoryConditions.length > 0" style="margin-top: 6px;">
              <div style="font-size: 11px; color: #666; margin-bottom: 6px; font-weight: 500;">條件設置:</div>
              <div 
                v-for="(condition, index) in selectedNode.data.categoryConditions" 
                :key="index"
                style="margin-bottom: 6px; padding: 6px 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #4285f4;"
              >
                <div style="font-size: 10px; color: #999; margin-bottom: 2px;">{{ selectedNode.data.categories[index] || `條件 ${index + 1}` }}</div>
                                 <div style="font-size: 11px; color: #333; line-height: 1.3;">
                   <span v-if="condition.parameter" style="margin-right: 8px;"><strong>參數:</strong> {{ condition.parameter }}</span>
                   <span v-if="condition.value" style="margin-right: 8px;"><strong>值:</strong> {{ condition.value }}</span>
                   <span v-if="!condition.parameter && !condition.value" style="color: #999; font-style: italic;">尚未設置</span>
                 </div>
              </div>
            </div>
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
      <div v-if="selectedEdge && !showFlowManager" class="node-panel">
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
            <div class="parameter-header">
              <label>{{ isFlowControlNode(editingNode.type) && editingNode.type === 'start' ? '全域變數設定' : '輸入參數' }}</label>
              <button type="button" class="add-param-btn" @click="addParameter" :title="isFlowControlNode(editingNode.type) && editingNode.type === 'start' ? '新增全域變數' : '新增參數'">
                <span class="plus-icon">+</span>
              </button>
            </div>
            
            <!-- 動態參數列表 -->
            <div v-if="editingNode.dynamicParameters.length > 0" class="parameter-list">
              <div 
                v-for="(param, index) in editingNode.dynamicParameters" 
                :key="index"
                class="parameter-row"
              >
                <div class="param-field">
                  <input 
                    v-model="param.name" 
                    type="text" 
                    class="param-input param-name"
                    :placeholder="isFlowControlNode(editingNode.type) && editingNode.type === 'start' ? '全域變數名稱' : '變數名稱'"
                  />
                </div>
                <div class="param-field">
                  <select v-model="param.type" class="param-select param-type">
                    <option value="string">文字</option>
                    <option value="number">數字</option>
                    <option value="boolean">布林</option>
                  </select>
                </div>
                <div class="param-field">
                  <input 
                    v-if="param.type === 'string'"
                    v-model="param.value" 
                    type="text" 
                    class="param-input param-value"
                    :placeholder="isFlowControlNode(editingNode.type) && editingNode.type === 'start' ? '預設值' : '值'"
                  />
                  <input 
                    v-else-if="param.type === 'number'"
                    v-model.number="param.value" 
                    type="number" 
                    class="param-input param-value"
                    :placeholder="isFlowControlNode(editingNode.type) && editingNode.type === 'start' ? '預設值' : '值'"
                  />
                  <select 
                    v-else-if="param.type === 'boolean'"
                    v-model="param.value" 
                    class="param-select param-value"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </div>
                <button 
                  type="button" 
                  class="delete-param-btn" 
                  @click="removeParameter(index)"
                  title="刪除參數"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <!-- 如果沒有參數，顯示提示 -->
            <div v-else class="no-parameters">
              <span v-if="isFlowControlNode(editingNode.type) && editingNode.type === 'start'">
                尚未設定全域變數，點擊右上角 + 按鈕新增
              </span>
              <span v-else>
                尚未新增參數，點擊右上角 + 按鈕新增
              </span>
            </div>
            
            <div class="field-hint">
              <span v-if="isFlowControlNode(editingNode.type) && editingNode.type === 'start'">
                設定此流程的全域變數，這些變數可在流程中的任何節點使用，包括變數名稱、類型和預設值
              </span>
              <span v-else>
                定義此節點需要的輸入參數，包括參數名稱、類型和預設值
                <span v-if="Object.keys(globalVariables).length > 0" style="display: block; margin-top: 4px; color: #9c27b0; font-size: 11px;">
                  💡 可使用全域變數：{{ Object.keys(globalVariables).join(', ') }}
                </span>
              </span>
            </div>
          </div>
          
          <!-- 全域變數選擇器（僅非開始、結束節點顯示） -->
          <div v-if="!isFlowControlNode(editingNode.type)" class="form-group">
            <div class="global-var-selector-header">
              <label>🌐 使用全域變數</label>
              <div v-if="Object.keys(globalVariables).length > 0" class="global-var-hint">
                點擊變數可快速添加到輸入參數中
              </div>
            </div>
            
            <div v-if="Object.keys(globalVariables).length > 0" class="global-var-grid">
              <div 
                v-for="(variable, name) in globalVariables" 
                :key="name"
                class="global-var-card"
                @click="addGlobalVariableToParams(name, variable)"
                :title="`點擊添加 ${name} 到輸入參數`"
              >
                <div class="var-header">
                  <span class="var-name">[x] {{ name }}</span>
                  <span class="var-type-badge" :class="`type-${variable.type}`">
                    {{ variable.type === 'string' ? 'String' : variable.type === 'number' ? 'Number' : 'Boolean' }}
                  </span>
                </div>
                <div class="var-description">
                  <span class="var-value">{{ variable.value }}</span>
                </div>
              </div>
            </div>
            
            <div v-else class="no-global-variables">
              <div class="no-global-var-icon">📋</div>
              <div class="no-global-var-text">
                <strong>尚未設定全域變數</strong>
                <p>請先在【開始】節點中設定全域變數，執行流程後即可在此處使用</p>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>輸出結果</label>
            <textarea 
              :value="getFormattedParameters(editingNode.inputParameters)" 
              class="form-textarea parameters-preview-textarea"
              readonly
              rows="4"
            ></textarea>
            <div class="field-hint">
              自動格式化和驗證輸入參數的預覽
            </div>
          </div>
          
          <div v-if="!isFlowControlNode(editingNode.type)" class="form-group">
            <label>分類標籤</label>
            <div class="categories-editor">
              <div v-if="editingNode.categories && editingNode.categories.length > 0" class="current-categories">
                <div 
                  v-for="(category, index) in editingNode.categories" 
                  :key="index"
                  class="category-item"
                >
                  <input 
                    v-model="editingNode.categories[index]" 
                    type="text" 
                    class="category-input"
                    placeholder="分類名稱"
                  />
                  <button 
                    type="button"
                    class="remove-category-btn"
                    @click="removeCategory(index)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <button 
                type="button"
                class="add-category-btn"
                @click="addCategory"
              >
                ＋ 新增分類
              </button>
            </div>
          </div>
          
          <div v-if="!isFlowControlNode(editingNode.type)" class="form-group">
            <label>條件設置</label>
            <div v-if="editingNode.categories && editingNode.categories.length > 0" class="condition-settings">
              <div 
                v-for="(category, index) in editingNode.categories" 
                :key="index"
                class="condition-item"
              >
                <div class="condition-header">
                  <span class="condition-category">{{ category || `分類 ${index + 1}` }}</span>
                  <span class="condition-index">條件 {{ index + 1 }}</span>
                </div>
                                 <div class="condition-fields">
                   <div class="condition-field">
                     <label class="condition-field-label">參數</label>
                     <input 
                       v-model="editingNode.categoryConditions[index].parameter" 
                       type="text" 
                       class="condition-input"
                       placeholder="參數名稱"
                     />
                   </div>
                   <div class="condition-field">
                     <label class="condition-field-label">值</label>
                     <input 
                       v-model="editingNode.categoryConditions[index].value" 
                       type="text" 
                       class="condition-input"
                       placeholder="條件值"
                     />
                   </div>
                 </div>
              </div>
            </div>
            <div v-else class="no-categories-hint">
              <div class="hint-icon">ℹ️</div>
              <div class="hint-text">請先新增分類，條件設置會根據分類數量自動產生</div>
            </div>
          </div>
          
          <div v-if="!isFlowControlNode(editingNode.type)" class="form-group">
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
              <template v-if="editingNode.type === 'auth' || editingNode.type === 'account' || editingNode.type === 'transaction' || editingNode.type === 'risk' || editingNode.type === 'payment'">
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
              placeholder="新增額外備註或說明"
              rows="2"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEditModal">取消</button>
          <button class="save-btn" @click="saveNodeChanges">儲存變更</button>
        </div>
      </div>
    </div>
    
    <!-- 儲存流程模態窗口 -->
    <div v-if="showSaveFlowModal" class="modal-overlay" @click="closeSaveFlowModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>儲存流程</h3>
          <button class="close-btn" @click="closeSaveFlowModal">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>流程名稱 *</label>
            <input 
              v-model="saveFlowData.name" 
              type="text" 
              class="form-input"
              placeholder="輸入流程名稱"
              required
            />
          </div>
          
          <div class="form-group">
            <label>流程描述</label>
            <textarea 
              v-model="saveFlowData.description" 
              class="form-textarea"
              placeholder="描述此流程的功能和用途"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>流程統計</label>
            <div class="flow-stats">
              <div class="stat-item">
                <span class="stat-label">節點數量:</span>
                <span class="stat-value">{{ nodes.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">連線數量:</span>
                <span class="stat-value">{{ edges.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">建立時間:</span>
                <span class="stat-value">{{ new Date().toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeSaveFlowModal">取消</button>
          <button 
            class="save-btn" 
            @click="saveCurrentFlow"
            :disabled="!saveFlowData.name.trim()"
          >
            儲存流程
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, markRaw, nextTick, onMounted } from 'vue'
// 導入 Vue Flow 核心元件
import { VueFlow } from '@vue-flow/core'
import CustomNode from './components/CustomNode.vue'
import FlowManager from './components/FlowManager.vue'
import { executeFlow as runFlow, validateFlow } from './utils/flowExecutor.js'
import { saveFlow, updateFlow } from './utils/flowStorage.js'
import { recordExecutionHistory } from './utils/executionHistory.js'

// Vue Flow 元件參考
const vueFlowRef = ref(null)

// 執行狀態
const isExecuting = ref(false)
const executionSummary = ref(null)
const executionStartTime = ref(null)

// 流程管理狀態
const showFlowManager = ref(false)
const showSaveFlowModal = ref(false)
const currentFlowId = ref(null)
const saveFlowData = ref({
  name: '',
  description: ''
})

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
  inputParameters: '',
  dynamicParameters: [], // 新增：動態參數陣列
  config: {},
  categories: [],
  categoryConditions: [],
  notes: ''
})

// 節點分類資料
const nodeCategories = ref([])

// 分類折疊狀態
const collapsedCategories = ref({})

// 側邊欄展開/收起狀態
const sidebarCollapsed = ref(false)

// 全域變數狀態
const globalVariables = ref({})

// 計算屬性：根據類型組織節點
const availableNodes = computed(() => {
  const nodes = []
  nodeCategories.value.forEach(category => {
    nodes.push(...category.nodes)
  })
  return nodes
})

// 切換分類折疊狀態
const toggleCategory = (categoryName) => {
  collapsedCategories.value[categoryName] = !collapsedCategories.value[categoryName]
}

// 切換側邊欄展開/收起狀態
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 新增參數
const addParameter = () => {
  editingNode.value.dynamicParameters.push({
    name: '',
    type: 'string',
    value: ''
  })
}

// 移除參數
const removeParameter = (index) => {
  editingNode.value.dynamicParameters.splice(index, 1)
}

// 判斷是否為流程控制節點
const isFlowControlNode = (nodeType) => {
  return nodeType === 'start' || nodeType === 'end'
}

// 初始化全域變數
const initializeGlobalVariables = () => {
  // 清空現有全域變數
  globalVariables.value = {}
  
  // 尋找開始節點
  const startNodes = nodes.value.filter(node => node.id.includes('start'))
  
  startNodes.forEach(startNode => {
    if (startNode.data?.dynamicParameters) {
      startNode.data.dynamicParameters.forEach(param => {
        if (param.name && param.name.trim()) {
          let value = param.value
          // 根據類型轉換值
          if (param.type === 'number') {
            value = Number(param.value) || 0
          } else if (param.type === 'boolean') {
            value = param.value === 'true' || param.value === true
          }
          
          globalVariables.value[param.name.trim()] = {
            type: param.type,
            value: value,
            source: 'start_node'
          }
        }
      })
    }
  })
  
  console.log('全域變數已初始化:', globalVariables.value)
}

// 從開始節點更新全域變數（不清空，用於即時更新）
const updateGlobalVariablesFromStartNode = () => {
  // 清空現有全域變數
  globalVariables.value = {}
  
  // 尋找開始節點
  const startNodes = nodes.value.filter(node => node.id.includes('start'))
  
  startNodes.forEach(startNode => {
    if (startNode.data?.dynamicParameters) {
      startNode.data.dynamicParameters.forEach(param => {
        if (param.name && param.name.trim()) {
          let value = param.value
          // 根據類型轉換值
          if (param.type === 'number') {
            value = Number(param.value) || 0
          } else if (param.type === 'boolean') {
            value = param.value === 'true' || param.value === true
          }
          
          globalVariables.value[param.name.trim()] = {
            type: param.type,
            value: value,
            source: 'start_node'
          }
        }
      })
    }
  })
  
  console.log('全域變數已即時更新:', globalVariables.value)
}

// 獲取全域變數值
const getGlobalVariable = (variableName) => {
  return globalVariables.value[variableName]?.value
}

// 設置全域變數值
const setGlobalVariable = (variableName, value) => {
  if (globalVariables.value[variableName]) {
    globalVariables.value[variableName].value = value
  }
}

// 添加全域變數到輸入參數
const addGlobalVariableToParams = (varName, variable) => {
  // 檢查是否已經存在同名參數
  const existingIndex = editingNode.value.dynamicParameters.findIndex(param => param.name === varName)
  
  if (existingIndex !== -1) {
    // 如果已存在，詢問是否更新
    if (confirm(`參數 "${varName}" 已存在，是否要更新為全域變數的值？`)) {
      editingNode.value.dynamicParameters[existingIndex] = {
        name: varName,
        type: variable.type,
        value: variable.value
      }
      console.log(`全域變數 "${varName}" 已更新到輸入參數中`)
    }
  } else {
    // 如果不存在，新增參數
    editingNode.value.dynamicParameters.push({
      name: varName,
      type: variable.type,
      value: variable.value
    })
    console.log(`全域變數 "${varName}" 已添加到輸入參數中`)
  }
}

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

// 連接事件 - 當使用者拖拽連接兩個節點時觸發
const onConnect = (connection) => {
  // 產生唯一的edge ID，包含連接點資訊
  const sourceHandle = connection.sourceHandle || 'source'
  const targetHandle = connection.targetHandle || 'target'
  
  const newEdge = {
    id: `edge-${connection.source}-${sourceHandle}-${connection.target}-${targetHandle}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: sourceHandle,
    targetHandle: targetHandle,
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
  
  // 獲取 Vue Flow 實例和當前視野資訊
  const flowInstance = vueFlowRef.value
  if (!flowInstance) {
    console.error('Vue Flow 實例不可用')
    return
  }
  
  // 獲取目前視野資訊
  const viewport = flowInstance.getViewport()
  const flowContainer = event.currentTarget
  const rect = flowContainer.getBoundingClientRect()
  
  // 計算鼠標在畫布坐標系中的位置
  const clientX = event.clientX - rect.left
  const clientY = event.clientY - rect.top
  
  // 轉換到流程座標系（考慮縮放和平移）
  const x = (clientX - viewport.x) / viewport.zoom
  const y = (clientY - viewport.y) / viewport.zoom
  
  // 確保節點位置在合理範圍內（如果拖拽到了畫布外）
  let finalX = x
  let finalY = y
  
  // 如果計算出的位置超出合理範圍，則放置在當前視野中心
  const viewCenterX = (-viewport.x + rect.width / 2) / viewport.zoom
  const viewCenterY = (-viewport.y + rect.height / 2) / viewport.zoom
  
  if (clientX < 0 || clientX > rect.width || clientY < 0 || clientY > rect.height) {
    finalX = viewCenterX + (Math.random() - 0.5) * 100
    finalY = viewCenterY + (Math.random() - 0.5) * 100
  }
  
  const position = { x: finalX, y: finalY }

  // 根據節點類型產生預設分類
  const getDefaultCategories = (nodeId) => {
    const categoryMap = {
      'auth': [],
      'account': [],
      'transaction': [],
      'risk': [],
      'payment': [],
      'verify': [],
      'balance': [],
      'validate': [],
      'fraud': [],
      'notify': [],
      'audit': [],
      'report': [],
      'sync': [],
      'start': [],
      'end': []
    }
    return categoryMap[nodeId] || []
  }

  const newNode = {
    id: `${nodeData.id}_${Date.now()}`,
    type: nodeData.nodeType,
    position,
    data: {
      label: nodeData.name,
      subtitle: nodeData.type,
      icon: nodeData.icon,
      color: nodeData.color,
      status: 'pending',
      categories: getDefaultCategories(nodeData.id)
    }
  }

  nodes.value.push(newNode)
  
  // 等待下一個tick讓DOM更新
  await nextTick()
  console.log('新節點已新增到畫布:', newNode, '位置:', position)
  
  // 如果新增的是開始節點，更新全域變數
  if (nodeData.type === 'start' || newNode.id.includes('start')) {
    // 延遲一下確保節點數據已經更新
    setTimeout(() => {
      updateGlobalVariablesFromStartNode()
    }, 100)
  }
  
  // 自動選中新增的節點
  selectedNode.value = newNode
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
  
  // 初始化全域變數
  initializeGlobalVariables()
  
  isExecuting.value = true
  executionSummary.value = null
  executionStartTime.value = Date.now()
  
  console.log('開始執行流程...')
  console.log('全域變數:', globalVariables.value)
  
  try {
    const summary = await runFlow(
      nodes.value,
      edges.value,
      updateNodeStatus,
      (summary) => {
        executionSummary.value = summary
        isExecuting.value = false
        
        // 顯示執行結果
        let message = summary.errorCount > 0 
          ? `流程執行完成！成功: ${summary.successCount}，失敗: ${summary.errorCount}`
          : `流程執行成功！所有 ${summary.successCount} 個節點都已完成`
        
        // 如果有條件檢查失敗，新增詳細資訊
        const failedResults = summary.results.filter(r => !r.success)
        if (failedResults.length > 0) {
          const errorDetails = failedResults.map(r => 
            `${getNodeLabel(r.nodeId)}: ${r.error}`
          ).join('\n')
          message += `\n\n錯誤詳情:\n${errorDetails}`
        }
        
        alert(message)
        
        // 記錄執行歷史
        const executionTime = Date.now() - executionStartTime.value
        const flowData = {
          id: currentFlowId.value,
          name: currentFlowId.value ? '已保存流程' : '未命名流程',
          nodes: nodes.value,
          edges: edges.value
        }
        recordExecutionHistory(flowData, summary, executionTime)
      }
    )
  } catch (error) {
    console.error('流程執行錯誤:', error)
    alert('流程執行發生錯誤: ' + error.message)
    isExecuting.value = false
  }
}

// 載入節點分類資料
const loadNodeCategories = async () => {
  try {
    // 直接從JSON檔案載入完整的分類結構
    const nodesModule = await import('./data/nodes.json')
    const nodesConfig = nodesModule.default
    
    // 處理分類資料，確保每個節點都有正確的屬性
    const categories = nodesConfig.categories.map(category => ({
      name: category.name,
      nodes: category.nodes.map(node => ({
        ...node,
        category: category.name
      }))
    }))
    
    nodeCategories.value = categories
    
    const totalNodes = categories.reduce((sum, cat) => sum + cat.nodes.length, 0)
    console.log('節點分類已載入:', categories.length, '個分類，', totalNodes, '個節點')
  } catch (error) {
    console.error('載入節點分類失敗:', error)
  }
}

// 更新可用節點的方法（保持向後兼容）
const updateAvailableNodes = loadNodeCategories

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
    
    // 如果刪除的是開始節點，重新更新全域變數
    if (nodeId.includes('start')) {
      updateGlobalVariablesFromStartNode()
    }
    
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
  if (nodeId === 'system') return '系統'
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
  
  if (confirm(`確定要清空畫布嗎？\n這將刪除所有 ${nodes.value.length} 個節點和 ${edges.value.length} 條連線，並清空全域變數。`)) {
    nodes.value = []
    edges.value = []
    selectedNode.value = null
    selectedEdge.value = null
    executionSummary.value = null
    globalVariables.value = {} // 清空全域變數
    
    console.log('畫布已清空，全域變數已重置')
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
      authMethod: 'oauth2',
      sessionTimeout: 3600,
      multiFactorAuth: true
    },
    'transaction': {
      authMethod: 'oauth2',
      sessionTimeout: 3600,
      multiFactorAuth: true
    },
    'risk': {
      authMethod: 'oauth2',
      sessionTimeout: 3600,
      multiFactorAuth: true
    },
    'payment': {
      authMethod: 'oauth2',
      sessionTimeout: 3600,
      multiFactorAuth: true
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
  
  const categories = [...(node.data?.categories || [])]
  const existingConditions = node.data?.categoryConditions || []
  
  // 確保條件數量與分類數量一致
  const categoryConditions = categories.map((_, index) => {
    return existingConditions[index] || {
      parameter: '',
      value: ''
    }
  })
  
  // 處理動態參數的初始化
  let dynamicParameters = []
  if (node.data?.dynamicParameters && Array.isArray(node.data.dynamicParameters)) {
    dynamicParameters = [...node.data.dynamicParameters]
  } else if (node.data?.inputParameters) {
    // 如果有舊的inputParameters，嘗試解析為動態參數
    try {
      const parsed = JSON.parse(node.data.inputParameters)
      if (typeof parsed === 'object' && parsed !== null) {
        dynamicParameters = Object.entries(parsed).map(([name, value]) => ({
          name,
          type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
          value: value
        }))
      }
    } catch (e) {
      // 解析失敗，保持空陣列
    }
  }

  editingNode.value = {
    id: node.id,
    label: node.data?.label || '',
    description: node.data?.description || '',
    type: nodeType,
    inputParameters: node.data?.inputParameters || '',
    dynamicParameters: dynamicParameters,
    config: { ...getDefaultConfig(nodeType), ...(node.data?.config || {}) },
    categories: categories,
    categoryConditions: categoryConditions,
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
    inputParameters: '',
    dynamicParameters: [],
    config: {},
    categories: [],
    categoryConditions: [],
    notes: ''
  }
}

// 保存節點變更
const saveNodeChanges = () => {
  const nodeIndex = nodes.value.findIndex(node => node.id === editingNode.value.id)
  
  if (nodeIndex !== -1) {
    // 過濾掉空的分類
    const filteredCategories = editingNode.value.categories.filter(cat => cat.trim() !== '')
    
    // 過濾對應的條件設置，只保留有效分類對應的條件
    const filteredConditions = editingNode.value.categoryConditions.slice(0, filteredCategories.length)
    
    // 將動態參數轉換為JSON格式的inputParameters
    const dynamicParamsAsJson = JSON.stringify(
      editingNode.value.dynamicParameters.reduce((acc, param) => {
        if (param.name.trim()) {
          let value = param.value
          if (param.type === 'number') {
            value = Number(param.value) || 0
          } else if (param.type === 'boolean') {
            value = param.value === 'true' || param.value === true
          }
          acc[param.name.trim()] = value
        }
        return acc
      }, {}), null, 2
    )

    // 更新節點數據
    nodes.value[nodeIndex].data = {
      ...nodes.value[nodeIndex].data,
      label: editingNode.value.label,
      description: editingNode.value.description,
      inputParameters: dynamicParamsAsJson,
      dynamicParameters: editingNode.value.dynamicParameters, // 儲存動態參數結構
      config: { ...editingNode.value.config },
      categories: filteredCategories,
      categoryConditions: filteredConditions,
      notes: editingNode.value.notes
    }
    
    // 如果是開始節點，立即更新全域變數
    if (editingNode.value.type === 'start' || editingNode.value.id.includes('start')) {
      updateGlobalVariablesFromStartNode()
    }
    
    console.log('節點配置已更新:', editingNode.value)
    closeEditModal()
  }
}

// 新增分類
const addCategory = () => {
  editingNode.value.categories.push('')
  // 同時新增對應的條件設置
  editingNode.value.categoryConditions.push({
    parameter: '',
    value: ''
  })
}

// 移除分類
const removeCategory = (index) => {
  editingNode.value.categories.splice(index, 1)
  // 同時移除對應的條件設置
  editingNode.value.categoryConditions.splice(index, 1)
}

// 格式化和驗證輸入參數
const getFormattedParameters = (paramStr) => {
  if (!paramStr || paramStr.trim() === '') {
    return ''
  }
  
  try {
    // 嘗試解析JSON
    const parsed = JSON.parse(paramStr)
    
    // 如果解析成功，格式化顯示
    const formatted = JSON.stringify(parsed, null, 2)
    
    // 新增一些額外資訊
    const paramCount = Object.keys(parsed).length
    const analysis = `// 參數驗證結果：✓ 有效的JSON格式\n// 參數數量：${paramCount} 個\n// 格式化結果：\n\n${formatted}`
    
    return analysis
  } catch (error) {
    // JSON解析失敗時的處理
    if (paramStr.trim().startsWith('{') || paramStr.trim().startsWith('[')) {
      return `// 參數驗證結果：✗ JSON格式錯誤\n// 錯誤信息：${error.message}\n\n// 原始輸入：\n${paramStr}`
    } else {
      // 如果不是JSON格式，當作普通文字處理
      const lines = paramStr.split('\n')
      const paramCount = lines.filter(line => line.trim() && !line.trim().startsWith('//')).length
      return `// 參數驗證結果：ℹ 非JSON格式（文本格式）\n// 行數：${lines.length}\n// 有效參數行：${paramCount}\n\n// 原始輸入：\n${paramStr}`
    }
  }
}

// 流程管理相關方法
const closeSaveFlowModal = () => {
  showSaveFlowModal.value = false
  saveFlowData.value = {
    name: '',
    description: ''
  }
}

const saveCurrentFlow = () => {
  if (!saveFlowData.value.name.trim()) {
    alert('請輸入流程名稱')
    return
  }
  
  try {
    const flowData = {
      nodes: nodes.value,
      edges: edges.value
    }
    
    if (currentFlowId.value) {
      // 更新現有流程
      updateFlow(currentFlowId.value, nodes.value, edges.value, saveFlowData.value.description)
      alert('流程更新成功！')
    } else {
      // 儲存新流程
      const savedFlow = saveFlow(saveFlowData.value.name, nodes.value, edges.value, saveFlowData.value.description)
      currentFlowId.value = savedFlow.id
      alert('流程儲存成功！')
    }
    
    closeSaveFlowModal()
  } catch (error) {
    alert('儲存失敗：' + error.message)
  }
}

const loadFlowFromManager = (flow) => {
  try {
    console.log('載入流程:', flow)
    console.log('流程節點:', flow.nodes)
    console.log('流程連線:', flow.edges)
    
    // 清空現有數據
    nodes.value = []
    edges.value = []
    
    // 使用nextTick確保DOM更新
    nextTick(() => {
      // 載入流程數據
      nodes.value = [...flow.nodes]
      edges.value = [...flow.edges]
      currentFlowId.value = flow.id
      
      console.log('載入後的節點:', nodes.value)
      console.log('載入後的連線:', edges.value)
      
      // 重置所有節點狀態
      nodes.value.forEach(node => {
        if (node.data) {
          node.data.status = 'pending'
          node.data.errorMessage = null
        }
      })
      
      // 等待一下再調整視野，確保節點已渲染
      setTimeout(() => {
        if (vueFlowRef.value) {
          vueFlowRef.value.fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 1.5 })
        }
      }, 100)
      
      showFlowManager.value = false
      alert('流程載入成功！')
    })
  } catch (error) {
    console.error('載入失敗:', error)
    alert('載入失敗：' + error.message)
  }
}

const useTemplateFromManager = (template) => {
  try {
    console.log('載入模板:', template)
    console.log('模板節點:', template.nodes)
    console.log('模板連線:', template.edges)
    
    // 清空現有數據
    nodes.value = []
    edges.value = []
    
    // 使用nextTick確保DOM更新
    nextTick(() => {
      // 獲取當前畫布的中心位置
      const viewport = vueFlowRef.value?.getViewport()
      const centerX = viewport ? -viewport.x / viewport.zoom + 400 : 400
      const centerY = viewport ? -viewport.y / viewport.zoom + 200 : 200
      
      // 調整節點位置，使其出現在當前視野中心
      const adjustedNodes = template.nodes.map((node, index) => ({
        ...node,
        position: {
          x: centerX + (index % 3) * 200 - 200, // 水平分佈
          y: centerY + Math.floor(index / 3) * 150 - 100 // 垂直分佈
        }
      }))
      
      // 載入調整後的節點和原始連線
      nodes.value = [...adjustedNodes]
      edges.value = [...template.edges]
      currentFlowId.value = null // 模板使用後需要重新儲存
      
      console.log('載入後的節點:', nodes.value)
      console.log('載入後的連線:', edges.value)
      
      // 重置所有節點狀態
      nodes.value.forEach(node => {
        if (node.data) {
          node.data.status = 'pending'
          node.data.errorMessage = null
        }
      })
      
      // 等待一下再調整視野，確保節點已渲染
      setTimeout(() => {
        if (vueFlowRef.value) {
          vueFlowRef.value.fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 1.5 })
        }
      }, 100)
      
      // 載入完成後更新全域變數
      updateGlobalVariablesFromStartNode()
      
      showFlowManager.value = false
      alert('模板載入成功！請記得儲存您的流程。')
    })
  } catch (error) {
    console.error('載入模板失敗:', error)
    alert('載入模板失敗：' + error.message)
  }
}

const importFlowFromManager = (flowData) => {
  try {
    nodes.value = [...flowData.nodes]
    edges.value = [...flowData.edges]
    currentFlowId.value = null // 導入的流程需要重新儲存
    
    // 重置所有節點狀態
    nodes.value.forEach(node => {
      if (node.data) {
        node.data.status = 'pending'
        node.data.errorMessage = null
      }
    })
    
    // 等待一下再調整視野，確保節點已渲染
    setTimeout(() => {
      if (vueFlowRef.value) {
        vueFlowRef.value.fitView({ padding: 0.2, minZoom: 0.5, maxZoom: 1.5 })
      }
    }, 100)
    
    // 導入完成後更新全域變數
    updateGlobalVariablesFromStartNode()
    
    showFlowManager.value = false
    alert('流程導入成功！請記得儲存您的流程。')
  } catch (error) {
    alert('導入失敗：' + error.message)
  }
}

// 元件掛載時取得節點設定
updateAvailableNodes()

// 頁面載入時檢查並更新全域變數
onMounted(() => {
  // 延遲一點時間確保所有組件都已加載
  setTimeout(() => {
    updateGlobalVariablesFromStartNode()
  }, 500)
})
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
  transition: all 0.3s ease;
  position: relative;
}

.flow-sidebar.collapsed {
  width: 0;
  padding: 0;
  border-left: none;
  overflow: hidden;
}

/* 側邊欄切換按鈕 */
.sidebar-toggle {
  position: fixed;
  right: 365px; /* 侧边栏宽度 + 15px */
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

.sidebar-toggle:hover {
  background: #3367d6;
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
  transform: translateY(-50%) scale(1.05);
}

.sidebar-toggle.collapsed {
  right: 15px;
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

/* 條件檢查詳情樣式 */
.condition-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.condition-header {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.condition-item {
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.condition-success {
  background: #e8f5e8;
  border-left: 3px solid #4caf50;
}

.condition-error {
  background: #ffebee;
  border-left: 3px solid #f44336;
}

.condition-node {
  font-weight: 500;
  margin-bottom: 2px;
}

.condition-message {
  color: #666;
  font-size: 10px;
  line-height: 1.3;
}

.condition-match {
  color: #4285f4;
  font-size: 10px;
  font-weight: 500;
  margin-top: 2px;
}

@keyframes executing-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* 流程管理按鈕 */
.flow-management {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.save-flow-btn,
.load-flow-btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.save-flow-btn:hover:not(:disabled) {
  background: #e8f5e8;
  border-color: #4caf50;
  color: #4caf50;
}

.save-flow-btn:disabled {
  background: #f5f5f5;
  color: #ccc;
  cursor: not-allowed;
}

.load-flow-btn:hover {
  background: #e3f2fd;
  border-color: #4285f4;
  color: #4285f4;
}

/* 全域變數顯示 */
.global-variables {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #9c27b0;
}

.global-variables-header h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #9c27b0;
}

.global-variables-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.global-variable-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.variable-name {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.variable-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.variable-type {
  background: #9c27b0;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.variable-value {
  font-size: 12px;
  color: #666;
  font-family: 'Courier New', monospace;
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

/* 全域變數選擇器 */
.global-var-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.global-var-selector-header label {
  margin: 0;
  font-weight: 600;
  color: #9c27b0;
}

.global-var-hint {
  font-size: 11px;
  color: #666;
  font-style: italic;
}

.global-var-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  background: #fafafa;
}

.global-var-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid #9c27b0;
}

.global-var-card:hover {
  background: #f3e5f5;
  border-color: #9c27b0;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(156, 39, 176, 0.15);
}

.var-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.var-name {
  font-weight: 500;
  font-size: 12px;
  color: #333;
  font-family: 'Courier New', monospace;
}

.var-type-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  color: white;
}

.var-type-badge.type-string {
  background: #4caf50;
}

.var-type-badge.type-number {
  background: #ff9800;
}

.var-type-badge.type-boolean {
  background: #2196f3;
}

.var-description {
  margin-top: 4px;
}

.var-value {
  font-size: 10px;
  color: #666;
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  border: 1px solid #ddd;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-global-variables {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 6px;
  color: #6c757d;
}

.no-global-var-icon {
  font-size: 24px;
  margin-right: 12px;
  opacity: 0.6;
}

.no-global-var-text {
  flex: 1;
}

.no-global-var-text strong {
  color: #495057;
  display: block;
  margin-bottom: 4px;
}

.no-global-var-text p {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

/* 流程管理器容器 */
.flow-manager-container {
  margin-bottom: 20px;
}

/* 流程統計 */
.flow-stats {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
}

.flow-stats .stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.flow-stats .stat-item:last-child {
  margin-bottom: 0;
}

.flow-stats .stat-label {
  color: #666;
}

.flow-stats .stat-value {
  font-weight: 500;
  color: #333;
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

/* 節點分類樣式 */
.node-category {
  margin-bottom: 20px;
}

.node-category:last-child {
  margin-bottom: 0;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.category-header:hover {
  background: #e9ecef;
  border-color: #4285f4;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-toggle {
  font-size: 10px;
  color: #666;
  transition: transform 0.2s;
}

.category-toggle.collapsed {
  transform: rotate(-90deg);
}

.category-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.category-count {
  background: #4285f4;
  color: white;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.category-nodes {
  padding-left: 8px;
  border-left: 2px solid #e9ecef;
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

/* 分類編輯器樣式 */
.categories-editor {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  background: #f8f9fa;
}

.current-categories {
  margin-bottom: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.category-item:last-child {
  margin-bottom: 0;
}

.category-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.2s;
}

.category-input:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.remove-category-btn {
  padding: 4px 8px;
  border: none;
  background: #f44336;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-category-btn:hover {
  background: #d32f2f;
  transform: scale(1.05);
}

.add-category-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px dashed #4285f4;
  background: transparent;
  color: #4285f4;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.add-category-btn:hover {
  background: rgba(66, 133, 244, 0.05);
  border-style: solid;
}

/* 輸入參數文本框樣式 */
.input-parameters-textarea {
  resize: vertical;
  min-height: 100px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  transition: border-color 0.2s, box-shadow 0.2s;
  background-color: #fafafa;
}

.input-parameters-textarea:focus {
  outline: none;
  border-color: #34a853;
  box-shadow: 0 0 0 3px rgba(52, 168, 83, 0.1);
  background-color: white;
}

/* 輸出結果文本框樣式 */
.parameters-preview-textarea {
  resize: vertical;
  min-height: 100px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background-color: #f9f9f9;
  color: #666;
  cursor: default;
}

.parameters-preview-textarea:focus {
  outline: none;
  border-color: #e0e0e0;
  box-shadow: none;
}

/* 條件設置樣式 */
.condition-settings {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
}

.condition-item {
  border-bottom: 1px solid #e9ecef;
}

.condition-item:last-child {
  border-bottom: none;
}

.condition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.condition-category {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.condition-index {
  font-size: 11px;
  color: #666;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 10px;
}

.condition-fields {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.condition-field {
  display: flex;
  flex-direction: column;
}

.condition-field-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 500;
}

.condition-input,
.condition-select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  transition: border-color 0.2s;
}

.condition-input:focus,
.condition-select:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.no-categories-hint {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border: 1px dashed #ddd;
  border-radius: 6px;
  color: #666;
}

.hint-icon {
  font-size: 16px;
  margin-right: 8px;
}

.hint-text {
  font-size: 13px;
}

.field-hint {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  line-height: 1.3;
}

/* 參數輸入相關樣式 */
.parameter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.add-param-btn {
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 16px;
  font-weight: bold;
}

.add-param-btn:hover {
  background: #3367d6;
  transform: scale(1.05);
}

.plus-icon {
  display: block;
  line-height: 1;
}

.parameter-list {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  background: #f8f9fa;
}

.parameter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.parameter-row:last-child {
  margin-bottom: 0;
}

.param-field {
  flex: 1;
}

.param-field:first-child {
  flex: 1.2; /* 變數名稱欄位稍微寬一些 */
}

.param-field:nth-child(2) {
  flex: 0.8; /* 類型欄位稍微窄一些 */
}

.param-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.2s;
}

.param-input:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.param-select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.param-select:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.delete-param-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.delete-param-btn:hover {
  background: #c82333;
  transform: scale(1.05);
}

.no-parameters {
  padding: 20px;
  text-align: center;
  color: #6c757d;
  background: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 6px;
  font-size: 14px;
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