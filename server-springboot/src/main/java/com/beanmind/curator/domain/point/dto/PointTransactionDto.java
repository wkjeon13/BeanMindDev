package com.beanmind.curator.domain.point.dto;

import com.beanmind.curator.domain.point.entity.PointTransaction;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PointTransactionDto {
    private String id;
    private String userId;
    private Integer amount;
    private String type;
    private String description;
    private LocalDateTime createdAt;

    public static PointTransactionDto from(PointTransaction pt) {
        if (pt == null) return null;
        return PointTransactionDto.builder()
                .id(pt.getId())
                .userId(pt.getUser().getId())
                .amount(pt.getAmount())
                .type(pt.getType())
                .description(pt.getDescription())
                .createdAt(pt.getCreatedAt())
                .build();
    }
}
