// 流程執行引擎 - 處理節點的順序執行

import { executeNodeApi } from './mockApi.js'

/**
 * 使用拓撲排序確定節點執行順序
 * @param {Array} nodes - 節點清單
 * @param {Array} edges - 邊清單
 * @returns {Array} 按執行順序排列的節點清單
 */
export function getExecutionOrder(nodes, edges) {
  // 建立鄰接清單和入度統計
  const adjacencyList = new Map()
  const inDegree = new Map()
  
  // 初始化所有節點
  nodes.forEach(node => {
    adjacencyList.set(node.id, [])
    inDegree.set(node.id, 0)
  })
  
  // 建立圖的連接關係
  edges.forEach(edge => {
    const source = edge.source
    const target = edge.target
    
    if (adjacencyList.has(source) && adjacencyList.has(target)) {
      adjacencyList.get(source).push(target)
      inDegree.set(target, inDegree.get(target) + 1)
    }
  })
  
  // 拓撲排序 - 找到沒有前置節點的節點作為起始點
  const queue = []
  const result = []
  
  // 將入度為0的節點加入佇列（起始節點）
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId)
    }
  })
  
  // 如果沒有起始節點，選擇第一個節點作為起始點
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id)
  }
  
  // 執行拓撲排序
  while (queue.length > 0) {
    const currentNodeId = queue.shift()
    result.push(currentNodeId)
    
    // 處理當前節點的所有後續節點
    const nextNodes = adjacencyList.get(currentNodeId) || []
    nextNodes.forEach(nextNodeId => {
      inDegree.set(nextNodeId, inDegree.get(nextNodeId) - 1)
      if (inDegree.get(nextNodeId) === 0) {
        queue.push(nextNodeId)
      }
    })
  }
  
  // 如果還有節點沒被包含（可能是孤立節點），加入到結果中
  nodes.forEach(node => {
    if (!result.includes(node.id)) {
      result.push(node.id)
    }
  })
  
  // 回傳按順序排列的節點物件
  return result.map(nodeId => nodes.find(node => node.id === nodeId)).filter(Boolean)
}

/**
 * 執行整個流程
 * @param {Array} nodes - 節點清單
 * @param {Array} edges - 邊清單
 * @param {Function} onNodeUpdate - 節點狀態更新回調函數
 * @param {Function} onComplete - 流程完成回調函數
 */
export async function executeFlow(nodes, edges, onNodeUpdate, onComplete) {
  // 獲取執行順序
  const executionOrder = getExecutionOrder(nodes, edges)
  
  console.log('流程執行順序:', executionOrder.map(node => node.data.label))
  
  // 重置所有節點狀態
  nodes.forEach(node => {
    onNodeUpdate(node.id, { status: 'pending', errorMessage: null })
  })
  
  const results = []
  let hasError = false
  
  // 按順序執行節點
  for (const node of executionOrder) {
    if (hasError) {
      // 如果前面有節點失敗，標記剩餘節點為跳過
      onNodeUpdate(node.id, { status: 'pending', errorMessage: '因前置節點失敗而跳過' })
      continue
    }
    
    try {
      // 標記節點為執行中
      onNodeUpdate(node.id, { status: 'running', errorMessage: null })
      
      // 執行節點API
      const result = await executeNodeApi(node)
      
      // 標記節點為成功
      onNodeUpdate(node.id, { status: 'success', errorMessage: null })
      
      results.push({
        nodeId: node.id,
        success: true,
        result: result
      })
      
      console.log(`節點 ${node.data.label} 執行成功`)
      
    } catch (error) {
      // 標記節點為失敗
      onNodeUpdate(node.id, { 
        status: 'error', 
        errorMessage: error.message 
      })
      
      results.push({
        nodeId: node.id,
        success: false,
        error: error.message
      })
      
      console.error(`節點 ${node.data.label} 執行失敗:`, error.message)
      hasError = true
    }
    
    // 在節點之間添加小延遲，讓用戶能看到執行過程
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  // 流程執行完成
  const summary = {
    totalNodes: executionOrder.length,
    successCount: results.filter(r => r.success).length,
    errorCount: results.filter(r => !r.success).length,
    results: results
  }
  
  console.log('流程執行完成:', summary)
  onComplete(summary)
  
  return summary
}

/**
 * 驗證流程是否可以執行
 * @param {Array} nodes - 節點清單
 * @param {Array} edges - 邊清單
 * @returns {Object} 驗證結果
 */
export function validateFlow(nodes, edges) {
  if (nodes.length === 0) {
    return {
      valid: false,
      message: '流程中沒有任何節點，請先添加節點'
    }
  }
  
  // 檢查是否有循環依賴
  const executionOrder = getExecutionOrder(nodes, edges)
  if (executionOrder.length !== nodes.length) {
    return {
      valid: false,
      message: '流程中存在循環依賴，無法執行'
    }
  }
  
  return {
    valid: true,
    message: `流程驗證通過，將按順序執行 ${nodes.length} 個節點`
  }
} 