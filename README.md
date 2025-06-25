# Vue Flow 流程設計器

基於 Vue 3 + Vue Flow 構建的視覺化流程設計器，支援拖拽式節點編輯和動態節點設定。

## 功能特性

- 🎨 **視覺化設計**: 拖拽式流程圖設計介面
- 🔧 **動態節點**: 支援從後端API動態載入節點設定
- 📱 **響應式佈局**: 左側畫布+右側面板的經典佈局
- 🎯 **自訂節點**: 支援自訂節點樣式和行為
- 🔗 **連線操作**: 支援節點間的連線和關係建立
- 📝 **屬性編輯**: 選中節點後可檢視和編輯屬性

## 技術棧

- **Vue 3**: 前端框架
- **Vue Flow**: 流程圖元件庫
- **Vite**: 建置工具

## 快速開始

### 安裝相依性

\`\`\`bash
npm install
\`\`\`

### 啟動開發伺服器

\`\`\`bash
npm run dev
\`\`\`

### 建置正式版本

\`\`\`bash
npm run build
\`\`\`

## 專案結構

\`\`\`
src/
├── components/
│   └── CustomNode.vue      # 自訂節點元件
├── data/
│   └── nodes.json          # 節點設定範例
├── App.vue                 # 主應用程式元件
├── main.js                 # 應用程式入口
└── style.css              # 全域樣式
\`\`\`

## 使用說明

### 基本操作

1. **新增節點**: 從右側面板拖拽節點到畫布
2. **連接節點**: 拖拽節點的連接點建立連線
3. **選擇節點**: 點擊節點檢視屬性資訊
4. **移動節點**: 拖拽節點到新位置
5. **縮放畫布**: 使用滑鼠滾輪縮放
6. **平移畫布**: 按住空白區域拖拽

### 節點設定

右側面板的節點清單可以透過JSON設定動態生成。節點設定格式：

\`\`\`json
{
"id": "節點ID",
"name": "節點名稱",
"type": "節點類型",
"description": "節點描述",
"icon": "圖示文字",
"color": "節點顏色",
"nodeType": "custom",
"config": {
// 節點特定設定
}
}
\`\`\`

### 從後端取得節點

在 \`App.vue\` 中的 \`updateAvailableNodes\` 方法中，可以替換為實際的API呼叫：

\`\`\`javascript
const updateAvailableNodes = async () => {
  try {
    const response = await fetch('/api/nodes')
    const nodeData = await response.json()
    availableNodes.value = processNodeData(nodeData)
  } catch (error) {
    console.error('取得節點設定失敗:', error)
  }
}
\`\`\`

## 自訂開發

### 新增新的節點類型

1. 在 \`components\` 目錄下建立新的節點元件
2. 在 \`App.vue\` 中註冊新的節點類型
3. 更新節點設定資料

### 修改節點樣式

編輯 \`src/style.css\` 中的節點相關樣式類別。

### 擴展功能

- 新增節點屬性編輯表單
- 實作流程圖儲存和載入
- 新增更多控制按鈕
- 支援節點群組和摺疊

## 瀏覽器支援

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## 授權條款

MIT License 