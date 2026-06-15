package com.beanmind.curator.domain.point.repository;

import com.beanmind.curator.domain.point.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {
    Optional<PaymentTransaction> findByStoreTransactionId(String storeTransactionId);
}
