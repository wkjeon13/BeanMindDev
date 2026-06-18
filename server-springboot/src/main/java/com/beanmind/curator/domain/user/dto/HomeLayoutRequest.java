package com.beanmind.curator.domain.user.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HomeLayoutRequest {
    private List<String> layout;
}
