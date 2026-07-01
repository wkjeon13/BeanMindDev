package com.beanmind.curator.domain.tastetest.dto;

import com.beanmind.curator.domain.store.dto.ShopResponse;
import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TasteTestSubmissionResponse {
    private TasteTestResponse.ResultDto result;
    private Integer userAcidity;
    private Integer userSweetness;
    private Integer userBitterness;
    private Integer userBody;
    private List<ShopResponse> recommendedShops;
}
