package com.CodeWithRishu.Video_Streaming_App.repository;

import com.CodeWithRishu.Video_Streaming_App.entity.OtpVerification;
import com.CodeWithRishu.Video_Streaming_App.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface OtpVerificationRepository extends JpaRepository<OtpVerification, Long> {
    Optional<OtpVerification> findTopByPhoneAndVerifiedFalseOrderByCreatedAtDesc(String phone);

    Optional<OtpVerification> findTopByPhoneAndVerifiedTrueOrderByCreatedAtDesc(String phone);

    void deleteByPhoneAndVerifiedFalse(String phone);

    int deleteByExpiresAtBefore(Instant now);

    void deleteByUserAndVerifiedTrue(User user);
}