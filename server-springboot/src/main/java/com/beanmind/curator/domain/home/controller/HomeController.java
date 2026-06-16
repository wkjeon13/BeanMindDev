package com.beanmind.curator.domain.home.controller;

import com.beanmind.curator.domain.home.dto.PersonalizedHomeResponse;
import com.beanmind.curator.domain.home.service.HomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/home")
@RequiredArgsConstructor
public class HomeController {

    private final HomeService homeService;

    @GetMapping("/personalized")
    public ResponseEntity<PersonalizedHomeResponse> getPersonalizedHome(
            @RequestParam(value = "countryCode", required = false) String countryCode,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lng", required = false) Double lng,
            Principal principal) {
        
        String email = principal != null ? principal.getName() : null;
        PersonalizedHomeResponse response = homeService.getPersonalizedHome(countryCode, lat, lng, email);
        return ResponseEntity.ok(response);
    }
}
