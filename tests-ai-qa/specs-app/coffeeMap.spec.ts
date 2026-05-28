import { test, expect } from '@playwright/test';
import { GeminiVisionOracle } from '../utils/geminiOracle';

test('Coffee Map 꾹 누르고 뗄 때(Long Press and Release) 검색 위치 지정 UX 검증', async ({ page }) => {
  // 1. 커피맵 주소 진입
  await page.goto('/map');
  await page.waitForTimeout(3000); // 구글 지도 타일 렌더링 대기

  // 2. 가상 토큰 및 로케일 주입
  await page.evaluate(() => {
    localStorage.setItem('token', 'mock-test-jwt-token-1234');
    localStorage.setItem('user', JSON.stringify({ preferredLanguage: 'ko' }));
  });
  await page.reload();
  await page.waitForTimeout(2000);

  // 3. 지도의 중앙 영역을 꾹 누르고 떼는 물리 조작 테스트 시뮬레이션
  const mapLocator = page.locator('.absolute.inset-0.w-full.h-full');
  const bounding = await mapLocator.boundingBox();
  
  if (bounding) {
    const startX = bounding.x + bounding.width / 2;
    const startY = bounding.y + bounding.height / 2;

    console.log(`🗺️ [Map QA] 지도 중앙부 (${startX}, ${startY}) 터치 시작 시뮬레이션...`);
    
    // A. 터치 시작 (mousedown)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // B. 손가락을 떼지 않고 500ms만 대기 (900ms보다 작음 ➔ 플래그 미달)
    await page.waitForTimeout(500);
    
    // C. 손가락 뗌 (mouseup)
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // D. 900ms 조건 미달이므로 핀이 찍히지 않아야 함 (Pass 검증)
    const pinLabel = page.locator("text=선택한 위치");
    await expect(pinLabel).not.toBeVisible();
    console.log("✅ 900ms 미만 터치 해제(일반 탭) 시 검색 위치가 지정되지 않는 오작동 차단 확인 완료.");

    // E. 진짜 롱프레스 시뮬레이션 시작
    console.log("🗺️ [Map QA] 지도를 지긋이 꾹 1000ms 동안 대고 있다가 떼는 시뮬레이션...");
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // 900ms 이상 지긋이 유지 (1000ms 대기) ➔ 플래그 longPressTriggered 가 true가 됨
    await page.waitForTimeout(1000);
    
    // 손을 떼기(touchend/mouseup) 직전 상태 ➔ 아직 위치 지정이 되면 안 됨!
    await expect(pinLabel).not.toBeVisible();
    
    // 드디어 손가락을 뗌 (mouseup) ➔ 이 순간 위치 지정 실행!
    await page.mouse.up();
    await page.waitForTimeout(1500); // 마커 핀 생성 애니메이션 대기
  }

  // 4. 지도 화면 캡처
  const screenshotPath = './tests-ai-qa/screenshots/app_map_long_press.png';
  await page.screenshot({ path: screenshotPath });

  // 5. Gemini AI Multimodal 시각 분석
  if (process.env.GEMINI_API_KEY) {
    console.log("🤖 [Map QA] 꾹 누르고 뗀 시점의 커피지도 화면 비주얼 분석 의뢰 중...");
    const aiResult = await GeminiVisionOracle.inspectScreenshot(
      screenshotPath,
      "지도를 꾹 누르고 뗀 정확한 앵커 좌표 자리에 붉은색 '검색 중심' 마커와 팝업 라벨이 찌그러짐 없이 완벽하게 표시되었는지, 구글 지도 인터페이스와 정렬이 맞는지 검사."
    );

    console.log(`🤖 [Map QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
    console.log(`🤖 [Map QA] 감지된 결함 내역: ${aiResult.foundIssues}`);

    expect(aiResult.isValid).toBe(true);
  } else {
    console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  }
});
