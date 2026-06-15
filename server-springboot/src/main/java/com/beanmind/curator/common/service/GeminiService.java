package com.beanmind.curator.common.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String apiKey;

    public GeminiService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
        this.objectMapper = objectMapper;
    }

    /**
     * General content generation
     */
    public Mono<String> generateContent(String model, String prompt, Double temperature, String responseMimeType, boolean useGoogleMapsTool) {
        return Mono.defer(() -> {
            try {
                ObjectNode requestBody = objectMapper.createObjectNode();
                
                // Contents
                ArrayNode contents = requestBody.putArray("contents");
                ObjectNode contentObj = contents.addObject();
                ArrayNode parts = contentObj.putArray("parts");
                parts.addObject().put("text", prompt);

                // Generation Config
                ObjectNode generationConfig = requestBody.putObject("generationConfig");
                if (temperature != null) {
                    generationConfig.put("temperature", temperature);
                }
                if (responseMimeType != null) {
                    generationConfig.put("responseMimeType", responseMimeType);
                }

                // Tools
                if (useGoogleMapsTool) {
                    ArrayNode tools = requestBody.putArray("tools");
                    tools.addObject().putObject("googleMaps");
                }

                return webClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/v1beta/models/" + model + ":generateContent")
                                .queryParam("key", apiKey)
                                .build())
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(requestBody)
                        .retrieve()
                        .bodyToMono(String.class)
                        .map(this::extractTextFromResponse)
                        .onErrorResume(e -> {
                            System.err.println("Gemini API Error: " + e.getMessage());
                            return Mono.error(new RuntimeException("Failed to generate content from Gemini", e));
                        });

            } catch (Exception e) {
                return Mono.error(e);
            }
        });
    }

    /**
     * Overloaded method for standard generation
     */
    public Mono<String> generateContent(String model, String prompt, Double temperature) {
        return generateContent(model, prompt, temperature, null, false);
    }

    /**
     * Proxy stream call (SSE)
     */
    public Flux<String> streamCurationProxy(String model, String rawRequestBody) {
        return webClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/v1beta/models/" + model + ":streamGenerateContent")
                        .queryParam("alt", "sse")
                        .queryParam("key", apiKey)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(rawRequestBody)
                .retrieve()
                .bodyToFlux(String.class)
                .onErrorResume(e -> {
                    System.err.println("Gemini Streaming API Error: " + e.getMessage());
                    return Flux.error(new RuntimeException("Gemini streaming failed", e));
                });
    }

    private String extractTextFromResponse(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText();
                }
            }
            return "";
        } catch (Exception e) {
            System.err.println("Failed to parse Gemini response: " + e.getMessage());
            return "";
        }
    }
}
