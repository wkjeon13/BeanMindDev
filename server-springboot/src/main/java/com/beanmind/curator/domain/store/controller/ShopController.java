package com.beanmind.curator.domain.store.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.domain.store.dto.ShopResponse;
import com.beanmind.curator.domain.store.dto.ShopSearchRequest;
import com.beanmind.curator.domain.store.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ShopResponse>>> searchShops(
            @ModelAttribute ShopSearchRequest request,
            Principal principal) {
        
        String email = principal != null ? principal.getName() : null;
        List<ShopResponse> responses = shopService.searchShops(request, email);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<ShopResponse>> getTrendingShops(
            @RequestParam(value = "countryCode", required = false) String countryCode,
            Principal principal) {
        String email = principal != null ? principal.getName() : null;
        List<ShopResponse> responses = shopService.getTrendingShops(countryCode, email);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopResponse>> getShopDetail(@PathVariable("id") String id) {
        ShopResponse response = shopService.getShopDetail(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
