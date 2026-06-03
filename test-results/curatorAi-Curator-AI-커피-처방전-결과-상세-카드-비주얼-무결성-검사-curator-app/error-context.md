# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs-app\curatorAi.spec.ts >> Curator AI 커피 처방전 결과 상세 카드 비주얼 무결성 검사
- Location: tests-ai-qa\specs-app\curatorAi.spec.ts:4:1

# Error details

```
Error: page.goto: Server returned nothing (no headers, no data)
Call log:
  - navigating to "http://localhost:3002/profile/prescriptions", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GeminiVisionOracle } from '../utils/geminiOracle';
  3  | 
  4  | test('Curator AI 커피 처방전 결과 상세 카드 비주얼 무결성 검사', async ({ page }) => {
  5  |   // 1. 처방전 보관함 페이지로 진입
> 6  |   await page.goto('/profile/prescriptions');
     |              ^ Error: page.goto: Server returned nothing (no headers, no data)
  7  |   await page.waitForTimeout(1000);
  8  | 
  9  |   // 2. 로그인 및 언어 세션 mock 주입
  10 |   await page.evaluate(() => {
  11 |     localStorage.setItem('token', 'mock-test-jwt-token-1234');
  12 |     localStorage.setItem('user', JSON.stringify({
  13 |       id: 'usr_test',
  14 |       email: 'userus3@test.com',
  15 |       preferredLanguage: 'ko'
  16 |     }));
  17 |   });
  18 | 
  19 |   // 세션 주입 후 페이지 새로고침하여 활성화
  20 |   await page.reload();
  21 |   await page.waitForTimeout(2000);
  22 | 
  23 |   // 3. 처방전 목록 중 첫 번째 상세 아이템 클릭 시도 (목록이 렌더링되어 있는지 확인)
  24 |   const prescriptionItem = page.locator('.prescription-card-item').first();
  25 |   if (await prescriptionItem.isVisible()) {
  26 |     await prescriptionItem.click();
  27 |     await page.waitForTimeout(1500); // 팝업 모달 트랜지션 애니메이션 대기
  28 |   }
  29 | 
  30 |   // 4. 모바일 뷰포트 스크린샷 캡처
  31 |   const screenshotPath = './tests-ai-qa/screenshots/app_curator_result.png';
  32 |   await page.screenshot({ path: screenshotPath });
  33 | 
  34 |   // 5. Gemini AI Multimodal 시각 분석
  35 |   if (process.env.GEMINI_API_KEY) {
  36 |     console.log("🤖 [App QA] AI 커피 처방전 상세 결과 카드 비주얼 결함 분석 의뢰 중...");
  37 |     const aiResult = await GeminiVisionOracle.inspectScreenshot(
  38 |       screenshotPath,
  39 |       "모바일 팝업으로 뜬 커피 처방전 카드 마크다운 텍스트 폰트 깨짐이 없는지, 산미/단맛 오각형 그래프 수치가 누락되지 않고 잘 차오르는지, 하단 매칭 제휴 카페 추천 카드가 정렬을 지켜 정상 출력되는지 검사."
  40 |     );
  41 | 
  42 |     console.log(`🤖 [App QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
  43 |     console.log(`🤖 [App QA] 결함 내역 상세: ${aiResult.foundIssues}`);
  44 | 
  45 |     // 최종 비주얼 디자인 결함 여부 단언(Assert)
  46 |     expect(aiResult.isValid).toBe(true);
  47 |   } else {
  48 |     console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  49 |   }
  50 | });
  51 | 
```