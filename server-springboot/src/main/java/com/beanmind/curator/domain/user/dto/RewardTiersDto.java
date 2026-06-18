package com.beanmind.curator.domain.user.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardTiersDto {
    @NotBlank
    private String rewardTier1Name;

    @NotNull
    @Min(1)
    private Integer rewardTier1Amount;

    @NotBlank
    private String rewardTier2Name;

    @NotNull
    @Min(1)
    private Integer rewardTier2Amount;

    @NotBlank
    private String rewardTier3Name;

    @NotNull
    @Min(1)
    private Integer rewardTier3Amount;

    public static RewardTiersDto fromEntity(com.beanmind.curator.domain.user.entity.User user) {
        return RewardTiersDto.builder()
                .rewardTier1Name(user.getRewardTier1Name())
                .rewardTier1Amount(user.getRewardTier1Amount())
                .rewardTier2Name(user.getRewardTier2Name())
                .rewardTier2Amount(user.getRewardTier2Amount())
                .rewardTier3Name(user.getRewardTier3Name())
                .rewardTier3Amount(user.getRewardTier3Amount())
                .build();
    }
}
