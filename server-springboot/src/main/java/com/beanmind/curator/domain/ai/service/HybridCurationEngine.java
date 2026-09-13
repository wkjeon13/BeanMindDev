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
        private Boolean isDecaf;
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
                .acidity(5).body(2).sweetness(4).bitterness(1).isDecaf(false)
                .flavorNotes(List.of("Lemon", "Floral", "Bergamot", "Jasmine", "Citrus"))
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
                .acidity(2).body(4).sweetness(4).bitterness(3).isDecaf(false)
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
                .acidity(3).body(3).sweetness(5).bitterness(2).isDecaf(false)
                .flavorNotes(List.of("Caramel", "Orange", "Nutty", "Citrus"))
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
                .acidity(2).body(5).sweetness(3).bitterness(4).isDecaf(false)
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
                .acidity(5).body(3).sweetness(5).bitterness(1).isDecaf(false)
                .flavorNotes(List.of("Lychee", "Peach", "Yogurt", "Floral", "Berry"))
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
                .acidity(1).body(5).sweetness(2).bitterness(5).isDecaf(false)
                .flavorNotes(List.of("Earthy", "Herbal", "Dark Chocolate"))
                .description("Heavy-bodied and low-acid with unique earthy profile.")
                .brewingGuide("Bold, punchy cup. Use 93°C water.")
                .foodPairing(List.of(
                        Map.of("name", "Tiramisu", "type", "Cake", "description", "Bold Sumatra profile matches coffee layers.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("kenya-aa")
                .name("Kenya AA Nyeri Washed")
                .origin("Kenya").region("Nyeri").processing("Washed").roastLevel("Light")
                .acidity(5).body(4).sweetness(4).bitterness(2).isDecaf(false)
                .flavorNotes(List.of("Blackcurrant", "Grapefruit", "Berry", "Citrus"))
                .description("Complex winey acidity with rich blackcurrant and grapefruit notes.")
                .brewingGuide("Drip brew at 92°C with 1:16 ratio.")
                .foodPairing(List.of(
                        Map.of("name", "Berry Tart", "type", "Dessert", "description", "Tart berries elevate blackcurrant acidity.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("costa-rica-tarrazu")
                .name("Costa Rica Tarrazu Honey")
                .origin("Costa Rica").region("Tarrazu").processing("Honey").roastLevel("Medium")
                .acidity(4).body(3).sweetness(4).bitterness(2).isDecaf(false)
                .flavorNotes(List.of("Apple", "Honey", "Citrus", "Nutty"))
                .description("Sweet and crisp with honey-like body and vibrant apple acidity.")
                .brewingGuide("Best brewed with Kalita Wave at 91°C.")
                .foodPairing(List.of(
                        Map.of("name", "Apple Pie", "type", "Cake", "description", "Apple acidity matches warm apple sweetness.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("decaf-colombia")
                .name("Colombia Swiss Water Decaf")
                .origin("Colombia").region("Antioquia").processing("Swiss Water").roastLevel("Medium")
                .acidity(2).body(3).sweetness(4).bitterness(2).isDecaf(true)
                .flavorNotes(List.of("Sugar Cane", "Cocoa", "Vanilla", "Caramel"))
                .description("Chemical-free decaf offering sweet cocoa and sugar cane flavors.")
                .brewingGuide("Brew at 90°C for a soothing evening cup.")
                .foodPairing(List.of(
                        Map.of("name", "Vanilla Cookie", "type", "Cookie", "description", "Complements smooth decaf sweet notes.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("ethiopia-sidamo")
                .name("Ethiopia Sidamo Natural G1")
                .origin("Ethiopia").region("Sidamo").processing("Natural").roastLevel("Light")
                .acidity(4).body(3).sweetness(5).bitterness(1).isDecaf(false)
                .flavorNotes(List.of("Berry", "Peach", "Jasmine", "Floral"))
                .description("Sweet strawberry and blueberry aromas with delicate jasmine notes.")
                .brewingGuide("Aeropress or V60 at 89°C.")
                .foodPairing(List.of(
                        Map.of("name", "Strawberry Shortcake", "type", "Cake", "description", "Berry notes harmonize with cake sweetness.")
                ))
                .build());

        BEAN_CATALOG.add(CoffeeBeanDto.builder()
                .id("panama-geisha")
                .name("Panama Boquete Geisha Washed")
                .origin("Panama").region("Boquete").processing("Washed").roastLevel("Light")
                .acidity(5).body(2).sweetness(5).bitterness(1).isDecaf(false)
                .flavorNotes(List.of("Jasmine", "Bergamot", "Mango", "Floral", "Citrus"))
                .description("Ultra-premium specialty coffee with intoxicating floral and tropical fruit elegance.")
                .brewingGuide("Careful drip extraction at 90°C.")
                .foodPairing(List.of(
                        Map.of("name", "Fruit Tart", "type", "Dessert", "description", "Tropical notes match tropical fruit tart.")
                ))
                .build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("fritz-coffee").name("Fritz Coffee Company")
                .beans(List.of("colombia-huila", "ethiopia-yirgacheffe", "brazil-cerrado"))
                .website("https://fritz.co.kr")
                .description("Premier Korean roastery celebrated for retro aesthetics and championship roasts.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("blue-bottle").name("Blue Bottle Coffee")
                .beans(List.of("ethiopia-yirgacheffe", "costa-rica-tarrazu", "panama-geisha"))
                .website("https://bluebottlecoffee.com")
                .description("Third-wave coffee leader focusing on delicate profiles.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("starbucks").name("Starbucks Reserve")
                .beans(List.of("brazil-cerrado", "guatemala-antigua", "decaf-colombia"))
                .website("https://starbucks.com")
                .description("Global coffee brand with premium single-origin roasts.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("momos-coffee").name("Momos Coffee")
                .beans(List.of("el-paraiso-anaerobic", "ethiopia-sidamo", "kenya-aa"))
                .website("https://momoscoffee.com")
                .description("Renowned Korean specialty roastery.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("terarosa").name("Terarosa Coffee")
                .beans(List.of("kenya-aa", "ethiopia-sidamo", "colombia-huila"))
                .website("https://terarosa.com")
                .description("Pioneer specialty coffee roaster from Gangneung, Korea.").build());

        BRAND_CATALOG.add(BrandDto.builder()
                .id("peets-coffee").name("Peet's Coffee")
                .beans(List.of("indonesia-mandheling", "guatemala-antigua"))
                .website("https://peets.com")
                .description("Pioneer of dark roasting.").build());
    }

    /**
     * Advanced Multi-Factor Mathematical Scoring & Selection
     */
    public RecommendationResult calculateTop3Recommendations(Map<String, Object> prefs) {
        double targetAcidity = getDouble(prefs, "tasteAcidity", 3.0);
        double targetSweetness = getDouble(prefs, "tasteSweetness", 3.0);
        double targetBitterness = getDouble(prefs, "tasteBitterness", 3.0);
        double targetBody = getDouble(prefs, "tasteBody", 3.0);

        String targetRoast = (String) prefs.getOrDefault("roastLevel", "Medium");
        String targetCaffeine = (String) prefs.getOrDefault("caffeine", "Regular");
        String condition = (String) prefs.getOrDefault("condition", "Normal");
        String weather = (String) prefs.getOrDefault("weather", "Sunny");

        List<String> targetFlavorNotes = extractFlavorNotes(prefs.get("flavorNotes"));

        // Preference Intensity Weighting (Extreme preferences carry higher weight)
        double wAcidity = 1.0 + (Math.abs(targetAcidity - 3.0) * 0.4);
        double wSweetness = 1.0 + (Math.abs(targetSweetness - 3.0) * 0.3);
        double wBitterness = 1.0 + (Math.abs(targetBitterness - 3.0) * 0.3);
        double wBody = 1.0 + (Math.abs(targetBody - 3.0) * 0.4);

        if ("Rainy".equalsIgnoreCase(weather) || "Tired".equalsIgnoreCase(condition)) {
            wBody *= 1.3;
        } else if ("Hot".equalsIgnoreCase(weather) || "Refresh".equalsIgnoreCase(condition)) {
            wAcidity *= 1.3;
        }

        final double finalWAcidity = wAcidity;
        final double finalWSweetness = wSweetness;
        final double finalWBitterness = wBitterness;
        final double finalWBody = wBody;

        List<ScoredBean> scored = BEAN_CATALOG.stream().map(bean -> {
            // 1. Taste Profile Distance with Weighted Dimensions
            double dAcidity = (bean.getAcidity() - targetAcidity) * finalWAcidity;
            double dSweetness = (bean.getSweetness() - targetSweetness) * finalWSweetness;
            double dBitterness = (bean.getBitterness() - targetBitterness) * finalWBitterness;
            double dBody = (bean.getBody() - targetBody) * finalWBody;

            double score = (dAcidity * dAcidity) + (dSweetness * dSweetness) + (dBitterness * dBitterness) + (dBody * dBody);

            // 2. Roast Level Matching / Penalty
            if (targetRoast != null && !targetRoast.isEmpty()) {
                if (targetRoast.equalsIgnoreCase(bean.getRoastLevel())) {
                    score -= 3.0; // Strong bonus for exact roast match!
                } else if (("Light".equalsIgnoreCase(targetRoast) && "Dark".equalsIgnoreCase(bean.getRoastLevel())) ||
                           ("Dark".equalsIgnoreCase(targetRoast) && "Light".equalsIgnoreCase(bean.getRoastLevel()))) {
                    score += 8.0; // Heavy penalty for extreme roast mismatch!
                } else {
                    score += 2.0;
                }
            }

            // 3. Caffeine Match / Decaf Penalty
            if ("Decaf".equalsIgnoreCase(targetCaffeine) || "Decaffeinated".equalsIgnoreCase(targetCaffeine)) {
                if (!Boolean.TRUE.equals(bean.getIsDecaf())) {
                    score += 25.0; // Massive penalty if decaf requested but bean is caffeine
                } else {
                    score -= 10.0; // Huge bonus for matching decaf
                }
            } else {
                if (Boolean.TRUE.equals(bean.getIsDecaf())) {
                    score += 5.0; // Mild penalty for decaf when regular requested
                }
            }

            // 4. Flavor Notes Match Bonus
            if (!targetFlavorNotes.isEmpty() && bean.getFlavorNotes() != null) {
                for (String note : targetFlavorNotes) {
                    for (String beanNote : bean.getFlavorNotes()) {
                        if (beanNote.equalsIgnoreCase(note) || note.toLowerCase().contains(beanNote.toLowerCase())) {
                            score -= 2.5; // Reduce score for each matching flavor tag!
                        }
                    }
                }
            }

            return new ScoredBean(bean, score);
        }).sorted(Comparator.comparingDouble(a -> a.score)).collect(Collectors.toList());

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

    private List<String> extractFlavorNotes(Object obj) {
        if (obj == null) return List.of();
        if (obj instanceof List) {
            return ((List<?>) obj).stream().map(Object::toString).collect(Collectors.toList());
        }
        if (obj instanceof String) {
            String str = (String) obj;
            if (str.isEmpty()) return List.of();
            return Arrays.stream(str.split(",")).map(String::trim).collect(Collectors.toList());
        }
        return List.of();
    }

    private BrandDto findBrandForBean(String beanId, int fallbackIndex) {
        return BRAND_CATALOG.stream()
                .filter(b -> b.getBeans().contains(beanId))
                .findFirst()
                .orElse(BRAND_CATALOG.get(fallbackIndex % BRAND_CATALOG.size()));
    }

    private static class ScoredBean {
        final CoffeeBeanDto bean;
        final double score;
        ScoredBean(CoffeeBeanDto bean, double score) {
            this.bean = bean;
            this.score = score;
        }
    }

    private double getDouble(Map<String, Object> map, String key, double defaultValue) {
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val instanceof String) {
            try { return Double.parseDouble((String) val); } catch (Exception e) {}
        }
        return defaultValue;
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
