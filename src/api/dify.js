const API_BASE_URL = 'https://api.dify.ai/v1'
const API_KEY = 'app-K2OG4vwsG7rE6O2lG33eGwMU'

/**
 * 发送 Workflow 消息（流式模式）
 * @param {string} query - 用户问题（作为 keyword 输入）
 * @param {string} user - 用户标识
 * @param {Function} onMessage - 每收到一段内容时的回调 (chunk) => {}
 * @param {Function} onComplete - 完成时的回调 (fullAnswer) => {}
 * @param {Function} onError - 出错时的回调 (error) => {}
 * @param {Function} onNodeEvent - 节点事件回调 (eventType, data) => {}
 */
export async function sendWorkflowMessage(query, user, onMessage, onComplete, onError, onNodeEvent) {
  try {
    const response = await fetch(`${API_BASE_URL}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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
                // 流式文本块
                if (data.data?.text) {
                  fullAnswer += data.data.text
                  onMessage(data.data.text)
                }
                break

              case 'workflow_finished':
                // 工作流完成，获取最终输出（可能是 out 或 text 字段）
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

    // 流结束但没触发 workflow_finished
    if (fullAnswer) {
      onComplete(fullAnswer)
    }
  } catch (error) {
    onError(error)
  }
}
