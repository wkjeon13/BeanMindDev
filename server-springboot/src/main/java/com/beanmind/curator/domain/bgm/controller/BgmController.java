package com.beanmind.curator.domain.bgm.controller;

import com.beanmind.curator.common.dto.ApiResponse;
import com.beanmind.curator.common.exception.CustomException;
import com.beanmind.curator.common.exception.ErrorCode;
import com.beanmind.curator.domain.bgm.dto.BgmSongRequest;
import com.beanmind.curator.domain.bgm.dto.BgmThemeRequest;
import com.beanmind.curator.domain.bgm.dto.BgmThemeResponse;
import com.beanmind.curator.domain.bgm.service.BgmService;
import com.beanmind.curator.domain.user.entity.User;
import com.beanmind.curator.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class BgmController {

    private final BgmService bgmService;
    private final UserRepository userRepository;

    private User validateAdmin(UserDetails userDetails) {
        if (userDetails == null) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!"ADMIN".equals(user.getRole().name()) && !"MODERATOR".equals(user.getRole().name())) {
            throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
        }
        return user;
    }

    /**
     * 전체 BGM 테마 및 곡 목록 조회 (일반/비인증 유저 노출)
     */
    @GetMapping("/api/bgm/themes")
    public ApiResponse<List<BgmThemeResponse>> getAllThemes() {
        return ApiResponse.success(bgmService.getAllThemes());
    }

    /**
     * 관리자 전용: BGM 테마 등록
     */
    @PostMapping("/api/admin/bgm/themes")
    public ApiResponse<BgmThemeResponse> createTheme(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BgmThemeRequest request) {
        validateAdmin(userDetails);
        try {
            return ApiResponse.success(bgmService.createTheme(request));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("DUPLICATED_THEME", e.getMessage());
        }
    }

    /**
     * 관리자 전용: BGM 테마 정보 수정
     */
    @PutMapping("/api/admin/bgm/themes/{id}")
    public ApiResponse<BgmThemeResponse> updateTheme(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id,
            @RequestBody BgmThemeRequest request) {
        validateAdmin(userDetails);
        try {
            return ApiResponse.success(bgmService.updateTheme(id, request));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("NOT_FOUND", e.getMessage());
        }
    }

    /**
     * 관리자 전용: BGM 테마 삭제 (Cascade 처리로 곡들도 삭제됨)
     */
    @DeleteMapping("/api/admin/bgm/themes/{id}")
    public ApiResponse<Void> deleteTheme(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") String id) {
        validateAdmin(userDetails);
        try {
            bgmService.deleteTheme(id);
            return ApiResponse.success();
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("NOT_FOUND", e.getMessage());
        }
    }

    /**
     * 관리자 전용: 특정 BGM 테마에 곡 추가
     */
    @PostMapping("/api/admin/bgm/songs")
    public ApiResponse<BgmThemeResponse> addSong(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody BgmSongRequest request) {
        validateAdmin(userDetails);
        try {
            return ApiResponse.success(bgmService.addSongToTheme(request));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("NOT_FOUND", e.getMessage());
        }
    }

    /**
     * 관리자 전용: BGM 곡 개별 삭제
     */
    @DeleteMapping("/api/admin/bgm/songs/{id}")
    public ApiResponse<Void> deleteSong(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("id") Long id) {
        validateAdmin(userDetails);
        try {
            bgmService.deleteSong(id);
            return ApiResponse.success();
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("NOT_FOUND", e.getMessage());
        }
    }
}
