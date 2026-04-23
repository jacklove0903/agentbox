package com.agentbox.platform.repositories;

import com.agentbox.platform.models.Conversation;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ConversationRepository extends BaseMapper<Conversation> {
}
