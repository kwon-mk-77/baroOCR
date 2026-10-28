import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 같은 와이파이의 휴대폰에서 접속 테스트 가능
    proxy: {
      // changeOrigin: false — 카카오 Redirect URI를 localhost:5173 기준으로 만들기 위해 Host 헤더 유지
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    }
  }
})
