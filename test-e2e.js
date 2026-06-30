// 模拟前端 API 调用的端到端测试
const API_BASE_URL = 'https://api.dify.ai/v1'
const API_KEY = 'app-K2OG4vwsG7rE6O2lG33eGwMU'

async function sendWorkflowMessage(query, user) {
  return new Promise(async (resolve, reject) => {
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

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let fullAnswer = ''
      let buffer = ''
      let chunkCount = 0
      let nodeCount = 0

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

              if (data.event === 'text_chunk' && data.data?.text) {
                fullAnswer += data.data.text
                chunkCount++
              }
              if (data.event === 'node_started') nodeCount++
              if (data.event === 'workflow_finished') {
                const outputs = data.data?.outputs || {}
                fullAnswer = outputs.out || outputs.text || fullAnswer
                resolve({ answer: fullAnswer, chunks: chunkCount, nodes: nodeCount })
                return
              }
            } catch(e) {}
          }
        }
      }
      resolve({ answer: fullAnswer, chunks: chunkCount, nodes: nodeCount })
    } catch (err) {
      reject(err)
    }
  })
}

async function runTests() {
  console.log('🧪 端到端测试开始...\n')

  // 测试 1: 基本查询
  console.log('📝 测试 1: 查询 "深度学习 论文"')
  try {
    const r1 = await sendWorkflowMessage('深度学习 论文', 'test-e2e-001')
    console.log(`   状态: ✅ 成功`)
    console.log(`   文本块: ${r1.chunks} | 节点: ${r1.nodes}`)
    console.log(`   回答前200字: ${r1.answer?.slice(0, 200)}...\n`)
  } catch(e) {
    console.log(`   状态: ❌ 失败 - ${e.message}\n`)
  }

  // 测试 2: 另一个查询
  console.log('📝 测试 2: 查询 "大语言模型 最新研究"')
  try {
    const r2 = await sendWorkflowMessage('大语言模型 最新研究', 'test-e2e-002')
    console.log(`   状态: ✅ 成功`)
    console.log(`   文本块: ${r2.chunks} | 节点: ${r2.nodes}`)
    console.log(`   回答前200字: ${r2.answer?.slice(0, 200)}...\n`)
  } catch(e) {
    console.log(`   状态: ❌ 失败 - ${e.message}\n`)
  }

  console.log('🎉 端到端测试完成！')
}

runTests()
