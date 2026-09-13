package com.beanmind.curator.domain.ai.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class HybridCurationEngine {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoffeeBeanDto {
        private String id;
        private String name;
        private String origin;
        private String region;
        private String processing;
        private String roastLevel;
        private Integer acidity;
        private Integer body;
        private Integer sweetness;
        private Integer bitterness;
        private List<String> flavorNotes;
        private String description;
        private String brewingGuide;
        private List<Map<String, String>> foodPairing;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BrandDto {
        private String id;
        private String name;
        private List<String> beans;
        private String website;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationResult {
        private Map<String, Object> matchRec;
        private List<Map<String, Object>> subRecs;
        private List<CoffeeBeanDto> top3Beans;
    }

    private static final List<CoffeeBeanDto> BEAN_CATALOG = new ArrayList<>();
    private static final List<BrandDto> BRAND_CATALOG = new ArrayList<>();

    static {
        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("ethiopia-yirgacheffe")
                .name("Ethiopia Yirgacheffe G1 Washed")
                .origin("Ethiopia").region("Yirgacheffe").processing("Washed").roastLevel("Light")
                .acidity(5).body(2).sweetness(4).bitterness(1)
                .flavorNotes(List.of("Lemon", "Floral", "Bergamot", "Jasmine"))
                .description("Bright, tea-like acidity and intense floral aroma.")
                .brewingGuide("Best brewed with Hario V60 at 92°C with a 1:15 ratio.")
                .foodPairing(List.of(
                        Map.of("name", "Lemon Tart", "type", "Dessert", "description", "Bright citrus notes complement the lemon."),
                        Map.of("name", "Butter Croissant", "type", "Bread", "description", "Flaky texture balances the tea-like body.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("brazil-cerrado")
                .name("Brazil Cerrado NY2")
                .origin("Brazil").region("Cerrado").processing("Natural").roastLevel("Medium")
                .acidity(2).body(4).sweetness(4).bitterness(3)
                .flavorNotes(List.of("Chocolate", "Nutty", "Caramel"))
                .description("Balanced and approachable coffee with low acidity and heavy chocolate finish.")
                .brewingGuide("Excellent for both espresso and drip. Try 90°C.")
                .foodPairing(List.of(
                        Map.of("name", "Chocolate Brownie", "type", "Cake", "description", "Enhances chocolatey and nutty profile."),
                        Map.of("name", "Almond Biscotti", "type", "Cookie", "description", "Nutty flavor pairs with coffee body.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("colombia-huila")
                .name("Colombia Huila Supremo")
                .origin("Colombia").region("Huila").processing("Washed").roastLevel("Medium")
                .acidity(3).body(3).sweetness(5).bitterness(2)
                .flavorNotes(List.of("Caramel", "Orange", "Nutty"))
                .description("Sweet, clean, and versatile mild specialty coffee.")
                .brewingGuide("Works well with any brewing method at 91°C.")
                .foodPairing(List.of(
                        Map.of("name", "Orange Pound Cake", "type", "Cake", "description", "Matches citrus acidity."),
                        Map.of("name", "Salted Caramel Cookie", "type", "Cookie", "description", "Complements natural sweetness.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("guatemala-antigua")
                .name("Guatemala Antigua Pastoral")
                .origin("Guatemala").region("Antigua").processing("Washed").roastLevel("Dark")
                .acidity(2).body(5).sweetness(3).bitterness(4)
                .flavorNotes(List.of("Smoky", "Dark Chocolate", "Spice"))
                .description("Grown in volcanic soil with smoky aroma and rich chocolate depth.")
                .brewingGuide("Great for French Press or Moka Pot.")
                .foodPairing(List.of(
                        Map.of("name", "Dark Chocolate Ganache", "type", "Dessert", "description", "Pairs with smoky chocolate notes."),
                        Map.of("name", "Cinnamon Roll", "type", "Bread", "description", "Spice matches cinnamon warmth.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("el-paraiso-anaerobic")
                .name("Colombia El Paraiso Lychee Anaerobic")
                .origin("Colombia").region("Cauca").processing("Anaerobic").roastLevel("Light")
                .acidity(5).body(3).sweetness(5).bitterness(1)
                .flavorNotes(List.of("Lychee", "Peach", "Yogurt", "Floral"))
                .description("Explosive flavor profile created by double anaerobic fermentation.")
                .brewingGuide("Brew with coarser grind at 88-90°C.")
                .foodPairing(List.of(
                        Map.of("name", "Peach Macaron", "type", "Cookie", "description", "Peach flavor mirrors notes."),
                        Map.of("name", "Cheesecake", "type", "Cake", "description", "Creamy texture pairs with yogurt acidity.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("indonesia-mandheling")
                .name("Indonesia Sumatra Mandheling G1")
                .origin("Indonesia").region("Sumatra").processing("Natural").roastLevel("Dark")
                .acidity(1).body(5).sweetness(2).bitterness(5)
                .flavorNotes(List.of("Earthy", "Herbal", "Dark Chocolate"))
                .description("Heavy-bodied and low-acid with unique earthy profile.")
                .brewingGuide("Bold, punchy cup. Use 93°C water.")
                .foodPairing(List.of(
                        Map.of("name", "Tiramisu", "type", "Cake", "description", "Bold Sumatra profile matches coffee layers.")
                ))
                .build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("blue-bottle").name("Blue Bottle Coffee")
                .beans(List.of("ethiopia-yirgacheffe", "colombia-huila"))
                .website("https://bluebottlecoffee.com")
                .description("Third-wave coffee leader focusing on delicate profiles.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("starbucks").name("Starbucks")
                .beans(List.of("brazil-cerrado", "guatemala-antigua"))
                .website("https://starbucks.com")
                .description("Global coffee brand with consistent roasts.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("momos-coffee").name("Momos Coffee")
                .beans(List.of("el-paraiso-anaerobic", "ethiopia-yirgacheffe"))
                .website("https://momoscoffee.com")
                .description("Renowned Korean specialty roastery.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("peets-coffee").name("Peet's Coffee")
                .beans(List.of("indonesia-mandheling", "guatemala-antigua"))
                .website("https://peets.com")
                .description("Pioneer of dark roasting.").build());
    }

    /**
     * Tier 1 Mathematical Scoring & Top 3 Bean Selection (Zero Cost)
     */
    public RecommendationResult calculateTop3Recommendations(Map<String, Object> prefs) {
        int targetAcidity = getInt(prefs, "tasteAcidity", 3);
        int targetSweetness = getInt(prefs, "tasteSweetness", 3);
        int targetBitterness = getInt(prefs, "tasteBitterness", 3);
        int targetBody = getInt(prefs, "tasteBody", 3);

        String condition = (String) prefs.getOrDefault("condition", "Normal");
        String weather = (String) prefs.getOrDefault("weather", "Sunny");

        // Environmental weights
        double wAcidity = 1.0;
        double wBody = 1.0;

        if ("Rainy".equalsIgnoreCase(weather) || "Tired".equalsIgnoreCase(condition)) {
            wBody = 1.3; // Prefer heavier body when rainy or tired
        } else if ("Hot".equalsIgnoreCase(weather) || "Refresh".equalsIgnoreCase(condition)) {
            wAcidity = 1.3; // Prefer higher acidity when hot
        }

        final double finalWAcidity = wAcidity;
        final double finalWBody = wBody;

        List<ScoredBean> scored = BEAN_CATALOG.stream().map(bean -> {
            double dAcidity = (bean.getAcidity() - targetAcidity) * finalWAcidity;
            double dSweetness = bean.getSweetness() - targetSweetness;
            double dBitterness = bean.getBitterness() - targetBitterness;
            double dBody = (bean.getBody() - targetBody) * finalWBody;

            double distance = (dAcidity * dAcidity) + (dSweetness * dSweetness) + (dBitterness * dBitterness) + (dBody * dBody);
            return new ScoredBean(bean, distance);
        }).sorted(Comparator.comparingDouble(a -> a.distance)).collect(Collectors.toList());

        CoffeeBeanDto top1 = scored.get(0).bean;
        CoffeeBeanDto top2 = scored.size() > 1 ? scored.get(1).bean : top1;
        CoffeeBeanDto top3 = scored.size() > 2 ? scored.get(2).bean : top1;

        BrandDto brand1 = findBrandForBean(top1.getId(), 0);
        BrandDto brand2 = findBrandForBean(top2.getId(), 1);
        BrandDto brand3 = findBrandForBean(top3.getId(), 2);

        Map<String, Object> matchRec = Map.of("bean", top1, "brand", brand1);
        List<Map<String, Object>> subRecs = List.of(
                Map.of("bean", top2, "brand", brand2),
                Map.of("bean", top3, "brand", brand3)
        );

        return RecommendationResult.builder()
                .matchRec(matchRec)
                .subRecs(subRecs)
                .top3Beans(List.of(top1, top2, top3))
                .build();
    }

    private BrandDto findBrandForBean(String beanId, int fallbackIndex) {
        return BRAND_CATALOG.stream()
                .filter(b -> b.getBeans().contains(beanId))
                .findFirst()
                .orElse(BRAND_CATALOG.get(fallbackIndex % BRAND_CATALOG.size()));
    }

    private static class ScoredBean {
        final CoffeeBeanDto bean;
        final double distance;
        ScoredBean(CoffeeBeanDto bean, double distance) {
            this.bean = bean;
            this.distance = distance;
        }
    }

    private int getInt(Map<String, Object> map, String key, int defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        if (val instanceof String) {
            try { return Integer.parseInt((String) val); } catch (Exception e) {}
        }
        return defaultValue;
    }
}
