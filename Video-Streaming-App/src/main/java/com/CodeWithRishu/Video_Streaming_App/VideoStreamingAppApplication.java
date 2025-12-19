package com.CodeWithRishu.Video_Streaming_App;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.bind.annotation.CrossOrigin;

@SpringBootApplication
@EnableAsync
@CrossOrigin(origins = "https://video-streaming-app-lac.vercel.app/")
public class VideoStreamingAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(VideoStreamingAppApplication.class, args);
	}

}