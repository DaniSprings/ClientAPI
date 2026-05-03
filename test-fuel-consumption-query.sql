-- Test Query: Check Fuel Consumption Data for Alfa Romeo Giulia 2.0T Veloce
-- Run this on your SQL Server to verify what data is stored

-- Query 1: Check the specific vehicle (MODEL_ID = 3)
SELECT 
    m.MODEL_ID,
    m.ModelNames,
    b.BrandNames,
    ep.PERFORMANCE_ID,
    ep.[Fuel Consumption] AS fuelConsumption,
    ep.[Fuel Range] AS fuelRange,
    ep.POWER,
    ep.TORQUE,
    ep.ENGINE,
    ep.Acceleration,
    ep.TopSpeed
FROM ModelTable m
INNER JOIN BrandTable b ON m.Brand_ID = b.Brand_ID
LEFT JOIN EnginePerformanceTable ep ON ep.MODEL_ID = m.MODEL_ID
WHERE m.MODEL_ID = 3
    AND m.ModelNames = 'Giulia 2.0T Veloce'
    AND b.BrandNames = 'Alfa Romeo';

-- Query 2: Check all Alfa Romeo Giulia variants for comparison
SELECT 
    m.MODEL_ID,
    m.ModelNames,
    b.BrandNames,
    ep.[Fuel Consumption] AS fuelConsumption,
    ep.[Fuel Range] AS fuelRange,
    CASE 
        WHEN ep.[Fuel Consumption] IS NULL THEN 'NULL (Missing Data)'
        WHEN ep.[Fuel Consumption] = '' THEN 'Empty String'
        ELSE ep.[Fuel Consumption]
    END AS dataStatus
FROM ModelTable m
INNER JOIN BrandTable b ON m.Brand_ID = b.Brand_ID
LEFT JOIN EnginePerformanceTable ep ON ep.MODEL_ID = m.MODEL_ID
WHERE b.BrandNames = 'Alfa Romeo'
    AND m.ModelNames LIKE '%Giulia%'
ORDER BY m.MODEL_ID;

-- Query 3: Check how many EnginePerformanceTable records have null Fuel Consumption
SELECT 
    COUNT(*) as totalRecords,
    SUM(CASE WHEN [Fuel Consumption] IS NULL THEN 1 ELSE 0 END) as nullCount,
    SUM(CASE WHEN [Fuel Consumption] = '' THEN 1 ELSE 0 END) as emptyCount,
    SUM(CASE WHEN [Fuel Consumption] IS NOT NULL AND [Fuel Consumption] != '' THEN 1 ELSE 0 END) as populatedCount
FROM EnginePerformanceTable;
