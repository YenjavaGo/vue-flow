/**
 * 節點載入器工具函數
 * 用於從JSON設定或後端API載入節點資料
 */

import nodesConfig from '../data/nodes.json'

/**
 * 從本地JSON檔案載入節點設定
 * @returns {Array} 節點設定陣列
 */
export function loadNodesFromJson() {
  const nodes = []
  
  // 遍歷所有分類
  nodesConfig.categories.forEach(category => {
    // 將每個分類下的節點新增到結果陣列
    category.nodes.forEach(node => {
      nodes.push({
        ...node,
        category: category.name
      })
    })
  })
  
  return nodes
}

/**
 * 從後端API載入節點設定
 * @param {string} apiUrl API地址
 * @returns {Promise<Array>} 節點設定陣列
 */
export async function loadNodesFromAPI(apiUrl = '/api/nodes') {
  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // 如果API回傳的格式與JSON檔案相同
    if (data.categories) {
      return loadNodesFromJson()
    }
    
    // 如果API直接回傳節點陣列
    return data
  } catch (error) {
    console.error('從API載入節點設定失敗:', error)
    // 回退到本地設定
    return loadNodesFromJson()
  }
}

/**
 * 根據分類篩選節點
 * @param {Array} nodes 節點陣列
 * @param {string} category 分類名稱
 * @returns {Array} 篩選後的節點陣列
 */
export function filterNodesByCategory(nodes, category) {
  if (!category) return nodes
  return nodes.filter(node => node.category === category)
}

/**
 * 取得所有可用的分類
 * @param {Array} nodes 節點陣列
 * @returns {Array} 分類名稱陣列
 */
export function getAvailableCategories(nodes) {
  const categories = [...new Set(nodes.map(node => node.category))]
  return categories.filter(Boolean)
} 