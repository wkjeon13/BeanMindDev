package com.beanmind.curator.domain.compliance.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplianceRequestDto {
    private String requestEmail;
    private String requestType;
}
