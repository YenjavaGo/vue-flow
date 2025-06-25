// Mock API 服務 - 模擬各種節點類型的API調用

// 模擬API延遲
const getRandomDelay = () => Math.random() * 2000 + 500 // 0.5-2.5秒隨機延遲

// 模擬API成功率（90%成功）
const shouldSucceed = () => Math.random() > 0.1

// 用戶認證系統API
export const callAuthApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    return {
      success: true,
      result: `用戶認證完成: ${nodeData.label}`,
      userId: `USER_${Math.floor(Math.random() * 10000)}`,
      authToken: `TOKEN_${Date.now()}`,
      loginTime: new Date().toISOString()
    }
  } else {
    throw new Error('用戶認證失敗：帳號或密碼錯誤')
  }
}

// 帳戶管理系統API
export const callAccountApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const accountTypes = ['儲蓄帳戶', '支票帳戶', '信用帳戶']
    return {
      success: true,
      result: `帳戶驗證完成: ${nodeData.label}`,
      accountId: `ACC_${Math.floor(Math.random() * 1000000)}`,
      accountType: accountTypes[Math.floor(Math.random() * accountTypes.length)],
      status: '正常'
    }
  } else {
    throw new Error('帳戶管理失敗：帳戶不存在或已凍結')
  }
}

// 交易處理系統API
export const callTransactionApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    return {
      success: true,
      result: `交易處理完成: ${nodeData.label}`,
      transactionId: `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: (Math.random() * 10000 + 100).toFixed(2),
      currency: 'TWD',
      status: '交易成功'
    }
  } else {
    throw new Error('交易處理失敗：餘額不足或系統維護中')
  }
}

// 風險控制系統API
export const callRiskApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const riskLevels = ['低風險', '中風險', '高風險']
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)]
    return {
      success: true,
      result: `風險評估完成: ${nodeData.label}`,
      riskLevel: riskLevel,
      riskScore: (Math.random() * 100).toFixed(1),
      recommendation: riskLevel === '高風險' ? '建議人工審核' : '可正常處理'
    }
  } else {
    throw new Error('風險控制失敗：風險模型計算異常')
  }
}

// 支付閘道系統API
export const callPaymentApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const paymentMethods = ['信用卡', '金融卡', '網路銀行', '電子錢包']
    return {
      success: true,
      result: `支付處理完成: ${nodeData.label}`,
      paymentId: `PAY_${Date.now()}`,
      method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      gatewayResponse: '支付成功'
    }
  } else {
    throw new Error('支付閘道失敗：第三方支付服務暫時不可用')
  }
}

// 身份驗證服務API
export const callVerifyApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    return {
      success: true,
      result: `身份驗證完成: ${nodeData.label}`,
      verificationMethod: ['簡訊OTP', '生物辨識', '雙因子認證'][Math.floor(Math.random() * 3)],
      verificationTime: new Date().toISOString(),
      confidence: (Math.random() * 0.2 + 0.8).toFixed(2) // 0.8-1.0
    }
  } else {
    throw new Error('身份驗證失敗：驗證碼錯誤或已過期')
  }
}

// 餘額查詢服務API
export const callBalanceApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    return {
      success: true,
      result: `餘額查詢完成: ${nodeData.label}`,
      availableBalance: (Math.random() * 50000 + 1000).toFixed(2),
      currency: 'TWD',
      lastUpdate: new Date().toISOString()
    }
  } else {
    throw new Error('餘額查詢失敗：帳戶系統維護中')
  }
}

// 交易驗證服務API
export const callValidateApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const validationRules = ['金額限制檢查', '交易時間檢查', '收款方驗證', '重複交易檢查']
    return {
      success: true,
      result: `交易驗證完成: ${nodeData.label}`,
      validationRules: validationRules,
      allPassed: true,
      validationTime: new Date().toISOString()
    }
  } else {
    throw new Error('交易驗證失敗：違反交易規則或限制')
  }
}

// 欺詐檢測服務API
export const callFraudApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const fraudIndicators = ['異常登入地點', '異常交易時間', '大額交易', '頻繁交易']
    const suspiciousActivity = Math.random() > 0.7
    return {
      success: true,
      result: `欺詐檢測完成: ${nodeData.label}`,
      isSuspicious: suspiciousActivity,
      riskIndicators: suspiciousActivity ? [fraudIndicators[Math.floor(Math.random() * fraudIndicators.length)]] : [],
      confidence: (Math.random() * 0.3 + 0.7).toFixed(2)
    }
  } else {
    throw new Error('欺詐檢測失敗：機器學習模型無法載入')
  }
}

// 通知服務API
export const callNotifyApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const notificationTypes = ['簡訊通知', '電子郵件', '推播通知', '應用程式內通知']
    return {
      success: true,
      result: `通知發送完成: ${nodeData.label}`,
      notificationType: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
      recipient: 'user@example.com',
      messageId: `MSG_${Date.now()}`
    }
  } else {
    throw new Error('通知服務失敗：通知閘道服務異常')
  }
}

// 審計日誌服務API
export const callAuditApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    return {
      success: true,
      result: `審計日誌記錄完成: ${nodeData.label}`,
      logId: `LOG_${Date.now()}`,
      eventType: '交易操作',
      logLevel: 'INFO',
      recordTime: new Date().toISOString()
    }
  } else {
    throw new Error('審計日誌失敗：日誌系統存儲空間不足')
  }
}

// 報表生成服務API
export const callReportApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    const reportTypes = ['交易明細報表', '帳戶餘額報表', '風險分析報表', '合規檢查報表']
    return {
      success: true,
      result: `報表生成完成: ${nodeData.label}`,
      reportType: reportTypes[Math.floor(Math.random() * reportTypes.length)],
      reportId: `RPT_${Date.now()}`,
      recordCount: Math.floor(Math.random() * 1000) + 50
    }
  } else {
    throw new Error('報表生成失敗：資料來源連接異常')
  }
}

// 資料同步服務API
export const callSyncApi = async (nodeData) => {
  await new Promise(resolve => setTimeout(resolve, getRandomDelay()))
  
  if (shouldSucceed()) {
    return {
      success: true,
      result: `資料同步完成: ${nodeData.label}`,
      syncedRecords: Math.floor(Math.random() * 500) + 100,
      syncTarget: ['主資料庫', '備份資料庫', '資料倉儲'][Math.floor(Math.random() * 3)],
      syncTime: new Date().toISOString()
    }
  } else {
    throw new Error('資料同步失敗：目標系統連接超時')
  }
}

// 節點類型到API的映射
const apiMapping = {
  'auth': callAuthApi,
  'account': callAccountApi,
  'transaction': callTransactionApi,
  'risk': callRiskApi,
  'payment': callPaymentApi,
  'verify': callVerifyApi,
  'balance': callBalanceApi,
  'validate': callValidateApi,
  'fraud': callFraudApi,
  'notify': callNotifyApi,
  'audit': callAuditApi,
  'report': callReportApi,
  'sync': callSyncApi
}

// 主要的API調用函數
export const executeNodeApi = async (node) => {
  // 從節點ID中提取節點類型（例如 'llm_1234567890' -> 'llm'）
  const nodeType = node.id.split('_')[0]
  const apiFunction = apiMapping[nodeType]
  
  if (!apiFunction) {
    throw new Error(`不支援的節點類型: ${nodeType}`)
  }
  
  console.log(`開始執行節點 ${node.id} (${nodeType})`)
  
  try {
    const result = await apiFunction(node.data)
    console.log(`節點 ${node.id} 執行成功:`, result)
    return result
  } catch (error) {
    console.error(`節點 ${node.id} 執行失敗:`, error.message)
    throw error
  }
} 