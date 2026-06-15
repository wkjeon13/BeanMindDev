package com.beanmind.curator.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LanguageRequest {
    @NotBlank(message = "언어 설정은 필수입니다.")
    private String preferredLanguage;
}
