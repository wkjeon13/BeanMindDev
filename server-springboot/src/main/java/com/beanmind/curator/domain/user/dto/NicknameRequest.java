package com.beanmind.curator.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NicknameRequest {
    @NotBlank(message = "닉네임은 필수입니다.")
    private String nickname;
}
