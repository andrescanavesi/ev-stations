SELECT
connector_group_id,
    status,
    COUNT(*) AS total
FROM
    StatusReadings
WHERE
timestamp >= '2025-11-05 00:00:00'
    AND timestamp < '2025-11-06 00:00:00'
GROUP BY
    connector_group_id, status;
