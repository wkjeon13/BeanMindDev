package com.beanmind.curator.domain.user.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TasteRequest {
    private Double prefAcidity;
    private Double prefSweetness;
    private Double prefBody;
    private Double prefBitterness;
    private String prefAroma;
}
