package com.beanmind.curator.domain.point.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class PointResponse {
    private Integer balance;
    private List<PointTransactionDto> history;
}
