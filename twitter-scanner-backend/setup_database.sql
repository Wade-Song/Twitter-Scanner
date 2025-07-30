-- Twitter Scanner Database Setup Script
-- Run this script to create the database and tables

-- Create database
CREATE DATABASE IF NOT EXISTS twitter_scanner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE twitter_scanner;

-- Create usage_statistics table
DROP TABLE IF EXISTS usage_statistics;
CREATE TABLE IF NOT EXISTS usage_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_ip VARCHAR(45) NOT NULL COMMENT '客户端IP地址',
    user_agent TEXT COMMENT '浏览器标识信息',
    success BOOLEAN NOT NULL COMMENT '是否成功',
    twitter_count INT NOT NULL COMMENT '分析的Twitter数量',
    content_length INT NOT NULL COMMENT '处理内容总长度(字符数)',
    processing_time_ms INT NOT NULL COMMENT '处理时间(毫秒)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    
    -- 索引
    INDEX idx_client_ip (client_ip),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计信息表';
ALTER TABLE usage_statistics
  MODIFY COLUMN user_id VARCHAR(36) COMMENT '用户ID'、;
-- Show table structure
DESCRIBE usage_statistics;