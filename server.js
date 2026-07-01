import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 5001

// API 代理：/api/* -> https://api.dify.ai/v1/*
app.use(
  '/api',
  createProxyMiddleware({
    target: 'https://api.dify.ai',
    changeOrigin: true,
    pathRewrite: { '^/api': '/v1' },
    secure: true,
  })
)

// 静态文件
app.use(express.static(path.join(__dirname, 'dist')))

// SPA 回退：所有非 API 路由返回 index.html
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
