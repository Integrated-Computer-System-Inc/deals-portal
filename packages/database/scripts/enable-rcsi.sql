-- ==============================================================================
-- Deals Registration Portal - Enable Read Committed Snapshot Isolation (RCSI)
-- Target Database: DealsRegistrationDB
-- Target Instance: Microsoft SQL Server Management Studio (SSMS)
-- 
-- Why this is needed:
--   By default, SQL Server locks rows during writes (INSERT/UPDATE/DELETE),
--   blocking other users from reading (SELECT), causing portal UI freezes,
--   timeouts, and deadlocks during concurrent activity.
--
-- What RCSI does:
--   Enables Row Versioning in tempdb. Readers NEVER block Writers, and
--   Writers NEVER block Readers. Every reader gets the latest committed
--   snapshot instantaneously with zero lock waits.
--
-- Safety:
--   - Temporarily sets SINGLE_USER WITH ROLLBACK IMMEDIATE to acquire the exclusive
--     metadata lock cleanly for 1-2 seconds.
--   - Enables READ_COMMITTED_SNAPSHOT.
--   - Enables ALLOW_SNAPSHOT_ISOLATION.
--   - Immediately returns the database to MULTI_USER mode.
-- ==============================================================================

USE master;
GO

PRINT '==============================================================================';
PRINT '>>> Starting RCSI (Read Committed Snapshot Isolation) Configuration...';
PRINT '>>> Server Time: ' + CONVERT(VARCHAR(30), GETDATE(), 120);
PRINT '==============================================================================';
GO

-- 1. Check current isolation state before change
PRINT '--- Step 1: Checking current isolation settings for DealsRegistrationDB ---';
SELECT 
    name AS [Database Name],
    is_read_committed_snapshot_on AS [RCSI Enabled (1=ON, 0=OFF)],
    snapshot_isolation_state_desc AS [Snapshot Isolation State]
FROM sys.databases
WHERE name = 'DealsRegistrationDB';
GO

-- 2. Switch to SINGLE_USER to acquire lock, flip RCSI, and immediately restore MULTI_USER
PRINT '--- Step 2: Setting SINGLE_USER and enabling READ_COMMITTED_SNAPSHOT ---';
GO

ALTER DATABASE [DealsRegistrationDB] 
SET SINGLE_USER 
WITH ROLLBACK IMMEDIATE;
GO

ALTER DATABASE [DealsRegistrationDB] 
SET READ_COMMITTED_SNAPSHOT ON;
GO

ALTER DATABASE [DealsRegistrationDB] 
SET ALLOW_SNAPSHOT_ISOLATION ON;
GO

ALTER DATABASE [DealsRegistrationDB] 
SET MULTI_USER;
GO

PRINT '  -> Successfully updated isolation levels and restored MULTI_USER mode.';
GO

-- 3. Verify final state
PRINT '==============================================================================';
PRINT '>>> Step 3: Verifying final isolation settings...';
PRINT '==============================================================================';
GO

SELECT 
    name AS [Database Name],
    is_read_committed_snapshot_on AS [RCSI Enabled (1=ON, 0=OFF)],
    snapshot_isolation_state_desc AS [Snapshot Isolation State]
FROM sys.databases
WHERE name = 'DealsRegistrationDB';
GO

PRINT '==============================================================================';
PRINT '>>> RCSI Configuration Completed Successfully!';
PRINT '==============================================================================';
GO
