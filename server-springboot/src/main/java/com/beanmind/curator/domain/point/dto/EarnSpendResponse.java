package com.beanmind.curator.domain.point.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EarnSpendResponse {
    private Integer balance;
    private PointTransactionDto transaction;
}
