package com.beanmind.curator.domain.post.repository;

import com.beanmind.curator.domain.post.entity.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PollVoteRepository extends JpaRepository<PollVote, String> {
    Optional<PollVote> findByUserIdAndOptionId(String userId, String optionId);

    @Query("SELECT pv FROM PollVote pv JOIN pv.option o WHERE pv.user.id = :userId AND o.poll.id = :pollId")
    Optional<PollVote> findByUserIdAndPollId(@Param("userId") String userId, @Param("pollId") String pollId);
}
