package com.beanmind.curator.domain.tastetest.repository;

import com.beanmind.curator.domain.tastetest.entity.TasteTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TasteTestRepository extends JpaRepository<TasteTest, String> {
    Optional<TasteTest> findByIsActiveTrue();
}
