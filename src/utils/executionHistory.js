// 執行歷史記錄工具 - 記錄和管理流程執行歷史

/**
 * 記錄流程執行歷史
 * @param {Object} flowData - 流程數據
 * @param {Object} executionResult - 執行結果
 * @param {number} executionTime - 執行時間（毫秒）
 */
export function recordExecutionHistory(flowData, executionResult, executionTime) {
  const historyEntry = {
    id: `exec_${Date.now()}`,
    flowId: flowData.id || 'unknown',
    flowName: flowData.name || '未命名流程',
    executionTime: executionTime,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    totalNodes: executionResult.totalNodes,
    successCount: executionResult.successCount,
    errorCount: executionResult.errorCount,
    status: executionResult.errorCount > 0 ? 'partial_success' : 'success',
    results: executionResult.results,
    flowSnapshot: {
      nodes: flowData.nodes,
      edges: flowData.edges
    }
  }
  
  const history = getExecutionHistory()
  history.unshift(historyEntry) // 添加到開頭
  
  // 只保留最近100條記錄
  if (history.length > 100) {
    history.splice(100)
  }
  
  localStorage.setItem('executionHistory', JSON.stringify(history))
  
  return historyEntry
}

/**
 * 獲取執行歷史記錄
 * @returns {Array} 歷史記錄清單
 */
export function getExecutionHistory() {
  const history = localStorage.getItem('executionHistory')
  return history ? JSON.parse(history) : []
}

/**
 * 獲取指定流程的執行歷史
 * @param {string} flowId - 流程ID
 * @returns {Array} 該流程的歷史記錄
 */
export function getFlowExecutionHistory(flowId) {
  const history = getExecutionHistory()
  return history.filter(entry => entry.flowId === flowId)
}

/**
 * 清除執行歷史記錄
 * @param {string} flowId - 可選，指定流程ID，如果不提供則清除所有歷史
 */
export function clearExecutionHistory(flowId = null) {
  if (flowId) {
    const history = getExecutionHistory()
    const filteredHistory = history.filter(entry => entry.flowId !== flowId)
    localStorage.setItem('executionHistory', JSON.stringify(filteredHistory))
  } else {
    localStorage.removeItem('executionHistory')
  }
}

/**
 * 獲取執行統計信息
 * @returns {Object} 統計信息
 */
export function getExecutionStats() {
  const history = getExecutionHistory()
  
  if (history.length === 0) {
    return {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      totalNodesExecuted: 0,
      mostExecutedFlow: null
    }
  }
  
  const totalExecutions = history.length
  const successfulExecutions = history.filter(entry => entry.status === 'success').length
  const successRate = (successfulExecutions / totalExecutions * 100).toFixed(1)
  
  const totalExecutionTime = history.reduce((sum, entry) => sum + entry.executionTime, 0)
  const averageExecutionTime = Math.round(totalExecutionTime / totalExecutions)
  
  const totalNodesExecuted = history.reduce((sum, entry) => sum + entry.totalNodes, 0)
  
  // 找出最常執行的流程
  const flowCounts = {}
  history.forEach(entry => {
    flowCounts[entry.flowName] = (flowCounts[entry.flowName] || 0) + 1
  })
  
  const mostExecutedFlow = Object.entries(flowCounts)
    .sort(([,a], [,b]) => b - a)[0]
  
  return {
    totalExecutions,
    successRate: parseFloat(successRate),
    averageExecutionTime,
    totalNodesExecuted,
    mostExecutedFlow: mostExecutedFlow ? {
      name: mostExecutedFlow[0],
      count: mostExecutedFlow[1]
    } : null
  }
}

/**
 * 獲取最近的執行記錄
 * @param {number} limit - 限制數量，默認10條
 * @returns {Array} 最近的執行記錄
 */
export function getRecentExecutions(limit = 10) {
  const history = getExecutionHistory()
  return history.slice(0, limit)
}

/**
 * 搜索執行歷史記錄
 * @param {string} searchTerm - 搜索關鍵詞
 * @returns {Array} 匹配的記錄
 */
export function searchExecutionHistory(searchTerm) {
  const history = getExecutionHistory()
  const term = searchTerm.toLowerCase()
  
  return history.filter(entry => 
    entry.flowName.toLowerCase().includes(term) ||
    entry.status.toLowerCase().includes(term) ||
    entry.results.some(result => 
      result.nodeId.toLowerCase().includes(term) ||
      (result.error && result.error.toLowerCase().includes(term))
    )
  )
}

/**
 * 導出執行歷史為CSV
 * @param {Array} history - 歷史記錄，如果不提供則導出所有記錄
 */
export function exportExecutionHistory(history = null) {
  const data = history || getExecutionHistory()
  
  if (data.length === 0) {
    alert('沒有可導出的歷史記錄')
    return
  }
  
  const headers = [
    '執行ID',
    '流程名稱',
    '執行時間',
    '開始時間',
    '結束時間',
    '總節點數',
    '成功節點數',
    '失敗節點數',
    '執行狀態',
    '執行耗時(ms)'
  ]
  
  const csvContent = [
    headers.join(','),
    ...data.map(entry => [
      entry.id,
      `"${entry.flowName}"`,
      entry.executionTime,
      entry.startTime,
      entry.endTime,
      entry.totalNodes,
      entry.successCount,
      entry.errorCount,
      entry.status,
      entry.executionTime
    ].join(','))
  ].join('\n')
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `execution_history_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  
  URL.revokeObjectURL(link.href)
}

/**
 * 格式化執行時間
 * @param {number} milliseconds - 毫秒數
 * @returns {string} 格式化的時間字符串
 */
export function formatExecutionTime(milliseconds) {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * 格式化日期時間
 * @param {string} isoString - ISO日期字符串
 * @returns {string} 格式化的日期時間
 */
export function formatDateTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
} 