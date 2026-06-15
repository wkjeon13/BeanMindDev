package com.beanmind.curator.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "TodayPairingTranslation",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"pairingId", "languageCode"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodayPairingTranslation {

    @Id
    @Column(columnDefinition = "VARCHAR(191)")
    private String id;

    @Column(name = "pairingId", nullable = false, insertable = false, updatable = false)
    private String pairingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pairingId", nullable = false)
    private TodayPairing pairing;

    @Column(name = "languageCode", nullable = false)
    private String languageCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String coffee;

    @Column(name = "`desc`", nullable = false, columnDefinition = "TEXT") // Escape desc keyword in SQL if needed, but Jpa handles it
    private String desc;

    private String season;

    @Column(name = "tasteProfile")
    private String tasteProfile;
}
