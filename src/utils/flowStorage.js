// 流程存儲工具 - 處理流程的保存、載入和模板管理

/**
 * 保存流程到本地存儲
 * @param {string} flowName - 流程名稱
 * @param {Array} nodes - 節點清單
 * @param {Array} edges - 邊清單
 * @param {string} description - 流程描述
 */
export function saveFlow(flowName, nodes, edges, description = '') {
  const flowData = {
    id: `flow_${Date.now()}`,
    name: flowName,
    description: description,
    nodes: nodes,
    edges: edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0'
  }
  
  const savedFlows = getSavedFlows()
  savedFlows.push(flowData)
  
  localStorage.setItem('savedFlows', JSON.stringify(savedFlows))
  
  return flowData
}

/**
 * 獲取所有保存的流程
 * @returns {Array} 流程清單
 */
export function getSavedFlows() {
  const savedFlows = localStorage.getItem('savedFlows')
  return savedFlows ? JSON.parse(savedFlows) : []
}

/**
 * 載入指定的流程
 * @param {string} flowId - 流程ID
 * @returns {Object|null} 流程數據
 */
export function loadFlow(flowId) {
  const savedFlows = getSavedFlows()
  return savedFlows.find(flow => flow.id === flowId) || null
}

/**
 * 刪除指定的流程
 * @param {string} flowId - 流程ID
 * @returns {boolean} 是否刪除成功
 */
export function deleteFlow(flowId) {
  const savedFlows = getSavedFlows()
  const filteredFlows = savedFlows.filter(flow => flow.id !== flowId)
  
  if (filteredFlows.length !== savedFlows.length) {
    localStorage.setItem('savedFlows', JSON.stringify(filteredFlows))
    return true
  }
  
  return false
}

/**
 * 更新流程
 * @param {string} flowId - 流程ID
 * @param {Array} nodes - 節點清單
 * @param {Array} edges - 邊清單
 * @param {string} description - 流程描述
 */
export function updateFlow(flowId, nodes, edges, description = '') {
  const savedFlows = getSavedFlows()
  const flowIndex = savedFlows.findIndex(flow => flow.id === flowId)
  
  if (flowIndex !== -1) {
    savedFlows[flowIndex] = {
      ...savedFlows[flowIndex],
      nodes: nodes,
      edges: edges,
      description: description,
      updatedAt: new Date().toISOString()
    }
    
    localStorage.setItem('savedFlows', JSON.stringify(savedFlows))
    return savedFlows[flowIndex]
  }
  
  return null
}

/**
 * 導出流程為JSON文件
 * @param {Object} flowData - 流程數據
 * @param {string} filename - 文件名
 */
export function exportFlow(flowData, filename = 'flow.json') {
  const dataStr = JSON.stringify(flowData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = filename
  link.click()
  
  URL.revokeObjectURL(link.href)
}

/**
 * 從JSON文件導入流程
 * @param {File} file - JSON文件
 * @returns {Promise<Object>} 流程數據
 */
export function importFlow(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const flowData = JSON.parse(e.target.result)
        
        // 驗證流程數據格式
        if (!flowData.nodes || !flowData.edges) {
          throw new Error('無效的流程文件格式')
        }
        
        resolve(flowData)
      } catch (error) {
        reject(new Error('無法解析流程文件：' + error.message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('讀取文件失敗'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * 獲取預設流程模板
 * @returns {Array} 模板清單
 */
export function getFlowTemplates() {
  return [
    {
      id: 'template_basic_auth',
      name: '基本認證流程',
      description: '包含用戶認證、帳戶驗證和交易處理的基本流程',
      category: '認證流程',
      nodes: [
        {
          id: 'auth',
          type: 'custom',
          position: { x: 200, y: 100 },
          data: {
            label: '用戶認證系統',
            icon: '🔐',
            color: '#4285f4',
            type: 'auth',
            status: 'pending'
          }
        },
        {
          id: 'account',
          type: 'custom',
          position: { x: 200, y: 250 },
          data: {
            label: '帳戶管理系統',
            icon: '👤',
            color: '#34a853',
            type: 'account',
            status: 'pending'
          }
        },
        {
          id: 'transaction',
          type: 'custom',
          position: { x: 200, y: 400 },
          data: {
            label: '交易處理系統',
            icon: '💰',
            color: '#ea4335',
            type: 'transaction',
            status: 'pending'
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'auth',
          target: 'account',
          type: 'smoothstep'
        },
        {
          id: 'e2',
          source: 'account',
          target: 'transaction',
          type: 'smoothstep'
        }
      ]
    },
    {
      id: 'template_risk_management',
      name: '風險管理流程',
      description: '包含風險控制、欺詐檢測和通知的完整風險管理流程',
      category: '風險管理',
      nodes: [
        {
          id: 'auth',
          type: 'custom',
          position: { x: 200, y: 100 },
          data: {
            label: '用戶認證系統',
            icon: '🔐',
            color: '#4285f4',
            type: 'auth',
            status: 'pending'
          }
        },
        {
          id: 'risk',
          type: 'custom',
          position: { x: 200, y: 250 },
          data: {
            label: '風險控制系統',
            icon: '🛡️',
            color: '#ff9800',
            type: 'risk',
            status: 'pending'
          }
        },
        {
          id: 'fraud',
          type: 'custom',
          position: { x: 200, y: 400 },
          data: {
            label: '欺詐檢測服務',
            icon: '🚨',
            color: '#f44336',
            type: 'fraud',
            status: 'pending'
          }
        },
        {
          id: 'notify',
          type: 'custom',
          position: { x: 200, y: 550 },
          data: {
            label: '通知服務',
            icon: '📧',
            color: '#3f51b5',
            type: 'notify',
            status: 'pending'
          }
        }
      ],
      edges: [
        {
          id: 'e3',
          source: 'auth',
          target: 'risk',
          type: 'smoothstep'
        },
        {
          id: 'e4',
          source: 'risk',
          target: 'fraud',
          type: 'smoothstep'
        },
        {
          id: 'e5',
          source: 'fraud',
          target: 'notify',
          type: 'smoothstep'
        }
      ]
    },
    {
      id: 'template_payment_processing',
      name: '支付處理流程',
      description: '完整的支付處理流程，包含驗證、支付和通知',
      category: '支付處理',
      nodes: [
        {
          id: 'verify',
          type: 'custom',
          position: { x: 200, y: 100 },
          data: {
            label: '身份驗證服務',
            icon: '✅',
            color: '#2196f3',
            type: 'verify',
            status: 'pending'
          }
        },
        {
          id: 'balance',
          type: 'custom',
          position: { x: 200, y: 250 },
          data: {
            label: '餘額查詢服務',
            icon: '💵',
            color: '#607d8b',
            type: 'balance',
            status: 'pending'
          }
        },
        {
          id: 'payment',
          type: 'custom',
          position: { x: 200, y: 400 },
          data: {
            label: '支付閘道系統',
            icon: '💳',
            color: '#9c27b0',
            type: 'payment',
            status: 'pending'
          }
        },
        {
          id: 'notify',
          type: 'custom',
          position: { x: 200, y: 550 },
          data: {
            label: '通知服務',
            icon: '📧',
            color: '#3f51b5',
            type: 'notify',
            status: 'pending'
          }
        }
      ],
      edges: [
        {
          id: 'e6',
          source: 'verify',
          target: 'balance',
          type: 'smoothstep'
        },
        {
          id: 'e7',
          source: 'balance',
          target: 'payment',
          type: 'smoothstep'
        },
        {
          id: 'e8',
          source: 'payment',
          target: 'notify',
          type: 'smoothstep'
        }
      ]
    }
  ]
} 