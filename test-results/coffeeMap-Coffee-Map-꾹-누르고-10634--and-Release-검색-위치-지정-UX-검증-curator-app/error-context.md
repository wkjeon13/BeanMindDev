# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs-app\coffeeMap.spec.ts >> Coffee Map 꾹 누르고 뗄 때(Long Press and Release) 검색 위치 지정 UX 검증
- Location: tests-ai-qa\specs-app\coffeeMap.spec.ts:4:1

# Error details

```
Error: page.goto: Server returned nothing (no headers, no data)
Call log:
  - navigating to "http://localhost:3002/map", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GeminiVisionOracle } from '../utils/geminiOracle';
  3  | 
  4  | test('Coffee Map 꾹 누르고 뗄 때(Long Press and Release) 검색 위치 지정 UX 검증', async ({ page }) => {
  5  |   // 1. 커피맵 주소 진입
> 6  |   await page.goto('/map');
     |              ^ Error: page.goto: Server returned nothing (no headers, no data)
  7  |   await page.waitForTimeout(3000); // 구글 지도 타일 렌더링 대기
  8  | 
  9  |   // 2. 가상 토큰 및 로케일 주입
  10 |   await page.evaluate(() => {
  11 |     localStorage.setItem('token', 'mock-test-jwt-token-1234');
  12 |     localStorage.setItem('user', JSON.stringify({ preferredLanguage: 'ko' }));
  13 |   });
  14 |   await page.reload();
  15 |   await page.waitForTimeout(2000);
  16 | 
  17 |   // 3. 지도의 중앙 영역을 꾹 누르고 떼는 물리 조작 테스트 시뮬레이션
  18 |   const mapLocator = page.locator('.absolute.inset-0.w-full.h-full');
  19 |   const bounding = await mapLocator.boundingBox();
  20 |   
  21 |   if (bounding) {
  22 |     const startX = bounding.x + bounding.width / 2;
  23 |     const startY = bounding.y + bounding.height / 2;
  24 | 
  25 |     console.log(`🗺️ [Map QA] 지도 중앙부 (${startX}, ${startY}) 터치 시작 시뮬레이션...`);
  26 |     
  27 |     // A. 터치 시작 (mousedown)
  28 |     await page.mouse.move(startX, startY);
  29 |     await page.mouse.down();
  30 |     
  31 |     // B. 손가락을 떼지 않고 500ms만 대기 (900ms보다 작음 ➔ 플래그 미달)
  32 |     await page.waitForTimeout(500);
  33 |     
  34 |     // C. 손가락 뗌 (mouseup)
  35 |     await page.mouse.up();
  36 |     await page.waitForTimeout(1000);
  37 |     
  38 |     // D. 900ms 조건 미달이므로 핀이 찍히지 않아야 함 (Pass 검증)
  39 |     const pinLabel = page.locator("text=선택한 위치");
  40 |     await expect(pinLabel).not.toBeVisible();
  41 |     console.log("✅ 900ms 미만 터치 해제(일반 탭) 시 검색 위치가 지정되지 않는 오작동 차단 확인 완료.");
  42 | 
  43 |     // E. 진짜 롱프레스 시뮬레이션 시작
  44 |     console.log("🗺️ [Map QA] 지도를 지긋이 꾹 1000ms 동안 대고 있다가 떼는 시뮬레이션...");
  45 |     await page.mouse.move(startX, startY);
  46 |     await page.mouse.down();
  47 |     
  48 |     // 900ms 이상 지긋이 유지 (1000ms 대기) ➔ 플래그 longPressTriggered 가 true가 됨
  49 |     await page.waitForTimeout(1000);
  50 |     
  51 |     // 손을 떼기(touchend/mouseup) 직전 상태 ➔ 아직 위치 지정이 되면 안 됨!
  52 |     await expect(pinLabel).not.toBeVisible();
  53 |     
  54 |     // 드디어 손가락을 뗌 (mouseup) ➔ 이 순간 위치 지정 실행!
  55 |     await page.mouse.up();
  56 |     await page.waitForTimeout(1500); // 마커 핀 생성 애니메이션 대기
  57 |   }
  58 | 
  59 |   // 4. 지도 화면 캡처
  60 |   const screenshotPath = './tests-ai-qa/screenshots/app_map_long_press.png';
  61 |   await page.screenshot({ path: screenshotPath });
  62 | 
  63 |   // 5. Gemini AI Multimodal 시각 분석
  64 |   if (process.env.GEMINI_API_KEY) {
  65 |     console.log("🤖 [Map QA] 꾹 누르고 뗀 시점의 커피지도 화면 비주얼 분석 의뢰 중...");
  66 |     const aiResult = await GeminiVisionOracle.inspectScreenshot(
  67 |       screenshotPath,
  68 |       "지도를 꾹 누르고 뗀 정확한 앵커 좌표 자리에 붉은색 '검색 중심' 마커와 팝업 라벨이 찌그러짐 없이 완벽하게 표시되었는지, 구글 지도 인터페이스와 정렬이 맞는지 검사."
  69 |     );
  70 | 
  71 |     console.log(`🤖 [Map QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
  72 |     console.log(`🤖 [Map QA] 감지된 결함 내역: ${aiResult.foundIssues}`);
  73 | 
  74 |     expect(aiResult.isValid).toBe(true);
  75 |   } else {
  76 |     console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  77 |   }
  78 | });
  79 | 
```