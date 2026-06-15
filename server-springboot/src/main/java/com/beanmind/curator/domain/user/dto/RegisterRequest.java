package com.beanmind.curator.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "이메일은 필수 입력값입니다.")
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "비밀번호는 필수 입력값입니다.")
    private String password;

    @NotBlank(message = "닉네임은 필수 입력값입니다.")
    private String nickname;

    private String role;
    private String ageGroup;
    private String gender;
    private String favoriteCafe;
    private String countryCode;
    private String preferredLanguage;

    private String privacyPolicyVersion;
    private String termsOfServiceVersion;
}
