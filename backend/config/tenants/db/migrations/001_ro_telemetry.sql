-- 001_ro_telemetry.sql - Multi-tenant Telemetry Hypertable

CREATE TABLE IF NOT EXISTS ro_telemetry (
    time TIMESTAMPTZ NOT NULL,
    tenant_id VARCHAR(50) NOT NULL,
    asset_id VARCHAR(50) NOT NULL,
    feed_flow NUMERIC,
    permeate_flow NUMERIC,
    reject_flow NUMERIC,
    feed_pressure NUMERIC,
    stage1_delta_p NUMERIC,
    stage2_delta_p NUMERIC,
    feed_tds NUMERIC,
    permeate_tds NUMERIC,
    water_temperature NUMERIC,
    antiscalant_dose_ppm NUMERIC
);

-- Make it a Hypertable (TimescaleDB magic)
SELECT create_hypertable('ro_telemetry', 'time', if_not_exists => TRUE);

-- FAST lookup by tenant + time
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_time ON ro_telemetry (tenant_id, time DESC);

-- Save 90% disk space on Hetzner
ALTER TABLE ro_telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, asset_id'
);
SELECT add_compression_policy('ro_telemetry', INTERVAL '7 days', if_not_exists => TRUE);

-- Auto-delete data older than 1 year (you can change to 2 years)
SELECT add_retention_policy('ro_telemetry', INTERVAL '365 days', if_not_exists => TRUE);

-- Hourly metrics for your AI Engine + Executive Dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_ro_metrics
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS bucket,
    tenant_id,
    asset_id,
    AVG(permeate_flow) AS avg_permeate_flow,
    AVG(stage1_delta_p) AS avg_s1_dp,
    AVG(stage2_delta_p) AS avg_s2_dp,
    AVG(feed_pressure) AS avg_feed_pressure,
    (1.0 - (AVG(permeate_tds) / NULLIF(AVG(feed_tds), 0))) * 100 AS salt_rejection_rate
FROM ro_telemetry
GROUP BY bucket, tenant_id, asset_id
WITH NO DATA;

-- Refresh policy every 1 hour
SELECT add_continuous_aggregate_policy('hourly_ro_metrics',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);