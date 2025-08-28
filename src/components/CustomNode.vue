<template>
  <div 
    class="custom-node"
    :class="{
      'node-pending': data.status === 'pending',
      'node-running': data.status === 'running',
      'node-success': data.status === 'success',
      'node-error': data.status === 'error'
    }"
  >
    <!-- 主要輸入連接點 - 開始節點隱藏左邊連接點 -->
    <Handle
      v-if="!isStartNode"
      id="target"
      type="target"
      :position="Position.Left"
      :style="handleStyle"
      :connectable="true"
    />
    
    <div class="node-header">
      <div 
        class="node-icon"
        :style="{ backgroundColor: data.color }"
      >
        {{ getDisplayIcon() }}
      </div>
      <div class="node-content">
        <div class="node-title">{{ data.label }}</div>
        <div class="node-subtitle">{{ data.subtitle }}</div>
        
        <!-- 分類顯示和連接點 -->
        <div v-if="data.categories && data.categories.length > 0" class="node-categories">
          <div 
            v-for="(category, index) in data.categories" 
            :key="index"
            class="category-item-with-handle"
          >
            <span class="category-tag">
              {{ category }}
            </span>
            <!-- 每個分類的輸出連接點 - 結束節點隱藏右邊連接點 -->
            <Handle
              v-if="!isEndNode"
              :id="`source-category-${index}`"
              type="source"
              :position="Position.Right"
              :style="handleStyle"
              :connectable="true"
              class="category-handle"
            />
          </div>
        </div>
        
        <!-- 狀態顯示 -->
        
        <div v-if="data.status === 'running'" class="node-status running">執行中...</div>
        <div v-if="data.status === 'success'" class="node-status success">✓ 完成</div>
        <div v-if="data.status === 'error'" class="node-status error">✗ 失敗</div>
      </div>
    </div>
    
    <!-- 錯誤提示 -->
    <div v-if="data.status === 'error' && data.errorMessage" class="error-tooltip">
      {{ data.errorMessage }}
    </div>
    
    <!-- 如果沒有分類，顯示默認的輸出連接點 - 結束節點隱藏右邊連接點 -->
    <Handle
      v-if="(!data.categories || data.categories.length === 0) && !isEndNode"
      id="source"
      type="source"
      :position="Position.Right"
      :style="handleStyle"
      :connectable="true"
    />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'
import { computed } from 'vue'

// 接收節點資料
const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

// 判斷是否為開始節點
const isStartNode = computed(() => {
  return props.data.id?.includes('start') || props.data.label === '開始'
})

// 判斷是否為結束節點
const isEndNode = computed(() => {
  return props.data.id?.includes('end') || props.data.label === '結束'
})

// 根據狀態顯示不同的圖標
const getDisplayIcon = () => {
  if (props.data.status === 'running') {
    return '⟳' // 旋轉圖標表示執行中
  }
  if (props.data.status === 'success') {
    return '✓' // 勾號表示成功
  }
  if (props.data.status === 'error') {
    return '✗' // 叉號表示失敗
  }
  return props.data.icon // 默認圖標
}

// 連接點樣式
const handleStyle = {
  backgroundColor: '#4285f4',
  width: '10px',
  height: '10px',
  border: '2px solid white',
  borderRadius: '50%'
}

// 移除不需要的分類連接點樣式函數
// 現在使用CSS類來處理位置
</script>

<style scoped>
.custom-node {
  padding: 12px 16px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  min-width: 150px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  position: relative;
}

.custom-node:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.node-header {
  display: flex;
  align-items: flex-start;
  position: relative;
}

.node-content {
  flex: 1;
}

.node-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 10px;
  font-weight: bold;
  color: white;
  flex-shrink: 0;
}

.node-title {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  line-height: 1.2;
}

.node-subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  line-height: 1.2;
}

.node-categories {
  margin-top: 6px;
}

.category-item-with-handle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  position: relative;
  min-height: 24px;
}

.category-item-with-handle:last-child {
  margin-bottom: 0;
}

.category-tag {
  background: rgba(66, 133, 244, 0.1);
  color: #4285f4;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid rgba(66, 133, 244, 0.2);
  flex: 1;
  margin-right: 20px;
}

/* 分類連接點的特殊樣式 */
.category-handle {
  position: static !important;
  transform: none !important;
  margin-left: auto;
  margin-right: -5px;
}

/* 移除不需要的默認連接點樣式 */

.node-status {
  font-size: 11px;
  margin-top: 4px;
  font-weight: 500;
}

.node-status.running {
  color: #ff9800;
  animation: pulse 1.5s infinite;
}

.node-status.success {
  color: #4caf50;
}

.node-status.error {
  color: #f44336;
}

/* 節點狀態樣式 */
.node-pending {
  border-color: #e9ecef !important;
}

.node-running {
  border-color: #ff9800 !important;
  border-width: 2px !important;
  background: #fff3e0 !important;
  animation: running-glow 2s infinite;
}

.node-success {
  border-color: #4caf50 !important;
  border-width: 2px !important;
  background: #e8f5e8 !important;
}

.node-error {
  border-color: #f44336 !important;
  border-width: 2px !important;
  background: #ffebee !important;
}

/* 錯誤提示 */
.error-tooltip {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #f44336;
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 4px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.error-tooltip::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #f44336;
}

/* 動畫效果 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes running-glow {
  0%, 100% { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
  50% { box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3); }
}
</style> 