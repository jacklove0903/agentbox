package com.agentbox.platform.repositories;

import com.agentbox.platform.models.UploadedFile;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UploadedFileRepository extends BaseMapper<UploadedFile> {
}
