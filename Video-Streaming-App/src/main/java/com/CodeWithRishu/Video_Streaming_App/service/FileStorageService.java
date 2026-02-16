package com.CodeWithRishu.Video_Streaming_App.service;

import com.CodeWithRishu.Video_Streaming_App.exception.FileStorageException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private static final String FILENAME_SEPARATOR = "_";
    private static final long MAX_FILE_SIZE = 2L * 1024 * 1024 * 1024;

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.video.upload-dir}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir)
                .toAbsolutePath()
                .normalize();

        initializeStorageDirectory();
    }

    public String storeFile(MultipartFile file) {
        validateFile(file);

        String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNull(file.getOriginalFilename())
        );

        String sanitizedFilename = sanitizeFilename(originalFilename);
        String uniqueFilename = generateUniqueFilename(sanitizedFilename);

        storeFileToLocation(file, uniqueFilename);

        return uniqueFilename;
    }

    public Path getFilePath(String filename) {
        return fileStorageLocation.resolve(filename).normalize();
    }

    public boolean deleteFile(String filename) {
        try {
            Path filePath = getFilePath(filename);
            return Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new FileStorageException("Could not delete file: " + filename, ex);
        }
    }

    private void initializeStorageDirectory() {
        try {
            if (!Files.exists(fileStorageLocation)) {
                Files.createDirectories(fileStorageLocation);
            }
        } catch (IOException ex) {
            throw new FileStorageException(
                    "Could not create the directory where the uploaded files will be stored.", ex
            );
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException(
                    String.format("File size exceeds maximum allowed size of %d bytes", MAX_FILE_SIZE)
            );
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("File must have a valid filename");
        }

        if (containsPathTraversal(originalFilename)) {
            throw new IllegalArgumentException("Filename contains invalid path sequence");
        }
    }

    private boolean containsPathTraversal(String filename) {
        return filename.contains("..") || filename.contains("/") || filename.contains("\\");
    }

    private String sanitizeFilename(String filename) {
        String raw = filename.replaceAll("\\.\\.", "").replaceAll("[/\\\\]", "");

        String sanitized = raw.replaceAll("[^a-zA-Z0-9\\.\\-]", "_");

        if (sanitized.isBlank()) {
            return "file_" + System.currentTimeMillis();
        }

        return sanitized;
    }

    private String generateUniqueFilename(String originalFilename) {
        return UUID.randomUUID().toString() + FILENAME_SEPARATOR + originalFilename;
    }

    private void storeFileToLocation(MultipartFile file, String filename) {
        Path targetLocation = fileStorageLocation.resolve(filename);

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(
                    inputStream,
                    targetLocation,
                    StandardCopyOption.REPLACE_EXISTING
            );
        } catch (IOException ex) {
            cleanupFailedUpload(targetLocation);
            throw new FileStorageException(
                    "Could not store file " + filename + ". Please try again!", ex
            );
        }
    }

    private void cleanupFailedUpload(Path targetLocation) {
        try {
            Files.deleteIfExists(targetLocation);
        } catch (IOException ignored) {
        }
    }
}