package com.CodeWithRishu.Video_Streaming_App.repository;

import com.CodeWithRishu.Video_Streaming_App.entity.RefreshToken;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Integer> {
    Optional<RefreshToken> findByToken(String token);

    Optional<RefreshToken> findByUserInfo(User user);

    void deleteByUserInfo(User user);
}