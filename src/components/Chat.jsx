import { useState, useRef, useEffect } from 'react'
import { sendWorkflowMessage } from '../api/dify'
import './Chat.css'

function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nodeStatus, setNodeStatus] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const userId = useRef('user-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9))

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, nodeStatus])

  const handleSend = async () => {
    const query = input.trim()
    if (!query || loading) return

    setInput('')
    setError('')
    setNodeStatus('')

    const userMsg = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])

    const assistantMsg = { role: 'assistant', content: '', streaming: true }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(true)

    sendWorkflowMessage(
      query,
      userId.current,
      (chunk) => {
        setMessages(prev => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content + chunk,
            }
          }
          return updated
        })
      },
      (fullAnswer) => {
        setMessages(prev => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: fullAnswer || updated[lastIdx].content,
              streaming: false,
            }
          }
          return updated
        })
        setLoading(false)
        setNodeStatus('')
      },
      (err) => {
        setError(err.message)
        setMessages(prev => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (updated[lastIdx]?.role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content || '抱歉，请求出错了',
              streaming: false,
              error: true,
            }
          }
          return updated
        })
        setLoading(false)
        setNodeStatus('')
      },
      (eventType, data) => {
        if (eventType === 'node_start' && data.data?.title) {
          setNodeStatus(`正在执行: ${data.data.title}...`)
        }
      }
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setError('')
    setNodeStatus('')
    inputRef.current?.focus()
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-left">
          <span className="header-icon">📚</span>
          <h1>论文查询器</h1>
          <span className="header-badge">AI 助手</span>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat} title="新建对话">
          + 新对话
        </button>
      </header>

      <div className="messages-area">
        {messages.length === 0 && (
          <div className="welcome-screen">
            <div className="welcome-icon">🎓</div>
            <h2>论文查询助手</h2>
            <p>我是你的学术论文查询助手，输入关键词帮你查找相关论文</p>
            <div className="suggestions">
              <button onClick={() => { setInput('人工智能最新论文'); handleSend(); }}>
                人工智能最新论文
              </button>
              <button onClick={() => { setInput('深度学习 自然语言处理'); handleSend(); }}>
                深度学习 NLP
              </button>
              <button onClick={() => { setInput('计算机视觉 目标检测'); handleSend(); }}>
                计算机视觉
              </button>
              <button onClick={() => { setInput('大语言模型 LLM'); handleSend(); }}>
                大语言模型
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className={`message-content ${msg.error ? 'error' : ''}`}>
              {msg.content || (msg.streaming && <span className="typing-indicator">思考中...</span>)}
              {msg.streaming && msg.content && <span className="cursor-blink">|</span>}
            </div>
          </div>
        ))}

        {loading && nodeStatus && (
          <div className="node-status">
            <span className="node-dot"></span>
            {nodeStatus}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="error-bar">
          <span>⚠ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="input-area">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入论文关键词进行查询..."
            disabled={loading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="发送 (Enter)"
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
        <p className="input-hint">按 Enter 发送，输入关键词查询相关论文</p>
      </div>
    </div>
  )
}

export default Chat
