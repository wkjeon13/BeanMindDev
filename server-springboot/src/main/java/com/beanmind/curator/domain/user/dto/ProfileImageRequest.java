package com.beanmind.curator.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProfileImageRequest {
    @NotBlank(message = "프로필 이미지 데이터가 필요합니다.")
    private String profileImageUrl;
}
