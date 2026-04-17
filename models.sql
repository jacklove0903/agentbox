/*
 Navicat Premium Dump SQL

 Source Server         : agentbox
 Source Server Type    : PostgreSQL
 Source Server Version : 160013 (160013)
 Source Host           : localhost:5432
 Source Catalog        : agentbox
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 160013 (160013)
 File Encoding         : 65001

 Date: 16/04/2026 09:41:18
*/


-- ----------------------------
-- Table structure for models
-- ----------------------------
DROP TABLE IF EXISTS "public"."models";
CREATE TABLE "public"."models" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "icon" varchar(255) COLLATE "pg_catalog"."default",
  "provider" varchar(255) COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Records of models
-- ----------------------------
INSERT INTO "public"."models" VALUES ('chatglm-4', '智谱AI ChatGLM-4', 'https://ext.same-assets.com/2425995810/1402690310.png', '智谱');
INSERT INTO "public"."models" VALUES ('chatglm-3', '智谱AI ChatGLM-3', 'https://ext.same-assets.com/2425995810/1402690310.png', '智谱');
INSERT INTO "public"."models" VALUES ('glm-4-plus', '智谱AI GLM-4-Plus', 'https://ext.same-assets.com/2425995810/1402690310.png', '智谱');
INSERT INTO "public"."models" VALUES ('sensenova-5.0', '商汤科技 SenseNova-5.0', 'https://ext.same-assets.com/2425995810/1402690310.png', '商汤科技');
INSERT INTO "public"."models" VALUES ('sensenova-5.5', '商汤科技 SenseNova-5.5', 'https://ext.same-assets.com/2425995810/1402690310.png', '商汤科技');
INSERT INTO "public"."models" VALUES ('doubao-lite', '字节跳动 Doubao-lite', 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/doubao_avatar.png', '字节跳动');
INSERT INTO "public"."models" VALUES ('doubao-pro', '字节跳动 Doubao-pro', 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/doubao_avatar.png', '字节跳动');
INSERT INTO "public"."models" VALUES ('doubao-vision', '字节跳动 Doubao-vision', 'https://lf-flow-web-cdn.doubao.com/obj/flow-doubao/doubao/web/doubao_avatar.png', '字节跳动');
INSERT INTO "public"."models" VALUES ('ernie-3.5', '百度 Ernie-3.5', 'https://www.baidu.com/favicon.ico', '百度');
INSERT INTO "public"."models" VALUES ('ernie-4.0', '百度 Ernie-4.0', 'https://www.baidu.com/favicon.ico', '百度');
INSERT INTO "public"."models" VALUES ('ernie-speed', '百度 Ernie-Speed', 'https://www.baidu.com/favicon.ico', '百度');
INSERT INTO "public"."models" VALUES ('hunyuan-turbo', '腾讯 Hunyuan-Turbo', 'https://www.tencent.com/favicon.ico', '腾讯');
INSERT INTO "public"."models" VALUES ('hunyuan-large', '腾讯 Hunyuan-Large', 'https://www.tencent.com/favicon.ico', '腾讯');
INSERT INTO "public"."models" VALUES ('hunyuan-standard', '腾讯 Hunyuan-Standard', 'https://www.tencent.com/favicon.ico', '腾讯');
INSERT INTO "public"."models" VALUES ('qwen-7b', '阿里云 Qwen-7B', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico', '阿里云');
INSERT INTO "public"."models" VALUES ('qwen-14b', '阿里云 Qwen-14B', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico', '阿里云');
INSERT INTO "public"."models" VALUES ('qwen-max', '阿里云 Qwen-Max', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico', '阿里云');
INSERT INTO "public"."models" VALUES ('qwen-turbo', '阿里云 Qwen-Turbo', 'https://img.alicdn.com/tfs/TB1_ZXuNcfpK1RjSZFOXXa6nFXa-32-32.ico', '阿里云');
INSERT INTO "public"."models" VALUES ('pangu-3.0', '华为 Pangu-3.0', 'https://www.huawei.com/favicon.ico', '华为');
INSERT INTO "public"."models" VALUES ('pangu-3.5', '华为 Pangu-3.5', 'https://www.huawei.com/favicon.ico', '华为');

-- ----------------------------
-- Primary Key structure for table models
-- ----------------------------
ALTER TABLE "public"."models" ADD CONSTRAINT "models_pkey" PRIMARY KEY ("id");
