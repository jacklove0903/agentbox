package com.agentbox.platform.repositories;

import com.agentbox.platform.models.Model;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ModelRepository extends BaseMapper<Model> {
}