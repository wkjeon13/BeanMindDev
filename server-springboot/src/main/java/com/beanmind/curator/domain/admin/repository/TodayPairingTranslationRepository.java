package com.beanmind.curator.domain.admin.repository;

import com.beanmind.curator.domain.admin.entity.TodayPairingTranslation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TodayPairingTranslationRepository extends JpaRepository<TodayPairingTranslation, String> {
    Optional<TodayPairingTranslation> findByPairingIdAndLanguageCode(String pairingId, String languageCode);
    void deleteByPairingIdAndLanguageCodeNotIn(String pairingId, List<String> languageCodes);
}
