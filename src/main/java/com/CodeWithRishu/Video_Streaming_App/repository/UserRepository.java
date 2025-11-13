package com.CodeWithRishu.Video_Streaming_App.repository;

import com.CodeWithRishu.Video_Streaming_App.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByName(String username);

    Optional<User> findByEmail(String username);
}