package com.beanmind.curator.domain.tastetest.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTestSubmissionRequest {
    private List<Long> optionIds;
}
