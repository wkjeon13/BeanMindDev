package com.beanmind.curator.config;

import com.beanmind.curator.security.JwtAuthenticationFilter;
import com.beanmind.curator.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll() // Permit preflight
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/**").permitAll() // Open authentication paths
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/shops/**").permitAll() // Allow public shop searches
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/community/**").permitAll() // Allow guest reads for posts & announcements
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/clubs", "/api/clubs/**").permitAll() // Allow guest reads for clubs
                .requestMatchers("/api/ads/**").permitAll() // Allow guest views and tracking for ads
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/reward-tiers").permitAll() // Allow public reward tier views
                .requestMatchers("/api/analytics/**").permitAll() // Allow visitor logs
                .requestMatchers("/uploads/**").permitAll() // Allow static uploads access
                .requestMatchers("/api/compliance/policies/active", "/api/compliance/request").permitAll() // Allow public compliance paths
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/retention/**").permitAll() // Allow public retention/flash-drops
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/home/**").permitAll() // Allow guest home personalized feeds
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll() // Swagger UI & docs paths
                .anyRequest().authenticated() // Protect all other routes
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService),
                    UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        
        configuration.setAllowedOriginPatterns(java.util.List.of(
            "http://localhost*",
            "https://localhost*",
            "http://127.0.0.1*",
            "https://127.0.0.1*",
            "http://*.beanmindcurator.com*",
            "https://*.beanmindcurator.com*",
            "https://appleid.apple.com*",
            "capacitor://localhost",
            "ionic://localhost"
        ));
        
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"));
        configuration.setAllowedHeaders(java.util.List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
