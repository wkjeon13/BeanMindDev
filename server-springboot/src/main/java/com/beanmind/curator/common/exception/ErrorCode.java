package com.beanmind.curator.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Auth & Identity
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "ERR_UNAUTHORIZED", "인증 정보가 올바르지 않습니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "ERR_INVALID_TOKEN", "유효하지 않은 토큰입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_USER_NOT_FOUND", "사용자를 찾을 수 없습니다."),
    MISSING_AUTH_HEADER(HttpStatus.BAD_REQUEST, "ERR_MISSING_AUTH_HEADER", "인증 헤더가 누락되었습니다."),
    PASSWORD_INVALID(HttpStatus.BAD_REQUEST, "ERR_PASSWORD_INVALID", "비밀번호가 올바르지 않습니다."),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "ERR_EMAIL_ALREADY_EXISTS", "이미 존재하는 이메일입니다."),
    ACCOUNT_LOCKED(HttpStatus.FORBIDDEN, "ERR_ACCOUNT_LOCKED", "계정이 잠겼습니다. 나중에 다시 시도해 주세요."),
    NICKNAME_REQUIRED(HttpStatus.BAD_REQUEST, "ERR_NICKNAME_REQUIRED", "닉네임은 필수입니다."),
    SOCIAL_LOGIN_CANT_CHANGE_PW(HttpStatus.BAD_REQUEST, "ERR_SOCIAL_LOGIN_CANT_CHANGE_PW", "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다."),
    PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "ERR_PASSWORD_MISMATCH", "비밀번호가 일치하지 않습니다."),
    PASSWORD_SAME_AS_OLD(HttpStatus.BAD_REQUEST, "ERR_PASSWORD_SAME_AS_OLD", "새 비밀번호는 기존 비밀번호와 달라야 합니다."),
    INVALID_VERIFICATION_CODE(HttpStatus.BAD_REQUEST, "ERR_INVALID_VERIFICATION_CODE", "유효하지 않거나 만료된 인증 코드입니다."),
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "ERR_LOGIN_FAILED", "로그인에 실패했습니다."),

    // Points & Credits
    INSUFFICIENT_BEANS(HttpStatus.BAD_REQUEST, "ERR_INSUFFICIENT_BEANS", "보유한 원두가 부족합니다."),
    DAILY_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "ERR_DAILY_LIMIT_EXCEEDED", "일일 한도를 초과했습니다."),
    INVALID_POINT_AMOUNT(HttpStatus.BAD_REQUEST, "ERR_INVALID_POINT_AMOUNT", "올바르지 않은 포인트 금액입니다."),
    CANNOT_REWARD_YOURSELF(HttpStatus.BAD_REQUEST, "ERR_CANNOT_REWARD_YOURSELF", "자기 자신에게 후원할 수 없습니다."),

    // Validation & Params
    MISSING_REQUIRED_FIELDS(HttpStatus.BAD_REQUEST, "ERR_MISSING_REQUIRED_FIELDS", "필수 입력 항목이 누락되었습니다."),
    INVALID_DATA_FORMAT(HttpStatus.BAD_REQUEST, "ERR_INVALID_DATA_FORMAT", "올바르지 않은 데이터 형식입니다."),
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "ERR_BAD_REQUEST", "잘못된 요청입니다."),
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "ERR_TOO_MANY_REQUESTS", "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해 주세요."),
    ALREADY_IN_COLLECTION(HttpStatus.CONFLICT, "ERR_ALREADY_IN_COLLECTION", "이미 컬렉션에 추가된 항목입니다."),

    // Resources & AI & Shops
    PRESCRIPTION_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_PRESCRIPTION_NOT_FOUND", "처방전을 찾을 수 없습니다."),
    STORE_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_STORE_NOT_FOUND", "매장을 찾을 수 없습니다."),
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_REVIEW_NOT_FOUND", "리뷰를 찾을 수 없습니다."),
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_POST_NOT_FOUND", "게시글을 찾을 수 없습니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다."),
    AI_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "ERR_AI_GENERATION_FAILED", "AI 생성에 실패했습니다."),
    AI_RATE_LIMIT(HttpStatus.TOO_MANY_REQUESTS, "ERR_AI_RATE_LIMIT", "AI 사용 제한을 초과했습니다."),
    ROUTING_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "ERR_ROUTING_FAILED", "라우팅에 실패했습니다."),
    UNAUTHORIZED_ACTION(HttpStatus.FORBIDDEN, "ERR_UNAUTHORIZED_ACTION", "해당 작업을 수행할 권한이 없습니다."),
    STORE_RESUBMIT_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "ERR_STORE_RESUBMIT_NOT_ALLOWED", "매장 정보 재제출이 허용되지 않습니다."),
    MAX_APPROVAL_REQUESTS(HttpStatus.BAD_REQUEST, "ERR_MAX_APPROVAL_REQUESTS", "최대 승인 요청 횟수를 초과했습니다."),

    // Pilgrimage
    STORE_NOT_MAPPED(HttpStatus.BAD_REQUEST, "ERR_STORE_NOT_MAPPED", "매장 매핑 정보가 존재하지 않습니다."),
    GPS_MISSING(HttpStatus.BAD_REQUEST, "ERR_GPS_MISSING", "위치 정보(GPS)가 필요합니다."),
    ALREADY_CHECKED_IN(HttpStatus.CONFLICT, "ERR_ALREADY_CHECKED_IN", "이미 체크인한 매장입니다."),
    BADGE_NOT_OWNED(HttpStatus.BAD_REQUEST, "ERR_BADGE_NOT_OWNED", "보유하지 않은 뱃지입니다."),
    STORE_TOO_FAR(HttpStatus.BAD_REQUEST, "ERR_STORE_TOO_FAR", "매장과의 거리가 너무 멉니다."),

    // Admin & Sponsorship
    SUPER_ADMIN_REQUIRED(HttpStatus.FORBIDDEN, "ERR_SUPER_ADMIN_REQUIRED", "최고 관리자 권한이 필요합니다."),
    AD_NOT_APPROVED(HttpStatus.BAD_REQUEST, "ERR_AD_NOT_APPROVED", "승인되지 않은 광고입니다."),
    AD_NOT_FOUND(HttpStatus.NOT_FOUND, "ERR_AD_NOT_FOUND", "광고를 찾을 수 없습니다."),
    ADVERTISER_EXISTS(HttpStatus.CONFLICT, "ERR_ADVERTISER_EXISTS", "이미 광고주로 등록된 계정입니다."),

    // Generic Internal
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "ERR_INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."),
    DB_CONNECTION_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "ERR_DB_CONNECTION_ERROR", "데이터베이스 연결에 실패했습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
