package com.agentbox.platform.repositories;

import com.agentbox.platform.models.ImageGeneration;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ImageGenerationRepository extends BaseMapper<ImageGeneration> {
}
