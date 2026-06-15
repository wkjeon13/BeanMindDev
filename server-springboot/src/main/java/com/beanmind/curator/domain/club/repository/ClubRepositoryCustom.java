package com.beanmind.curator.domain.club.repository;

import com.beanmind.curator.domain.club.entity.Club;
import java.util.List;

public interface ClubRepositoryCustom {
    List<Club> searchClubs(String q, Boolean recruitingOnly, String countryCode, String lastId, int skip, int limit);
}
