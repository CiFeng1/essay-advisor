const API_BASE_URL = 'https://api.dify.ai/v1'
const API_KEY = 'app-K2OG4vwsG7rE6O2lG33eGwMU'

async function testWorkflowEvents() {
  console.log('=== 详细分析 Workflow SSE 事件 ===')
  try {
    const response = await fetch(`${API_BASE_URL}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { keyword: 'transformer模型' },
        response_mode: 'streaming',
        user: 'test-002',
      }),
    })
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const events = []

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
            events.push({ event: data.event, hasText: !!data.data?.text, hasOutputs: !!data.data?.outputs })
            
            // 打印关键事件
            if (data.event === 'text_chunk') {
              console.log('✅ text_chunk 存在! 文本:', data.data?.text?.slice(0, 50))
            }
            if (data.event === 'workflow_finished') {
              console.log('\nworkflow_finished outputs keys:', Object.keys(data.data?.outputs || {}))
              const outputText = data.data?.outputs?.text
              if (outputText) {
                console.log('outputs.text 前300字:', outputText.slice(0, 300))
              }
            }
          } catch(e) {}
        }
      }
    }
    
    console.log('\n=== 所有事件类型统计 ===')
    const counts = {}
    events.forEach(e => { counts[e.event] = (counts[e.event] || 0) + 1 })
    console.log(counts)
    console.log('\ntext_chunk 事件数:', counts['text_chunk'] || 0)
  } catch (err) {
    console.error('失败:', err.message)
  }
}

testWorkflowEvents()
