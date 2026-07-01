package com.beanmind.curator.domain.tastetest.repository;

import com.beanmind.curator.domain.tastetest.entity.TasteTestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TasteTestResultRepository extends JpaRepository<TasteTestResult, String> {
    List<TasteTestResult> findByTasteTestId(String testId);
}
