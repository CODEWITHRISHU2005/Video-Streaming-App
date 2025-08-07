package com.CodeWithRishu.Video_Streaming_App.dto;

import lombok.*;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Builder
public class CustomMessage {
    private String message;
    private boolean success = false;
}