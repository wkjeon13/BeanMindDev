package com.beanmind.curator.domain.point.service;

import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.point.dto.EarnSpendResponse;
import com.beanmind.curator.domain.point.dto.PointResponse;
import com.beanmind.curator.domain.point.dto.PointTransactionDto;
import com.beanmind.curator.domain.point.entity.PaymentTransaction;
import com.beanmind.curator.domain.point.entity.PointTransaction;
import com.beanmind.curator.domain.point.repository.PaymentTransactionRepository;
import com.beanmind.curator.domain.point.repository.PointTransactionRepository;
import com.beanmind.curator.domain.post.entity.Comment;
import com.beanmind.curator.domain.post.entity.Post;
import com.beanmind.curator.domain.post.repository.CommentRepository;
import com.beanmind.curator.domain.post.repository.PostRepository;
import com.beanmind.curator.domain.store.entity.StoreReview;
import com.beanmind.curator.domain.store.repository.StoreReviewRepository;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PointService {

    private final PointTransactionRepository pointTransactionRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final StoreReviewRepository storeReviewRepository;

    @Transactional(readOnly = true)
    public PointResponse getPointBalanceAndHistory(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        List<PointTransaction> history = pointTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 20));
        List<PointTransactionDto> historyDtos = history.stream()
                .map(PointTransactionDto::from)
                .collect(Collectors.toList());

        return PointResponse.builder()
                .balance(user.getPointBalance())
                .history(historyDtos)
                .build();
    }

    @Transactional
    public EarnSpendResponse earnPoints(String userId, int amount, String description) {
        if (amount <= 0 || description == null || description.trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_DATA_FORMAT);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.setPointBalance(user.getPointBalance() + amount);
        userRepository.save(user);

        PointTransaction pt = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .amount(amount)
                .type("EARN")
                .description(description.trim())
                .build();
        PointTransaction savedPt = pointTransactionRepository.save(pt);

        return EarnSpendResponse.builder()
                .balance(user.getPointBalance())
                .transaction(PointTransactionDto.from(savedPt))
                .build();
    }

    @Transactional
    public EarnSpendResponse spendPoints(String userId, int amount, String description) {
        if (amount <= 0 || description == null || description.trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_DATA_FORMAT);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (user.getPointBalance() < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_BEANS, "Insufficient points.");
        }

        user.setPointBalance(user.getPointBalance() - amount);
        userRepository.save(user);

        PointTransaction pt = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .amount(-amount)
                .type("SPEND")
                .description(description.trim())
                .build();
        PointTransaction savedPt = pointTransactionRepository.save(pt);

        return EarnSpendResponse.builder()
                .balance(user.getPointBalance())
                .transaction(PointTransactionDto.from(savedPt))
                .build();
    }

    @Transactional
    public EarnSpendResponse chargePoints(String userId, int amount) {
        int finalAmount = amount <= 0 ? 1000 : amount;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        user.setPointBalance(user.getPointBalance() + finalAmount);
        userRepository.save(user);

        PointTransaction pt = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .amount(finalAmount)
                .type("CHARGE")
                .description(String.format("커피콩 %,d알 충전 완료", finalAmount))
                .build();
        PointTransaction savedPt = pointTransactionRepository.save(pt);

        return EarnSpendResponse.builder()
                .balance(user.getPointBalance())
                .transaction(PointTransactionDto.from(savedPt))
                .build();
    }

    @Transactional
    public EarnSpendResponse verifyIapCharge(String userId, int amount, String transactionId) {
        int finalAmount = amount <= 0 ? 1000 : amount;
        String finalTxId = (transactionId == null || transactionId.trim().isEmpty()) ? "mock-txn-" + System.currentTimeMillis() : transactionId.trim();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (paymentTransactionRepository.findByStoreTransactionId(finalTxId).isPresent()) {
            throw new CustomException(ErrorCode.INVALID_DATA_FORMAT, "Duplicate transaction");
        }

        // 1. Log Payment Transaction
        PaymentTransaction payment = PaymentTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .storeTransactionId(finalTxId)
                .amount(finalAmount)
                .platform("REVENUECAT_CAPACITOR")
                .productId("com.beanmind.beans." + finalAmount)
                .build();
        paymentTransactionRepository.save(payment);

        // 2. Grant point balance
        user.setPointBalance(user.getPointBalance() + finalAmount);
        userRepository.save(user);

        // 3. Log Point Transaction
        PointTransaction pt = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .amount(finalAmount)
                .type("IAP_CHARGE")
                .description(String.format("스토어 인앱결제 (%,d콩)", finalAmount))
                .build();
        PointTransaction savedPt = pointTransactionRepository.save(pt);

        return EarnSpendResponse.builder()
                .balance(user.getPointBalance())
                .transaction(PointTransactionDto.from(savedPt))
                .build();
    }

    @Transactional
    public EarnSpendResponse rewardPoints(String senderId, String targetUserId, int amount, String description, String targetType, String targetEntityId) {
        if (amount <= 0 || targetUserId == null || description == null || description.trim().isEmpty()) {
            throw new CustomException(ErrorCode.INVALID_DATA_FORMAT);
        }

        if (senderId.equals(targetUserId)) {
            throw new CustomException(ErrorCode.CANNOT_REWARD_YOURSELF);
        }

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        User receiver = userRepository.findById(targetUserId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND, "Receiver not found."));

        if (sender.getPointBalance() < amount) {
            throw new CustomException(ErrorCode.INSUFFICIENT_BEANS, "Insufficient points.");
        }

        // P2P fee calculation (0% fee assumed as default)
        double feePercent = 0.0;
        int feeAmount = (int) Math.floor(amount * (feePercent / 100.0));
        int netAmount = Math.max(0, amount - feeAmount);

        // 1. Deduct points from sender
        sender.setPointBalance(sender.getPointBalance() - amount);
        userRepository.save(sender);

        String senderDesc = feeAmount > 0
                ? String.format("보상 🎁: %s님에게 (%s) [수수료 %d콩 포함]", receiver.getNickname(), description, feeAmount)
                : String.format("보상 🎁: %s님에게 (%s)", receiver.getNickname(), description);

        PointTransaction senderPt = PointTransaction.builder()
                .id(UUID.randomUUID().toString())
                .user(sender)
                .amount(-amount)
                .type("REWARD_SENT")
                .description(senderDesc)
                .build();
        pointTransactionRepository.save(senderPt);

        // 2. Add points to receiver
        if (netAmount > 0) {
            receiver.setPointBalance(receiver.getPointBalance() + netAmount);
            userRepository.save(receiver);

            String receiverDesc = feeAmount > 0
                    ? String.format("보상 🎁: %s님으로부터 (%s) [수수료 %.1f%% 공제]", sender.getNickname(), description, feePercent)
                    : String.format("보상 🎁: %s님으로부터 (%s)", sender.getNickname(), description);

            PointTransaction receiverPt = PointTransaction.builder()
                    .id(UUID.randomUUID().toString())
                    .user(receiver)
                    .amount(netAmount)
                    .type("REWARD_RECEIVED")
                    .description(receiverDesc)
                    .build();
            pointTransactionRepository.save(receiverPt);
        }

        // 3. Sync earnedBeans in targetEntity
        if (StringUtils.hasText(targetType) && StringUtils.hasText(targetEntityId)) {
            String type = targetType.toUpperCase();
            if ("POST".equals(type)) {
                Post post = postRepository.findById(targetEntityId).orElse(null);
                if (post != null) {
                    post.setEarnedBeans(post.getEarnedBeans() + netAmount);
                    postRepository.save(post);
                }
            } else if ("COMMENT".equals(type)) {
                Comment comment = commentRepository.findById(targetEntityId).orElse(null);
                if (comment != null) {
                    comment.setEarnedBeans(comment.getEarnedBeans() + netAmount);
                    commentRepository.save(comment);
                }
            } else if ("REVIEW".equals(type)) {
                StoreReview review = storeReviewRepository.findById(targetEntityId).orElse(null);
                if (review != null) {
                    review.setEarnedBeans(review.getEarnedBeans() + netAmount);
                    storeReviewRepository.save(review);
                }
            }
        }

        return EarnSpendResponse.builder()
                .balance(sender.getPointBalance())
                .build();
    }
}
