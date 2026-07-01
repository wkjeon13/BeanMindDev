package com.beanmind.curator.domain.tastetest.service;

import com.beanmind.curator.domain.store.dto.ShopResponse;
import com.beanmind.curator.domain.store.entity.Store;
import com.beanmind.curator.domain.store.repository.StoreRepository;
import com.beanmind.curator.domain.user.entity.Role;
import com.beanmind.curator.domain.tastetest.dto.*;
import com.beanmind.curator.domain.tastetest.entity.*;
import com.beanmind.curator.domain.tastetest.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TasteTestService {

    private final TasteTestRepository tasteTestRepository;
    private final TasteTestQuestionRepository tasteTestQuestionRepository;
    private final TasteTestOptionRepository tasteTestOptionRepository;
    private final TasteTestResultRepository tasteTestResultRepository;
    private final StoreRepository storeRepository;

    public TasteTestResponse getActiveTest() {
        TasteTest test = tasteTestRepository.findByIsActiveTrue()
                .orElseThrow(() -> new NoSuchElementException("활성화된 Taste Test가 존재하지 않습니다."));
        return convertToResponse(test);
    }

    public List<TasteTestResponse> getAllTests() {
        return tasteTestRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TasteTestResponse saveTasteTest(AdminTasteTestRequest request) {
        // 1. 기존 테스트 조회 또는 신규 생성
        TasteTest test = tasteTestRepository.findById(request.getId())
                .orElseGet(() -> TasteTest.builder().id(request.getId()).build());

        test.setTitle(request.getTitle());
        test.setSubtitle(request.getSubtitle());
        test.setImageUrl(request.getImageUrl());
        test.setIsActive(request.getIsActive() != null ? request.getIsActive() : false);

        // 만약 활성화 처리할 경우, 다른 모든 테스트는 비활성화
        if (test.getIsActive()) {
            tasteTestRepository.findAll().forEach(t -> {
                if (!t.getId().equals(test.getId())) {
                    t.setIsActive(false);
                }
            });
        }

        // 기존 자식 테이블 항목 청소 (Orphan Removal을 위함)
        test.getQuestions().clear();
        test.getResults().clear();
        TasteTest savedTest = tasteTestRepository.save(test);

        // 2. 질문 및 옵션 추가
        if (request.getQuestions() != null) {
            for (AdminTasteTestRequest.QuestionInput qInput : request.getQuestions()) {
                TasteTestQuestion question = TasteTestQuestion.builder()
                        .tasteTest(savedTest)
                        .questionNumber(qInput.getQuestionNumber())
                        .contentKo(qInput.getContentKo())
                        .contentEn(qInput.getContentEn())
                        .build();

                if (qInput.getOptions() != null) {
                    for (AdminTasteTestRequest.OptionInput oInput : qInput.getOptions()) {
                        TasteTestOption option = TasteTestOption.builder()
                                .question(question)
                                .optionLetter(oInput.getOptionLetter())
                                .contentKo(oInput.getContentKo())
                                .contentEn(oInput.getContentEn())
                                .weightAcidity(oInput.getWeightAcidity() != null ? oInput.getWeightAcidity() : 0)
                                .weightSweetness(oInput.getWeightSweetness() != null ? oInput.getWeightSweetness() : 0)
                                .weightBitterness(oInput.getWeightBitterness() != null ? oInput.getWeightBitterness() : 0)
                                .weightBody(oInput.getWeightBody() != null ? oInput.getWeightBody() : 0)
                                .build();
                        question.getOptions().add(option);
                    }
                }
                savedTest.getQuestions().add(question);
            }
        }

        // 3. 결과 유형 추가
        if (request.getResults() != null) {
            for (AdminTasteTestRequest.ResultInput rInput : request.getResults()) {
                TasteTestResult result = TasteTestResult.builder()
                        .id(rInput.getId())
                        .tasteTest(savedTest)
                        .resultNameKo(rInput.getResultNameKo())
                        .resultNameEn(rInput.getResultNameEn())
                        .descriptionKo(rInput.getDescriptionKo())
                        .descriptionEn(rInput.getDescriptionEn())
                        .targetAcidityMin(rInput.getTargetAcidityMin())
                        .targetAcidityMax(rInput.getTargetAcidityMax())
                        .targetSweetnessMin(rInput.getTargetSweetnessMin())
                        .targetSweetnessMax(rInput.getTargetSweetnessMax())
                        .targetBitternessMin(rInput.getTargetBitternessMin())
                        .targetBitternessMax(rInput.getTargetBitternessMax())
                        .targetBodyMin(rInput.getTargetBodyMin())
                        .targetBodyMax(rInput.getTargetBodyMax())
                        .build();
                savedTest.getResults().add(result);
            }
        }

        return convertToResponse(tasteTestRepository.save(savedTest));
    }

    @Transactional
    public void deleteTasteTest(String id) {
        tasteTestRepository.deleteById(id);
    }

    @Transactional
    public void toggleActive(String id, boolean active) {
        TasteTest test = tasteTestRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("해당 Taste Test를 찾을 수 없습니다."));
        test.setIsActive(active);

        if (active) {
            tasteTestRepository.findAll().forEach(t -> {
                if (!t.getId().equals(id)) {
                    t.setIsActive(false);
                }
            });
        }
    }

    // 퀴즈 제출 분석 및 호스트/일반 매장 정렬 추천 알고리즘
    public TasteTestSubmissionResponse submitTest(TasteTestSubmissionRequest request) {
        if (request.getOptionIds() == null || request.getOptionIds().isEmpty()) {
            throw new IllegalArgumentException("제출된 답변 선택지가 없습니다.");
        }

        // 1. 선택한 옵션들을 조회하고 점수 합산
        List<TasteTestOption> selectedOptions = tasteTestOptionRepository.findAllById(request.getOptionIds());
        int totalAcidity = 0;
        int totalSweetness = 0;
        int totalBitterness = 0;
        int totalBody = 0;

        for (TasteTestOption option : selectedOptions) {
            totalAcidity += option.getWeightAcidity();
            totalSweetness += option.getWeightSweetness();
            totalBitterness += option.getWeightBitterness();
            totalBody += option.getWeightBody();
        }

        // 2. 매칭되는 결과 유형 탐색
        TasteTest activeTest = tasteTestRepository.findByIsActiveTrue()
                .orElseThrow(() -> new NoSuchElementException("활성화된 Taste Test가 존재하지 않아 결과를 매칭할 수 없습니다."));

        List<TasteTestResult> results = tasteTestResultRepository.findByTasteTestId(activeTest.getId());
        TasteTestResult matchedResult = null;

        for (TasteTestResult r : results) {
            boolean acidOk = (r.getTargetAcidityMin() == null || totalAcidity >= r.getTargetAcidityMin()) &&
                             (r.getTargetAcidityMax() == null || totalAcidity <= r.getTargetAcidityMax());
            boolean sweetOk = (r.getTargetSweetnessMin() == null || totalSweetness >= r.getTargetSweetnessMin()) &&
                              (r.getTargetSweetnessMax() == null || totalSweetness <= r.getTargetSweetnessMax());
            boolean bitterOk = (r.getTargetBitternessMin() == null || totalBitterness >= r.getTargetBitternessMin()) &&
                               (r.getTargetBitternessMax() == null || totalBitterness <= r.getTargetBitternessMax());
            boolean bodyOk = (r.getTargetBodyMin() == null || totalBody >= r.getTargetBodyMin()) &&
                             (r.getTargetBodyMax() == null || totalBody <= r.getTargetBodyMax());

            if (acidOk && sweetOk && bitterOk && bodyOk) {
                matchedResult = r;
                break;
            }
        }

        // 매칭 결과가 없을 경우 오차가 가장 최소화되는 결과 유형을 Fallback으로 탐색
        if (matchedResult == null && !results.isEmpty()) {
            final int fallbackTotalAcidity = totalAcidity;
            final int fallbackTotalSweetness = totalSweetness;
            matchedResult = results.stream()
                .min(Comparator.comparingInt(r -> {
                    int diff = 0;
                    if (r.getTargetAcidityMin() != null && fallbackTotalAcidity < r.getTargetAcidityMin()) diff += (r.getTargetAcidityMin() - fallbackTotalAcidity);
                    if (r.getTargetAcidityMax() != null && fallbackTotalAcidity > r.getTargetAcidityMax()) diff += (fallbackTotalAcidity - r.getTargetAcidityMax());
                    if (r.getTargetSweetnessMin() != null && fallbackTotalSweetness < r.getTargetSweetnessMin()) diff += (r.getTargetSweetnessMin() - fallbackTotalSweetness);
                    if (r.getTargetSweetnessMax() != null && fallbackTotalSweetness > r.getTargetSweetnessMax()) diff += (fallbackTotalSweetness - r.getTargetSweetnessMax());
                    return diff;
                }))
                .orElse(results.get(0));
        }

        if (matchedResult == null) {
            throw new NoSuchElementException("정의된 결과 유형이 없습니다.");
        }

        // 3. 맛 오차 최소 및 호스트 등록 여부 가중치를 반영한 추천 카페 매칭
        List<Store> allStores = storeRepository.findAll();
        final int finalAcidity = totalAcidity;
        final int finalSweetness = totalSweetness;
        final int finalBitterness = totalBitterness;
        final int finalBody = totalBody;

        List<ShopResponse> recommendedShops = allStores.stream()
                .map(store -> {
                    // 매장의 맛 점수 로드
                    double sAcid = store.getAcidity() != null ? store.getAcidity() : 5.0;
                    double sSweet = store.getSweetness() != null ? store.getSweetness() : 5.0;
                    double sBitter = store.getBitterness() != null ? store.getBitterness() : 5.0;
                    double sBody = store.getBody() != null ? store.getBody() : 5.0;

                    // 사용자 점수와 매장의 오차 벡터 계산
                    double diff = Math.abs(finalAcidity - sAcid)
                            + Math.abs(finalSweetness - sSweet)
                            + Math.abs(finalBitterness - sBitter)
                            + Math.abs(finalBody - sBody);

                    int matchRate = (int) Math.max(0, Math.min(100, Math.round(100.0 - (diff * 2.5))));
                    boolean isHost = store.getOwner() != null && store.getOwner().getRole() == Role.OWNER;

                    return ShopResponse.builder()
                            .id(store.getId())
                            .name(store.getName())
                            .address(store.getAddress())
                            .phone(store.getPhone())
                            .shortDesc(store.getShortDesc())
                            .longDesc(store.getLongDesc())
                            .websiteUrl(store.getWebsiteUrl())
                            .lat(store.getLat())
                            .lng(store.getLng())
                            .signatureBean(store.getSignatureBean())
                            .primaryCoffeeType(store.getPrimaryCoffeeType() != null ? store.getPrimaryCoffeeType().name() : null)
                            .acidity(store.getAcidity())
                            .sweetness(store.getSweetness())
                            .bitterness(store.getBitterness())
                            .body(store.getBody())
                            .mainImageUrl(store.getMainImageUrl())
                            .markerImageUrl(store.getMarkerImageUrl())
                            .isPremiumTop(store.getIsPremiumTop())
                            .isHostRegistered(isHost)
                            .matchRate(matchRate)
                            .build();
                })
                .collect(Collectors.toList());

        // Stream 정렬 시의 타입 안전한 정렬 적용
        recommendedShops.sort((s1, s2) -> {
            boolean host1 = s1.getIsHostRegistered() != null && s1.getIsHostRegistered();
            boolean host2 = s2.getIsHostRegistered() != null && s2.getIsHostRegistered();
            if (host1 && !host2) return -1;
            if (!host1 && host2) return 1;
            return Integer.compare(s2.getMatchRate(), s1.getMatchRate());
        });

        // 최대 10개 추출
        List<ShopResponse> limitedShops = recommendedShops.stream()
                .limit(10)
                .collect(Collectors.toList());

        TasteTestResponse.ResultDto resultDto = TasteTestResponse.ResultDto.builder()
                .id(matchedResult.getId())
                .resultNameKo(matchedResult.getResultNameKo())
                .resultNameEn(matchedResult.getResultNameEn())
                .descriptionKo(matchedResult.getDescriptionKo())
                .descriptionEn(matchedResult.getDescriptionEn())
                .build();

        return TasteTestSubmissionResponse.builder()
                .result(resultDto)
                .userAcidity(totalAcidity)
                .userSweetness(totalSweetness)
                .userBitterness(totalBitterness)
                .userBody(totalBody)
                .recommendedShops(limitedShops)
                .build();
    }

    private TasteTestResponse convertToResponse(TasteTest test) {
        List<TasteTestResponse.QuestionDto> qList = test.getQuestions().stream()
                .map(q -> {
                    List<TasteTestResponse.OptionDto> oList = q.getOptions().stream()
                            .map(o -> TasteTestResponse.OptionDto.builder()
                                    .id(o.getId())
                                    .optionLetter(o.getOptionLetter())
                                    .contentKo(o.getContentKo())
                                    .contentEn(o.getContentEn())
                                    .weightAcidity(o.getWeightAcidity())
                                    .weightSweetness(o.getWeightSweetness())
                                    .weightBitterness(o.getWeightBitterness())
                                    .weightBody(o.getWeightBody())
                                    .build())
                            .collect(Collectors.toList());

                    return TasteTestResponse.QuestionDto.builder()
                            .id(q.getId())
                            .questionNumber(q.getQuestionNumber())
                            .contentKo(q.getContentKo())
                            .contentEn(q.getContentEn())
                            .options(oList)
                            .build();
                })
                .sorted(Comparator.comparingInt(TasteTestResponse.QuestionDto::getQuestionNumber))
                .collect(Collectors.toList());

        List<TasteTestResponse.ResultDto> rList = test.getResults().stream()
                .map(r -> TasteTestResponse.ResultDto.builder()
                        .id(r.getId())
                        .resultNameKo(r.getResultNameKo())
                        .resultNameEn(r.getResultNameEn())
                        .descriptionKo(r.getDescriptionKo())
                        .descriptionEn(r.getDescriptionEn())
                        .targetAcidityMin(r.getTargetAcidityMin())
                        .targetAcidityMax(r.getTargetAcidityMax())
                        .targetSweetnessMin(r.getTargetSweetnessMin())
                        .targetSweetnessMax(r.getTargetSweetnessMax())
                        .targetBitternessMin(r.getTargetBitternessMin())
                        .targetBitternessMax(r.getTargetBitternessMax())
                        .targetBodyMin(r.getTargetBodyMin())
                        .targetBodyMax(r.getTargetBodyMax())
                        .build())
                .collect(Collectors.toList());

        return TasteTestResponse.builder()
                .id(test.getId())
                .title(test.getTitle())
                .subtitle(test.getSubtitle())
                .imageUrl(test.getImageUrl())
                .isActive(test.getIsActive())
                .questions(qList)
                .results(rList)
                .build();
    }
}
