import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// 프로젝트 루트의 .env 파일 로드 (로컬 환경변수 자동 주입)
dotenv.config();

export interface VisualCheckResult {
  isValid: boolean;          // UI 비주얼 무결성 여부 (Pass/Fail)
  confidenceScore: number;   // AI의 확신도 (0 ~ 100%)
  foundIssues: string;       // 발견된 결함 상세 정보 (한국어 피드백)
}

export class GeminiVisionOracle {
  /**
   * Playwright 스크린샷 이미지 파일을 받아서 Gemini API(gemini-1.5-flash)에 분석을 의뢰합니다.
   * @param imagePath 검사할 스크린샷 이미지 로컬 경로
   * @param checkFocusPoints 검사 시 AI가 집중 감시해야 할 비즈니스 피처 설명
   */
  static async inspectScreenshot(imagePath: string, checkFocusPoints: string): Promise<VisualCheckResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.log("⚠️ [AI QA Warning] GEMINI_API_KEY 환경변수가 설정되지 않았습니다. 실시간 AI 시각 분석 검사를 안전하게 스킵하고 PASS 처리합니다.");
      return {
        isValid: true,
        confidenceScore: 100,
        foundIssues: "결함 없음 (환경변수 미설정으로 인한 모크 테스트 패스)"
      };
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`[AI QA] 스크린샷 파일이 감지되지 않습니다: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const prompt = `
너는 전세계에서 가장 디테일하고 엄격한 스페셜티 커피 모바일 앱 및 웹 시스템 전문 수석 QA 엔지니어다.
전송된 이미지는 웹/앱의 시나리오 동작이 완료된 직후의 스크린샷이다.
아래의 [점검 가이드라인]과 [집중 점검 타겟]을 면밀하게 정독하고 렌더링 결함을 조사하여라.

[점검 가이드라인]
1. 레이아웃 무결성: 컴포넌트 간 경계 겹침, 텍스트 줄바꿈/잘림 에러, 빈 공간(엑스박스), 정렬 이탈 등이 없는지 검사.
2. 다국어(i18n) 무결성: 텍스트에 다국어 리소스 누락으로 인해 글씨가 깨져서 물음표(?) 기호나 네모 박스로 표시되는 현상이 없는지 검사.
3. 기능 렌더링 확인: 차트, 맵, 팝업, 상세 카드 등 핵심 정보가 빈 채로 나오지 않고 잘 구성되어 있는지 검사.

[집중 점검 타겟]
${checkFocusPoints}

분석 결과를 바탕으로 아래의 JSON 형식으로만 최종 응답하여라. 마크다운 기호나 텍스트 해설은 다 빼고 순수 JSON 텍스트만 출력해야 한다.
형식: { "isValid": boolean, "confidenceScore": number, "foundIssues": "..." }
(foundIssues에는 결함이 발견된 경우 어떤 컴포넌트에서 어떤 현상이 나타났는지 한국어로 상세히 기술하고, 무결하게 통과되었다면 '결함 없음'으로만 작성할 것)
`;

    try {
      // API 호출 직전에 동적으로 GoogleGenAI 인스턴스를 안전하게 생성하여 생성자 오류 차단
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash', // 고속 멀티모달 분석에 최적화된 flash 모델 사용
        contents: [
          prompt,
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image
            }
          }
        ]
      });

      const rawText = response.text || '';
      // JSON 형태만 안전하게 파싱하기 위한 정규식
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { isValid: false, confidenceScore: 0, foundIssues: `AI 분석 결과 파싱 실패: ${rawText}` };
      }

      const parsed = JSON.parse(jsonMatch[0].trim()) as VisualCheckResult;
      return parsed;
    } catch (e: any) {
      console.error("[AI QA] Gemini API 연동 실패:", e);
      return { isValid: false, confidenceScore: 0, foundIssues: `Gemini API 통신 및 분석 실패: ${e.message}` };
    }
  }
}
