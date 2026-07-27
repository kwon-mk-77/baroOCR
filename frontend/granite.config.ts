import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에 등록된 고유 앱 식별자 이름
  appName: 'baro-ocr', 

  // 토스 앱 내에 노출될 브랜드 및 테마 설정
  brand: {
    displayName: 'baroOCR',
    primaryColor: '#3182F6', // 토스 블루 컬러
    icon: 'https://static.toss.im/example/icon.png', // 앱 아이콘 URL (토스 콘솔에서 업로드 후 링크로 교체 필요)
  },

  // 로컬 개발 서버 및 빌드 커맨드 설정
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },

  // 사용 권한 설정 (OCR 이미지 촬영을 위한 카메라 권한 요구)
  permissions: [
    { name: 'camera', access: 'access' }
  ],

  outdir: 'dist',
});
