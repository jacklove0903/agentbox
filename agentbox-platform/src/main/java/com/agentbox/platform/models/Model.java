package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("models")
public class Model {
    private String id;
    private String name;
    private String icon;
}