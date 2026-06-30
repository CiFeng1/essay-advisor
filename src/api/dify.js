// 通过 Vite 代理转发，避免 CORS 问题
// /api/workflows/run -> https://api.dify.ai/v1/workflows/run
const API_BASE_URL = '/api'

/**
 * 发送 Workflow 消息（流式模式）
 */
export async function sendWorkflowMessage(query, user, onMessage, onComplete, onError, onNodeEvent) {
  try {
    const response = await fetch(`${API_BASE_URL}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer app-K2OG4vwsG7rE6O2lG33eGwMU`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { keyword: query },
        response_mode: 'streaming',
        user: user,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let fullAnswer = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)

            switch (data.event) {
              case 'workflow_started':
                onNodeEvent?.('started', data)
                break

              case 'node_started':
                onNodeEvent?.('node_start', data)
                break

              case 'node_finished':
                onNodeEvent?.('node_finish', data)
                break

              case 'text_chunk':
                if (data.data?.text) {
                  fullAnswer += data.data.text
                  onMessage(data.data.text)
                }
                break

              case 'workflow_finished':
                const outputs = data.data?.outputs || {}
                const finalText = outputs.out || outputs.text || fullAnswer
                if (finalText && finalText !== fullAnswer) {
                  fullAnswer = finalText
                }
                onComplete(fullAnswer || finalText)
                return

              case 'error':
                onError(new Error(data.data?.message || data.message || '工作流执行出错'))
                return
            }
          } catch (e) {
            // 跳过无法解析的行
          }
        }
      }
    }

    if (fullAnswer) {
      onComplete(fullAnswer)
    }
  } catch (error) {
    onError(error)
  }
}
