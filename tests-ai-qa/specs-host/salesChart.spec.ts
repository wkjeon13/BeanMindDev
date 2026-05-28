import { test, expect } from '@playwright/test';
import { GeminiVisionOracle } from '../utils/geminiOracle';

test('Host Web 점주 대시보드 매출/적립 현황 차트 비주얼 검사', async ({ page }) => {
  // 1. 점주 대시보드 페이지 접속
  await page.goto('/profile/host-web');
  await page.waitForTimeout(1000);

  // 2. 점주 권한 세션 mock 주입
  await page.evaluate(() => {
    localStorage.setItem('token', 'mock-test-host-jwt-token-1234');
    localStorage.setItem('user', JSON.stringify({
      id: 'host_test',
      email: 'hostus1@test.com',
      role: 'HOST',
      preferredLanguage: 'ko'
    }));
  });

  // 새로고침하여 활성화
  await page.reload();
  await page.waitForTimeout(3000); // Recharts 차트 애니메이션 완성 대기

  // 3. 데스크톱 뷰포트 스크린샷 캡처
  const screenshotPath = './tests-ai-qa/screenshots/host_sales_chart.png';
  await page.screenshot({ path: screenshotPath });

  // 4. Gemini AI Multimodal 시각 분석
  if (process.env.GEMINI_API_KEY) {
    console.log("🤖 [Host QA] 점주 대시보드 스탬프/매출 분석 차트 렌더링 비주얼 분석 의뢰 중...");
    const aiResult = await GeminiVisionOracle.inspectScreenshot(
      screenshotPath,
      "점주 대시보드의 '스탬프 적립 및 매출 데이터 추이 분석' 라인 차트 선이 스무스하게 렌더링되고 있는지, 차트 범례 눈금과 레이블이 찌그러지거나 레이아웃 줄바꿈 에러를 내고 있지는 않은지 검사."
    );

    console.log(`🤖 [Host QA] 판정 결과: ${aiResult.isValid ? 'PASS' : 'FAIL'} (확신도: ${aiResult.confidenceScore}%)`);
    console.log(`🤖 [Host QA] 감지된 결함 내역: ${aiResult.foundIssues}`);

    expect(aiResult.isValid).toBe(true);
  } else {
    console.log("⚠️ GEMINI_API_KEY 환경변수가 설정되지 않아 AI 시각 분석 검증 단계를 스킵합니다.");
  }
});
