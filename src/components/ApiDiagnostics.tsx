import { useState } from 'react'

interface DiagnosticResult {
  test: string
  status: 'pending' | 'success' | 'error'
  message: string
  details?: any
}

export function ApiDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const updateResult = (index: number, updates: Partial<DiagnosticResult>) => {
    setResults(prev => {
      const newResults = [...prev]
      newResults[index] = { ...newResults[index], ...updates }
      return newResults
    })
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    const tests: DiagnosticResult[] = [
      { test: 'Webhook URL環境變量', status: 'pending', message: '檢查中...' },
      { test: 'Webhook連接測試', status: 'pending', message: '檢查中...' },
      { test: 'Reservation API測試', status: 'pending', message: '檢查中...' },
      { test: 'CORS Headers檢查', status: 'pending', message: '檢查中...' }
    ]
    setResults(tests)

    // Test 1: Environment variable
    try {
      const webhookUrl = import.meta.env.VITE_WEBHOOK_URL || 'https://ici.zeabur.app/webhook/realtime-ai'
      updateResult(0, {
        status: 'success',
        message: `已配置: ${webhookUrl}`,
        details: {
          VITE_WEBHOOK_URL: import.meta.env.VITE_WEBHOOK_URL,
          fallback: !import.meta.env.VITE_WEBHOOK_URL
        }
      })
    } catch (error) {
      updateResult(0, {
        status: 'error',
        message: String(error),
        details: error
      })
    }

    // Test 2: Webhook connection
    try {
      const webhookUrl = import.meta.env.VITE_WEBHOOK_URL || 'https://ici.zeabur.app/webhook/realtime-ai'
      const response = await fetch(webhookUrl, {
        method: 'GET',
        mode: 'cors'
      })

      updateResult(1, {
        status: response.ok ? 'success' : 'error',
        message: `狀態碼: ${response.status} ${response.statusText}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'content-type': response.headers.get('content-type'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
            'access-control-allow-methods': response.headers.get('access-control-allow-methods')
          }
        }
      })
    } catch (error: any) {
      updateResult(1, {
        status: 'error',
        message: error.message || String(error),
        details: {
          name: error.name,
          message: error.message,
          type: error.constructor.name
        }
      })
    }

    // Test 3: Reservation API
    try {
      const response = await fetch('https://ici.zeabur.app/webhook/checkResv', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ time: '12:00' })
      })

      const data = await response.json()

      updateResult(2, {
        status: response.ok ? 'success' : 'error',
        message: `狀態碼: ${response.status} - ${response.ok ? '成功' : '失敗'}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          data,
          headers: {
            'content-type': response.headers.get('content-type'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin')
          }
        }
      })
    } catch (error: any) {
      updateResult(2, {
        status: 'error',
        message: error.message || String(error),
        details: {
          name: error.name,
          message: error.message,
          type: error.constructor.name
        }
      })
    }

    // Test 4: CORS Check
    try {
      const corsTest = await fetch('https://ici.zeabur.app/webhook/checkResv', {
        method: 'OPTIONS'
      })

      updateResult(3, {
        status: 'success',
        message: `CORS預檢請求成功`,
        details: {
          status: corsTest.status,
          headers: {
            'access-control-allow-origin': corsTest.headers.get('access-control-allow-origin'),
            'access-control-allow-methods': corsTest.headers.get('access-control-allow-methods'),
            'access-control-allow-headers': corsTest.headers.get('access-control-allow-headers')
          }
        }
      })
    } catch (error: any) {
      updateResult(3, {
        status: 'error',
        message: `CORS可能被阻止: ${error.message}`,
        details: {
          name: error.name,
          message: error.message
        }
      })
    }

    setIsRunning(false)
  }

  return (
    <div className="fixed top-4 right-4 bg-white shadow-2xl rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-y-auto z-50">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🔍 API 診斷工具</h2>

      <button
        onClick={runDiagnostics}
        disabled={isRunning}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isRunning ? '診斷中...' : '開始診斷'}
      </button>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {result.status === 'pending' && '⏳'}
                {result.status === 'success' && '✅'}
                {result.status === 'error' && '❌'}
              </span>
              <h3 className="font-semibold text-gray-800">{result.test}</h3>
            </div>

            <p className={`text-sm mb-2 ${
              result.status === 'error' ? 'text-red-600' :
              result.status === 'success' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {result.message}
            </p>

            {result.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  查看詳細信息
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">💡 常見問題解決方案</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• <strong>CORS錯誤</strong>: 檢查 N8N webhook 是否啟用 CORS headers</li>
          <li>• <strong>404錯誤</strong>: 確認 webhook URL 正確且已啟動</li>
          <li>• <strong>Network錯誤</strong>: 檢查網絡連接和防火牆設置</li>
          <li>• <strong>Mixed Content</strong>: 確保部署環境使用 HTTPS</li>
        </ul>
      </div>
    </div>
  )
}
