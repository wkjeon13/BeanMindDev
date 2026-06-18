package com.beanmind.curator.domain.user.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiEligibilityDto {
    private boolean eligible;
    private int cost;
    private int current;
    private int limit;
    private int pointBalance;
    private String error;
}
