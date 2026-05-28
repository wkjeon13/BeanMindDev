import { test, expect } from '@playwright/test';
import { GeminiVisionOracle } from '../utils/geminiOracle';

test('Curator AI 커피 처방전 결과 상세 카드 비주얼 무결성 검사', async ({ page }) => {
  // 1. 처방전 보관함 페이지로 진입
  await page.goto('/profile/prescriptions');
  await page.waitForTimeout(1000);

  // 2. 로그인 및 언어 세션 mock 주입
  await page.evaluate(() => {
    localStorage.setItem('token', 'mock-test-jwt-token-1234');
    localStorage.setItem('user', JSON.stringify({
      id: 'usr_test',
      email: 'userus3@test.com',
      preferredLanguage: 'ko'
    }));
  });

  // 세션 주입 후 페이지 새로고침하여 활성화
  await page.reload();
  await page.waitForTimeout(2000);

  // 3. 처방전 목록 중 첫 번째 상세 아이템 클릭 시도 (목록이 렌더링되어 있는지 확인)
  const prescriptionItem = page.locator('.prescription-card-item').first();
  if (await prescriptionItem.isVisible()) {
    await prescriptionItem.click();
    await page.waitForTimeout(1500); // 팝업 모달 트랜지션 애니메이션 대기
  }

  // 4. 모바일 뷰포트 스크린샷 캡처
  const screenshotPath = './tests-ai-qa/screenshots/app_curator_result.png';
  await page.screenshot({ path: screenshotPath });

  // 5. Gemini AI Multimodal 시각 분석
  if (process.env.GEMINI_API_KEY) {
    console.log("🤖 [App QA] AI 커피 처방전 상세 결과 카드 비주얼 결함 분석 의뢰 중...");
    const aiResult = await GeminiVisionOracle.inspectScreenshot(
      screenshotPath,
      "모바일 팝업으로 뜬 커피 처방전 카드 마크다운 텍스트 폰트 깨짐이 없는지, 산미/단맛 오각형 그래프 수치가 누락되지 않고 잘 차오르는지, 하단 매칭 제휴 카페 추천 카드가 정렬을 지켜 정상 출력되는지 검사."
    );

    console.log(`🤖 [App QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
    console.log(`🤖 [App QA] 결함 내역 상세: ${aiResult.foundIssues}`);

    // 최종 비주얼 디자인 결함 여부 단언(Assert)
    expect(aiResult.isValid).toBe(true);
  } else {
    console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  }
});
