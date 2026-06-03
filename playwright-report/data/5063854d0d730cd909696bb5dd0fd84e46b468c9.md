# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs-host\salesChart.spec.ts >> Host Web 점주 대시보드 매출/적립 현황 차트 비주얼 검사
- Location: tests-ai-qa\specs-host\salesChart.spec.ts:4:1

# Error details

```
Error: page.goto: net::ERR_EMPTY_RESPONSE at http://localhost:3002/profile/host-web
Call log:
  - navigating to "http://localhost:3002/profile/host-web", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GeminiVisionOracle } from '../utils/geminiOracle';
  3  | 
  4  | test('Host Web 점주 대시보드 매출/적립 현황 차트 비주얼 검사', async ({ page }) => {
  5  |   // 1. 점주 대시보드 페이지 접속
> 6  |   await page.goto('/profile/host-web');
     |              ^ Error: page.goto: net::ERR_EMPTY_RESPONSE at http://localhost:3002/profile/host-web
  7  |   await page.waitForTimeout(1000);
  8  | 
  9  |   // 2. 점주 권한 세션 mock 주입
  10 |   await page.evaluate(() => {
  11 |     localStorage.setItem('token', 'mock-test-host-jwt-token-1234');
  12 |     localStorage.setItem('user', JSON.stringify({
  13 |       id: 'host_test',
  14 |       email: 'hostus1@test.com',
  15 |       role: 'HOST',
  16 |       preferredLanguage: 'ko'
  17 |     }));
  18 |   });
  19 | 
  20 |   // 새로고침하여 활성화
  21 |   await page.reload();
  22 |   await page.waitForTimeout(3000); // Recharts 차트 애니메이션 완성 대기
  23 | 
  24 |   // 3. 데스크톱 뷰포트 스크린샷 캡처
  25 |   const screenshotPath = './tests-ai-qa/screenshots/host_sales_chart.png';
  26 |   await page.screenshot({ path: screenshotPath });
  27 | 
  28 |   // 4. Gemini AI Multimodal 시각 분석
  29 |   if (process.env.GEMINI_API_KEY) {
  30 |     console.log("🤖 [Host QA] 점주 대시보드 스탬프/매출 분석 차트 렌더링 비주얼 분석 의뢰 중...");
  31 |     const aiResult = await GeminiVisionOracle.inspectScreenshot(
  32 |       screenshotPath,
  33 |       "점주 대시보드의 '스탬프 적립 및 매출 데이터 추이 분석' 라인 차트 선이 스무스하게 렌더링되고 있는지, 차트 범례 눈금과 레이블이 찌그러지거나 레이아웃 줄바꿈 에러를 내고 있지는 않은지 검사."
  34 |     );
  35 | 
  36 |     console.log(`🤖 [Host QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
  37 |     console.log(`🤖 [Host QA] 감지된 결함 내역: ${aiResult.foundIssues}`);
  38 | 
  39 |     expect(aiResult.isValid).toBe(true);
  40 |   } else {
  41 |     console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  42 |   }
  43 | });
  44 | 
```