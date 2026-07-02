package com.beanmind.curator.domain.ad.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.common.service.MailService;
import com.beanmind.curator.domain.ad.entity.AdInquiry;
import com.beanmind.curator.domain.ad.entity.AdInquiry.InquiryStatus;
import com.beanmind.curator.domain.ad.entity.Advertiser;
import com.beanmind.curator.domain.ad.entity.Advertiser.AdvertiserStatus;
import com.beanmind.curator.domain.ad.repository.AdInquiryRepository;
import com.beanmind.curator.domain.ad.repository.AdvertiserRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdInquiryService {

    private final AdInquiryRepository adInquiryRepository;
    private final AdvertiserRepository advertiserRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    @Transactional
    public AdInquiry createAdInquiry(AdInquiry inquiryRequest, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        AdInquiry inquiry = AdInquiry.builder()
                .id(UUID.randomUUID().toString())
                .advertiser(inquiryRequest.getAdvertiser())
                .content(inquiryRequest.getContent())
                .contactName(inquiryRequest.getContactName())
                .contactPhone(inquiryRequest.getContactPhone())
                .contactEmail(inquiryRequest.getContactEmail() != null ? inquiryRequest.getContactEmail().trim() : null)
                .status(InquiryStatus.PENDING)
                .user(user)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return adInquiryRepository.save(inquiry);
    }

    @Transactional(readOnly = true)
    public List<AdInquiry> getInquiriesByHost(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return adInquiryRepository.findByUserId(user.getId());
    }

    @Transactional(readOnly = true)
    public List<AdInquiry> getAllInquiries() {
        return adInquiryRepository.findAll();
    }

    @Transactional
    public AdInquiry updateStatus(String id, String statusStr, String adminMemo) {
        AdInquiry inquiry = adInquiryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.BAD_REQUEST));

        if (statusStr != null) {
            InquiryStatus newStatus = InquiryStatus.valueOf(statusStr.toUpperCase());
            inquiry.setStatus(newStatus);

            // 승인(APPROVED) 상태로 변경 시 Advertiser 자동 생성 연동
            if (newStatus == InquiryStatus.APPROVED) {
                createAdvertiserFromInquiry(inquiry);
            }
        }

        if (adminMemo != null) {
            inquiry.setAdminMemo(adminMemo);
        }

        inquiry.setUpdatedAt(LocalDateTime.now());
        return adInquiryRepository.save(inquiry);
    }

    @Transactional
    public boolean sendEmail(String id, String subject, String message, String newStatus) {
        AdInquiry inquiry = adInquiryRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.BAD_REQUEST));

        // 메일 발송
        mailService.sendAdminAnnouncement(inquiry.getContactEmail() != null ? inquiry.getContactEmail().trim() : null, subject, message);

        // 상태 업데이트 반영이 명시된 경우 업데이트 처리
        if (newStatus != null && !newStatus.isEmpty()) {
            InquiryStatus status = InquiryStatus.valueOf(newStatus.toUpperCase());
            inquiry.setStatus(status);
            if (status == InquiryStatus.APPROVED) {
                createAdvertiserFromInquiry(inquiry);
            }
            inquiry.setUpdatedAt(LocalDateTime.now());
            adInquiryRepository.save(inquiry);
        }

        return true;
    }

    private void createAdvertiserFromInquiry(AdInquiry inquiry) {
        // 이미 연동된 호스트 광고주가 존재하는지 체크
        if (inquiry.getUser() != null) {
            Optional<Advertiser> existing = advertiserRepository.findAll().stream()
                    .filter(adv -> adv.getUser() != null && adv.getUser().getId().equals(inquiry.getUser().getId()))
                    .findFirst();

            if (existing.isPresent()) {
                return; // 이미 광고주 계정이 존재하면 굳이 재생성하지 않고 리턴
            }
        }

        Advertiser advertiser = Advertiser.builder()
                .id(UUID.randomUUID().toString())
                .companyName(inquiry.getAdvertiser())
                .managerName(inquiry.getContactName())
                .managerEmail(inquiry.getContactEmail())
                .managerPhone(inquiry.getContactPhone())
                .status(AdvertiserStatus.PAUSED) // "대기중" (PAUSED) 상태로 설정
                .user(inquiry.getUser())
                .memo("광고 신청 승인 자동 생성 연동 (문의 ID: " + inquiry.getId() + ")")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        advertiserRepository.save(advertiser);
    }
}
