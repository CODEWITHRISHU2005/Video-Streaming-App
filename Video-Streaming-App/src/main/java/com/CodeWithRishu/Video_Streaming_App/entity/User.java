package com.CodeWithRishu.Video_Streaming_App.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.DynamicInsert;
import org.hibernate.annotations.DynamicUpdate;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@DynamicInsert
@DynamicUpdate
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JsonIgnore
    private UUID id;

    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    private String phoneNumber;

    @Lob
    private String bio;

    @Lob
    private byte[] profileImage;

    @Enumerated(EnumType.STRING)
    @JsonIgnore
    private Provider provider = Provider.LOCAL;

    @JsonIgnore
    private boolean enabled = true;

    @JsonIgnore
    private Instant createdAt = Instant.now();

    @JsonIgnore
    private Instant updatedAt = Instant.now();

    @PrePersist
    @JsonIgnore
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    @JsonIgnore
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

}