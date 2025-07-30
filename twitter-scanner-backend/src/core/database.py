"""Database setup and models for Twitter Scanner Backend using MySQL."""

import aiomysql
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from core.config import settings
from core.logging_config import get_logger

logger = get_logger("database")

class DatabasePool:
    """MySQL database connection pool manager."""
    
    def __init__(self):
        self.pool = None
    
    async def create_pool(self):
        """Create MySQL connection pool."""
        try:
            self.pool = await aiomysql.create_pool(
                host=settings.mysql_host,
                port=settings.mysql_port,
                user=settings.mysql_user,
                password=settings.mysql_password,
                db=settings.mysql_database,
                charset='utf8mb4',
                autocommit=True,
                minsize=1,
                maxsize=10
            )
            logger.info("MySQL connection pool created successfully")
        except Exception as e:
            logger.error(f"Failed to create MySQL connection pool: {e}")
            raise
    
    async def close_pool(self):
        """Close MySQL connection pool."""
        if self.pool:
            self.pool.close()
            await self.pool.wait_closed()
            logger.info("MySQL connection pool closed")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool."""
        if not self.pool:
            await self.create_pool()
        
        async with self.pool.acquire() as conn:
            yield conn

# Global database pool instance
db_pool = DatabasePool()

async def init_database():
    """Initialize the database and create tables."""
    if not db_pool.pool:
        await db_pool.create_pool()
    
    async with db_pool.get_connection() as conn:
        async with conn.cursor() as cursor:
            # Create usage_statistics table
            await cursor.execute("""
                CREATE TABLE IF NOT EXISTS usage_statistics (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    client_ip VARCHAR(45) NOT NULL,
                    user_agent TEXT,
                    success BOOLEAN NOT NULL,
                    twitter_count INT NOT NULL,
                    content_length INT NOT NULL,
                    processing_time_ms INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_client_ip (client_ip),
                    INDEX idx_created_at (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            logger.info("Database tables initialized successfully")

class UsageStatsDB:
    """Database operations for usage statistics."""
    
    @staticmethod
    async def add_usage_record(
        client_ip: str,
        success: bool,
        twitter_count: int,
        content_length: int,
        processing_time_ms: int,
        user_agent: Optional[str] = None
    ) -> int:
        """Add a usage record to the database."""
        
        logger.info(
            "开始录入数据信息",
            client_ip=client_ip,
            success=success,
            twitter_count=twitter_count,
            content_length=content_length,
            processing_time_ms=processing_time_ms,
            user_agent=user_agent[:100] if user_agent else None,
            timestamp=datetime.now().isoformat()
        )
        
        async with db_pool.get_connection() as conn:
            async with conn.cursor() as cursor:
                try:
                    await cursor.execute("""
                        INSERT INTO usage_statistics 
                        (client_ip, user_agent, success, twitter_count, content_length, processing_time_ms)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (client_ip, user_agent, success, twitter_count, content_length, processing_time_ms))
                    
                    record_id = cursor.lastrowid
                    
                    logger.info(
                        "数据录入成功",
                        record_id=record_id,
                        client_ip=client_ip,
                        success=success,
                        twitter_count=twitter_count,
                        content_length=content_length,
                        processing_time_ms=processing_time_ms,
                        database_operation="INSERT",
                        affected_rows=cursor.rowcount,
                        completion_time=datetime.now().isoformat()
                    )
                    
                    return record_id
                    
                except Exception as db_error:
                    logger.error(
                        "数据录入失败",
                        client_ip=client_ip,
                        success=success,
                        twitter_count=twitter_count,
                        content_length=content_length,
                        processing_time_ms=processing_time_ms,
                        error=str(db_error),
                        error_type=type(db_error).__name__,
                        database_operation="INSERT",
                        failure_time=datetime.now().isoformat()
                    )
                    raise
    
    @staticmethod
    async def get_user_stats(client_ip: str, date: Optional[str] = None) -> Dict[str, Any]:
        """Get usage statistics for a specific user."""
        async with db_pool.get_connection() as conn:
            async with conn.cursor() as cursor:
                
                if date:
                    await cursor.execute("""
                        SELECT 
                            COUNT(*) as total_requests,
                            SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
                            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
                            SUM(twitter_count) as total_tweets_analyzed,
                            AVG(processing_time_ms) as avg_processing_time,
                            MIN(access_time) as first_access,
                            MAX(access_time) as last_access
                        FROM usage_statistics 
                        WHERE client_ip = %s AND date = %s
                    """, (client_ip, date))
                else:
                    await cursor.execute("""
                        SELECT 
                            COUNT(*) as total_requests,
                            SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
                            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
                            SUM(twitter_count) as total_tweets_analyzed,
                            AVG(processing_time_ms) as avg_processing_time,
                            MIN(access_time) as first_access,
                            MAX(access_time) as last_access
                        FROM usage_statistics 
                        WHERE client_ip = %s
                    """, (client_ip,))
                
                row = await cursor.fetchone()
                
                return {
                    "client_ip": client_ip,
                    "total_requests": row[0] or 0,
                    "successful_requests": row[1] or 0,
                    "failed_requests": row[2] or 0,
                    "total_tweets_analyzed": row[3] or 0,
                    "avg_processing_time": round(row[4] or 0, 2),
                    "first_access": row[5].isoformat() if row[5] else None,
                    "last_access": row[6].isoformat() if row[6] else None
                }
    
    @staticmethod
    async def get_daily_stats(date: str) -> List[Dict[str, Any]]:
        """Get daily statistics for all users."""
        async with db_pool.get_connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT 
                        client_ip,
                        COUNT(*) as requests,
                        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
                        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
                        SUM(twitter_count) as tweets_analyzed,
                        AVG(processing_time_ms) as avg_processing_time
                    FROM usage_statistics 
                    WHERE date = %s
                    GROUP BY client_ip
                    ORDER BY requests DESC
                """, (date,))
                
                results = await cursor.fetchall()
                
                return [
                    {
                        "client_ip": row[0],
                        "requests": row[1],
                        "successful": row[2],
                        "failed": row[3],
                        "tweets_analyzed": row[4],
                        "avg_processing_time": round(row[5], 2)
                    }
                    for row in results
                ]
    
    @staticmethod
    async def get_recent_records(limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent usage records."""
        async with db_pool.get_connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute("""
                    SELECT id, client_ip, user_agent, success, 
                           twitter_count, content_length, processing_time_ms, created_at
                    FROM usage_statistics 
                    ORDER BY created_at DESC 
                    LIMIT %s
                """, (limit,))
                
                results = await cursor.fetchall()
                
                return [
                    {
                        "id": row[0],
                        "client_ip": row[1],
                        "user_agent": row[2],
                        "success": bool(row[3]),
                        "twitter_count": row[4],
                        "content_length": row[5],
                        "processing_time_ms": row[6],
                        "created_at": row[7].isoformat() if row[7] else None
                    }
                    for row in results
                ]