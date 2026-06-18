package com.beanmind.curator.domain.user.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiUsageDto {
    private boolean success;
    private String type; // "free" or "paid"
    private int current;
    private int limit;
}
