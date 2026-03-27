package edu.cit.binagatan.pirmaph.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class SupabaseStorageService {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseStorageService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key:}")
    private String serviceRoleKey;

    @Value("${supabase.bucket.profile-photos:profile-photos}")
    private String profilePhotosBucket;

    @Value("${supabase.bucket.documents:documents}")
    private String documentsBucket;

    public String resolveBucket(String category) {
        if ("PROFILE_PHOTO".equalsIgnoreCase(category)) {
            return profilePhotosBucket;
        }
        return documentsBucket;
    }

    public void uploadPrivateObject(String bucket, String objectPath, byte[] data, String contentType) {
        ensureConfigured();

        String encodedPath = UriUtils.encodePath(objectPath, StandardCharsets.UTF_8);
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + encodedPath;

        HttpHeaders headers = baseHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.add("x-upsert", "true");

        HttpEntity<byte[]> entity = new HttpEntity<>(data, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("File upload failed with status: " + response.getStatusCode());
            }
        } catch (HttpStatusCodeException ex) {
            String body = ex.getResponseBodyAsString();
            logger.warn("Supabase upload error status={} body={}", ex.getStatusCode(), body);
            throw new IllegalStateException("Supabase upload failed: " + ex.getStatusCode() + " " + body, ex);
        }
    }

    public String createSignedUrl(String bucket, String objectPath, int expiresInSeconds) {
        ensureConfigured();

        String encodedPath = UriUtils.encodePath(objectPath, StandardCharsets.UTF_8);
        String url = supabaseUrl + "/storage/v1/object/sign/" + bucket + "/" + encodedPath;

        HttpHeaders headers = baseHeaders();
        Map<String, Object> payload = new HashMap<>();
        payload.put("expiresIn", expiresInSeconds);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        } catch (HttpStatusCodeException ex) {
            String body = ex.getResponseBodyAsString();
            logger.warn("Supabase signed URL error status={} body={}", ex.getStatusCode(), body);
            throw new IllegalStateException("Supabase signed URL failed: " + ex.getStatusCode() + " " + body, ex);
        }
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("Signed URL generation failed");
        }

        try {
            JsonNode node = objectMapper.readTree(response.getBody());
            String signedPath = node.path("signedURL").asText();
            if (signedPath == null || signedPath.isBlank()) {
                throw new IllegalStateException("Supabase did not return a signed URL");
            }
            return supabaseUrl + "/storage/v1" + signedPath;
        } catch (Exception ex) {
            throw new IllegalStateException("Could not parse signed URL response", ex);
        }
    }

    private HttpHeaders baseHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceRoleKey);
        headers.add("apikey", serviceRoleKey);
        return headers;
    }

    private void ensureConfigured() {
        if (supabaseUrl == null || supabaseUrl.isBlank() || serviceRoleKey == null || serviceRoleKey.isBlank()) {
            throw new IllegalStateException("Supabase storage is not configured. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env.");
        }
    }
}