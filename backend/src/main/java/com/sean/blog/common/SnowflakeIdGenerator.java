package com.sean.blog.common;

import org.springframework.stereotype.Component;

/**
 * Snowflake 算法分布式 ID 生成器（64 位长整型）。
 *
 * <pre>
 * | 1 bit 符号位 | 41 bits 时间戳（毫秒） | 10 bits 工作机器 | 12 bits 序列号 |
 * </pre>
 *
 * 单机部署场景下 workerId 固定为 1，每秒可产生约 40 万个不重复 ID。
 */
@Component
public class SnowflakeIdGenerator {

    /** 自定义起始时间戳：2026-01-01 00:00:00 UTC（毫秒） */
    private static final long EPOCH = 1767225600000L;

    /** 机器 ID 占 10 位（0~1023） */
    private static final long WORKER_ID_BITS = 10L;
    private static final long MAX_WORKER_ID = ~(-1L << WORKER_ID_BITS);

    /** 序列号占 12 位（0~4095） */
    private static final long SEQUENCE_BITS = 12L;
    private static final long MAX_SEQUENCE = ~(-1L << SEQUENCE_BITS);

    /** 位移量 */
    private static final long TIMESTAMP_SHIFT = WORKER_ID_BITS + SEQUENCE_BITS;
    private static final long WORKER_ID_SHIFT = SEQUENCE_BITS;

    private final long workerId;

    private long sequence = 0L;
    private long lastTimestamp = -1L;

    public SnowflakeIdGenerator() {
        this(1L);
    }

    public SnowflakeIdGenerator(long workerId) {
        if (workerId > MAX_WORKER_ID || workerId < 0) {
            throw new IllegalArgumentException(
                    "workerId 必须在 0~" + MAX_WORKER_ID + " 之间");
        }
        this.workerId = workerId;
    }

    /**
     * 生成下一个 Snowflake ID。
     * 线程安全。
     */
    public synchronized long nextId() {
        long currentTimestamp = System.currentTimeMillis();

        if (currentTimestamp < lastTimestamp) {
            throw new RuntimeException(
                    "系统时钟回拨，拒绝生成 ID。当前时间戳 " + currentTimestamp
                            + " < 上次时间戳 " + lastTimestamp);
        }

        if (currentTimestamp == lastTimestamp) {
            // 同一毫秒内，序列号自增
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // 序列号用完，等待下一毫秒
                currentTimestamp = waitUntilNextMillis(lastTimestamp);
            }
        } else {
            // 不同毫秒，序列号归零
            sequence = 0L;
        }

        lastTimestamp = currentTimestamp;

        return ((currentTimestamp - EPOCH) << TIMESTAMP_SHIFT)
                | (workerId << WORKER_ID_SHIFT)
                | sequence;
    }

    private long waitUntilNextMillis(long lastTimestamp) {
        long timestamp = System.currentTimeMillis();
        while (timestamp <= lastTimestamp) {
            timestamp = System.currentTimeMillis();
        }
        return timestamp;
    }
}
