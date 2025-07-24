// 流程執行引擎 - 處理節點的順序執行

import { executeNodeApi } from './mockApi.js'

/**
 * 檢查節點條件並決定下一個執行節點
 * @param {Object} currentNode - 當前節點
 * @param {Array} edges - 邊清單
 * @param {Array} nodes - 所有節點
 * @returns {Object} 條件檢查結果
 */
function checkNodeConditions(currentNode, edges, nodes) {
  const nodeData = currentNode.data
  
  // 1. 如果沒有分類，直接前往下一個節點
  if (!nodeData.categories || nodeData.categories.length === 0) {
    const nextNodeId = findNextNode(currentNode.id, edges, null)
    return {
      success: true,
      nextNodeId: nextNodeId,
      message: '無條件設置，前往下一個節點'
    }
  }
  
  // 2. 有分類的情況下，需要解析輸入參數並比對條件
  try {
    // 解析輸入參數JSON
    let inputParams = {}
    if (nodeData.inputParameters && nodeData.inputParameters.trim()) {
      inputParams = JSON.parse(nodeData.inputParameters)
    } else {
      return {
        success: false,
        error: '輸出結果為空，參數有誤',
        message: '節點設置了條件但沒有輸入參數'
      }
    }
    
    // 3. 檢查條件設置並找到匹配的分類
    const conditions = nodeData.categoryConditions || []
    const categories = nodeData.categories || []
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i]
      const category = categories[i]
      
      // 檢查條件是否完整
      if (!condition.parameter || !condition.value) {
        continue
      }
      
      // 檢查參數是否匹配
      const paramValue = inputParams[condition.parameter]
      if (paramValue !== undefined && String(paramValue) === String(condition.value)) {
        // 找到匹配的條件，尋找對應分類的連接點
        const nextNodeId = findNextNode(currentNode.id, edges, `source-category-${i}`)
        
        return {
          success: true,
          nextNodeId: nextNodeId,
          matchedCategory: category,
          matchedCondition: condition,
          message: `條件匹配：${condition.parameter} = ${condition.value}，前往分類「${category}」的下一個節點`
        }
      }
    }
    
    // 沒有找到匹配的條件
    return {
      success: false,
      error: '沒有匹配的條件',
      message: '輸入參數與所有條件設置都不匹配，流程中斷'
    }
    
  } catch (error) {
    return {
      success: false,
      error: '輸入參數JSON格式錯誤',
      message: `無法解析輸入參數：${error.message}`
    }
  }
}

/**
 * 尋找下一個節點
 * @param {String} currentNodeId - 當前節點ID
 * @param {Array} edges - 邊清單
 * @param {String} sourceHandle - 來源連接點ID (null表示預設連接點)
 * @returns {String} 下一個節點ID
 */
function findNextNode(currentNodeId, edges, sourceHandle) {
  // 尋找從當前節點出發的邊
  const matchingEdges = edges.filter(edge => {
    if (edge.source !== currentNodeId) return false
    
    // 如果指定了源連接點，則需要完全匹配
    if (sourceHandle !== null) {
      return edge.sourceHandle === sourceHandle
    }
    
    // 如果沒有指定源連接點，則匹配預設連接點或沒有sourceHandle的邊
    return !edge.sourceHandle || edge.sourceHandle === 'source'
  })
  
  // 返回第一個匹配的目標節點
  return matchingEdges.length > 0 ? matchingEdges[0].target : null
}

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
 * 執行整個流程（基於條件的動態執行）
 * @param {Array} nodes - 節點清單
 * @param {Array} edges - 邊清單
 * @param {Function} onNodeUpdate - 節點狀態更新回調函數
 * @param {Function} onComplete - 流程完成回調函數
 */
export async function executeFlow(nodes, edges, onNodeUpdate, onComplete) {
  // 檢查是否有開始節點
  const startNodes = nodes.filter(node => {
    const nodeType = node.id.split('_')[0]
    return nodeType === 'start'
  })
  
  if (startNodes.length === 0) {
    const summary = {
      totalNodes: 0,
      successCount: 0,
      errorCount: 1,
      results: [{ nodeId: 'system', success: false, error: '找不到開始的進入點' }]
    }
    onComplete(summary)
    return summary
  }
  
  // 重置所有節點狀態
  nodes.forEach(node => {
    onNodeUpdate(node.id, { status: 'pending', errorMessage: null })
  })
  
  const results = []
  const executedNodes = new Set()
  
  // 使用第一個開始節點作為起始節點
  const startingNode = startNodes[0]
  
  console.log('流程開始執行，起始節點:', startingNode.data.label)
  
  // 從開始節點開始執行
  let currentNode = startingNode
  
  while (currentNode && !executedNodes.has(currentNode.id)) {
    try {
      // 標記節點為執行中
      onNodeUpdate(currentNode.id, { status: 'running', errorMessage: null })
      executedNodes.add(currentNode.id)
      
      console.log(`開始執行節點: ${currentNode.data.label}`)
      
      // 檢查節點條件
      const conditionResult = checkNodeConditions(currentNode, edges, nodes)
      
      if (!conditionResult.success) {
        // 條件檢查失敗，中斷流程
        onNodeUpdate(currentNode.id, { 
          status: 'error', 
          errorMessage: conditionResult.error || conditionResult.message 
        })
        
        results.push({
          nodeId: currentNode.id,
          success: false,
          error: conditionResult.error || conditionResult.message,
          conditionCheck: conditionResult
        })
        
        console.error(`節點 ${currentNode.data.label} 條件檢查失敗:`, conditionResult.message)
        break
      }
      
      // 執行節點API
      const apiResult = await executeNodeApi(currentNode)
      
      // 標記節點為成功
      onNodeUpdate(currentNode.id, { status: 'success', errorMessage: null })
      
      results.push({
        nodeId: currentNode.id,
        success: true,
        result: apiResult,
        conditionCheck: conditionResult
      })
      
      console.log(`節點 ${currentNode.data.label} 執行成功:`, conditionResult.message)
      
      // 尋找下一個節點
      if (conditionResult.nextNodeId) {
        currentNode = nodes.find(n => n.id === conditionResult.nextNodeId)
        if (currentNode) {
          console.log(`下一個節點: ${currentNode.data.label}`)
        } else {
          console.log('找不到下一個節點，流程結束')
          break
        }
      } else {
        console.log('沒有下一個節點，流程結束')
        break
      }
      
    } catch (error) {
      // 節點執行失敗
      onNodeUpdate(currentNode.id, { 
        status: 'error', 
        errorMessage: error.message 
      })
      
      results.push({
        nodeId: currentNode.id,
        success: false,
        error: error.message
      })
      
      console.error(`節點 ${currentNode.data.label} 執行失敗:`, error.message)
      break
    }
    
    // 在節點之間添加小延遲，讓用戶能看到執行過程
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // 流程執行完成
  const summary = {
    totalNodes: executedNodes.size,
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