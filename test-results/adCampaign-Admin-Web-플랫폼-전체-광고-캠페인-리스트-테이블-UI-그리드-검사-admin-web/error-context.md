# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs-admin\adCampaign.spec.ts >> Admin Web 플랫폼 전체 광고 캠페인 리스트 테이블 UI 그리드 검사
- Location: tests-ai-qa\specs-admin\adCampaign.spec.ts:4:1

# Error details

```
Error: page.goto: net::ERR_EMPTY_RESPONSE at http://localhost:3002/admin/ads
Call log:
  - navigating to "http://localhost:3002/admin/ads", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GeminiVisionOracle } from '../utils/geminiOracle';
  3  | 
  4  | test('Admin Web 플랫폼 전체 광고 캠페인 리스트 테이블 UI 그리드 검사', async ({ page }) => {
  5  |   // 1. 어드민 광고 관리 탭 접속
> 6  |   await page.goto('/admin/ads');
     |              ^ Error: page.goto: net::ERR_EMPTY_RESPONSE at http://localhost:3002/admin/ads
  7  |   await page.waitForTimeout(1000);
  8  | 
  9  |   // 2. 어드민 권한 세션 mock 주입
  10 |   await page.evaluate(() => {
  11 |     localStorage.setItem('token', 'mock-test-admin-jwt-token-1234');
  12 |     localStorage.setItem('user', JSON.stringify({
  13 |       id: 'admin_test',
  14 |       email: 'adminus1@test.com',
  15 |       role: 'ADMIN',
  16 |       preferredLanguage: 'ko'
  17 |     }));
  18 |   });
  19 | 
  20 |   // 새로고침하여 활성화
  21 |   await page.reload();
  22 |   await page.waitForTimeout(2500); // 테이블 데이터 수급 대기
  23 | 
  24 |   // 3. 어드민 대화면 스크린샷 캡처
  25 |   const screenshotPath = './tests-ai-qa/screenshots/admin_ads_table.png';
  26 |   await page.screenshot({ path: screenshotPath });
  27 | 
  28 |   // 4. Gemini AI Multimodal 시각 분석
  29 |   if (process.env.GEMINI_API_KEY) {
  30 |     console.log("🤖 [Admin QA] 플랫폼 전체 광고 집행 현황 데이터 그리드 테이블 비주얼 분석 의뢰 중...");
  31 |     const aiResult = await GeminiVisionOracle.inspectScreenshot(
  32 |       screenshotPath,
  33 |       "어드민 대화면의 광고 관리 탭 그리드 테이블에서 각 열 정렬 및 행 높이가 일정하게 잡혀 있는지, 페이지네이션 앵커 버튼이 찌그러지거나 잘리지 않았는지, 깨진 문자가 없는지 정밀 검사."
  34 |     );
  35 | 
  36 |     console.log(`🤖 [Admin QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
  37 |     console.log(`🤖 [Admin QA] 감지된 결함 내역: ${aiResult.foundIssues}`);
  38 | 
  39 |     expect(aiResult.isValid).toBe(true);
  40 |   } else {
  41 |     console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  42 |   }
  43 | });
  44 | 
```