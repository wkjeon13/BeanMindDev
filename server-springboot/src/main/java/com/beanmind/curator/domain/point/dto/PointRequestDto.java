package com.beanmind.curator.domain.point.dto;

import lombok.Data;

@Data
public class PointRequestDto {

    @Data
    public static class EarnSpend {
        private Integer amount;
        private String description;
    }

    @Data
    public static class Charge {
        private Integer amount;
    }

    @Data
    public static class VerifyIap {
        private Integer amount;
        private String transactionId;
    }

    @Data
    public static class Reward {
        private String targetUserId;
        private Integer amount;
        private String description;
        private String targetType; // POST, COMMENT, REVIEW
        private String targetEntityId;
    }
}
