package com.CodeWithRishu.Video_Streaming_App.repository;

import com.CodeWithRishu.Video_Streaming_App.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VideoRepository extends JpaRepository<Video, String> {
    Optional<Video> findByTitle(String title);
}