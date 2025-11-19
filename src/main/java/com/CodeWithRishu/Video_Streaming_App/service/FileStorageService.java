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
    private static final long MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    private final Path fileStorageLocation;

    public FileStorageService(@Value("${file.upload-dir}") String uploadDir) {
        log.info("Initializing FileStorageService with upload directory: {}", uploadDir);

        this.fileStorageLocation = Paths.get(uploadDir)
                .toAbsolutePath()
                .normalize();

        initializeStorageDirectory();

        log.info("FileStorageService initialized successfully. Storage location: {}",
                this.fileStorageLocation);
    }

    public String storeFile(MultipartFile file) {
        log.debug("Storing file request received");

        validateFile(file);

        String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNull(file.getOriginalFilename(), "Filename cannot be null")
        );
        String sanitizedFilename = sanitizeFilename(originalFilename);
        String uniqueFilename = generateUniqueFilename(sanitizedFilename);

        log.debug("Original filename: {}, Generated filename: {}", originalFilename, uniqueFilename);

        storeFileToLocation(file, uniqueFilename);

        log.info("File stored successfully: {} (Original: {}, Size: {} bytes)",
                uniqueFilename, originalFilename, file.getSize());

        return uniqueFilename;
    }

    public Path getFilePath(String filename) {
        return fileStorageLocation.resolve(filename).normalize();
    }

    public boolean deleteFile(String filename) {
        try {
            Path filePath = getFilePath(filename);
            boolean deleted = Files.deleteIfExists(filePath);

            if (deleted) {
                log.info("File deleted successfully: {}", filename);
            } else {
                log.warn("File not found for deletion: {}", filename);
            }

            return deleted;
        } catch (IOException ex) {
            log.error("Failed to delete file: {}", filename, ex);
            throw new FileStorageException("Could not delete file: " + filename, ex);
        }
    }

    private void initializeStorageDirectory() {
        try {
            if (!Files.exists(fileStorageLocation)) {
                Files.createDirectories(fileStorageLocation);
                log.info("Created storage directory: {}", fileStorageLocation);
            } else {
                log.debug("Storage directory already exists: {}", fileStorageLocation);
            }
        } catch (IOException ex) {
            log.error("Failed to create storage directory: {}", fileStorageLocation, ex);
            throw new FileStorageException(
                    "Could not create the directory where the uploaded files will be stored.", ex
            );
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.error("File validation failed: File is null or empty");
            throw new IllegalArgumentException("File cannot be null or empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            log.error("File validation failed: File size {} exceeds maximum allowed size {}",
                    file.getSize(), MAX_FILE_SIZE);
            throw new IllegalArgumentException(
                    String.format("File size exceeds maximum allowed size of %d bytes", MAX_FILE_SIZE)
            );
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            log.error("File validation failed: Original filename is null or blank");
            throw new IllegalArgumentException("File must have a valid filename");
        }

        if (containsPathTraversal(originalFilename)) {
            log.error("File validation failed: Filename contains path traversal sequence: {}",
                    originalFilename);
            throw new IllegalArgumentException("Filename contains invalid path sequence");
        }
    }

    private boolean containsPathTraversal(String filename) {
        return filename.contains("..") || filename.contains("/") || filename.contains("\\");
    }

    private String sanitizeFilename(String filename) {
        // Remove path traversal sequences and normalize
        String sanitized = filename.replaceAll("\\.\\.", "")
                .replaceAll("[/\\\\]", "")
                .trim();

        if (sanitized.isBlank()) {
            log.warn("Filename became blank after sanitization, using default");
            return "file";
        }

        return sanitized;
    }

    private String generateUniqueFilename(String originalFilename) {
        return UUID.randomUUID().toString() + FILENAME_SEPARATOR + originalFilename;
    }

    private void storeFileToLocation(MultipartFile file, String filename) {
        Path targetLocation = fileStorageLocation.resolve(filename);

        try (InputStream inputStream = file.getInputStream()) {
            long bytesCopied = Files.copy(
                    inputStream,
                    targetLocation,
                    StandardCopyOption.REPLACE_EXISTING
            );

            log.debug("Copied {} bytes to {}", bytesCopied, targetLocation);

        } catch (IOException ex) {
            log.error("Failed to store file: {} at location: {}", filename, targetLocation, ex);

            // Attempt cleanup on failure
            cleanupFailedUpload(targetLocation);

            throw new FileStorageException(
                    "Could not store file " + filename + ". Please try again!", ex
            );
        }
    }

    private void cleanupFailedUpload(Path targetLocation) {
        try {
            if (Files.exists(targetLocation)) {
                Files.delete(targetLocation);
                log.debug("Cleaned up failed upload at: {}", targetLocation);
            }
        } catch (IOException cleanupEx) {
            log.warn("Failed to cleanup partially uploaded file at: {}", targetLocation, cleanupEx);
        }
    }

}