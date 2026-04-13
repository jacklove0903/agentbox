package com.agentbox.platform.repositories;

import com.agentbox.platform.models.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByUserIdOrderByTimestampDesc(String userId);

    @Query("SELECT m FROM Message m WHERE m.userId = :userId AND (:modelId IS NULL OR m.modelId = :modelId) ORDER BY m.timestamp DESC")
    List<Message> findByUserIdAndModelId(@Param("userId") String userId, @Param("modelId") String modelId);
}