package com.beanmind.curator.domain.user.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HomeLayoutRequest {
    private List<HomeSectionDto> layout;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HomeSectionDto {
        private String id;
        private String name;
        private Boolean isVisible;
        private Integer order;
        private Boolean isFixed;
    }
}
