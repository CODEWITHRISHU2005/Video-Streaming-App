package com.CodeWithRishu.Video_Streaming_App;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class VideoStreamingAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(VideoStreamingAppApplication.class, args);
	}

}