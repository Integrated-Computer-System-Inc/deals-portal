-- ==============================================================================
-- Deals Registration Portal - Email Configuration Table Setup Script
-- Target Database: DealsRegistrationDB (or your active Deals database)
-- Description: Creates dbo.app_email_config table, adds missing columns, and seeds initial default config
-- ==============================================================================

USE [DealsRegistrationDB];
GO

PRINT '>>> Checking and creating dbo.app_email_config table if not exists...';
GO

IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config'
)
BEGIN
    CREATE TABLE [dbo].[app_email_config] (
        [id] INT NOT NULL,
        [mode] NVARCHAR(20) NOT NULL CONSTRAINT [DF_app_email_config_mode] DEFAULT 'DEV',
        [devRecipients] NVARCHAR(MAX) NULL,
        [devCCRecipients] NVARCHAR(MAX) NULL,
        [devBCCRecipients] NVARCHAR(MAX) NULL,
        [liveCCRecipients] NVARCHAR(MAX) NULL,
        [liveBCCRecipients] NVARCHAR(MAX) NULL,
        [includeBuHead] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBuHead] DEFAULT 1,
        [includeAdminAndAA] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeAdminAndAA] DEFAULT 1,
        [includeBrandPm] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBrandPm] DEFAULT 1,
        [updatedBy] NVARCHAR(200) NULL,
        [updatedAt] DATETIME NULL,
        CONSTRAINT [PK_app_email_config] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT '>>> Table [dbo].[app_email_config] created successfully.';
END
ELSE
BEGIN
    PRINT '>>> Table [dbo].[app_email_config] already exists. Checking for missing columns...';
END
GO

-- ------------------------------------------------------------------------------
-- Ensure devCCRecipients, devBCCRecipients, and includeBrandPm exist if table already existed
-- ------------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devCCRecipients'
)
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [devCCRecipients] NVARCHAR(MAX) NULL;
    PRINT '>>> Column [devCCRecipients] added successfully.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'devBCCRecipients'
)
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [devBCCRecipients] NVARCHAR(MAX) NULL;
    PRINT '>>> Column [devBCCRecipients] added successfully.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'app_email_config' AND COLUMN_NAME = 'includeBrandPm'
)
BEGIN
    ALTER TABLE [dbo].[app_email_config] ADD [includeBrandPm] BIT NOT NULL CONSTRAINT [DF_app_email_config_includeBrandPm] DEFAULT 1;
    PRINT '>>> Column [includeBrandPm] added successfully.';
END
GO

-- ------------------------------------------------------------------------------
-- Seed Default Initial Configuration (ID = 1) if not exists
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[app_email_config] WHERE [id] = 1)
BEGIN
    PRINT '>>> Seeding initial default email configuration (ID = 1)...';

    INSERT INTO [dbo].[app_email_config] (
        [id],
        [mode],
        [devRecipients],
        [devCCRecipients],
        [devBCCRecipients],
        [liveCCRecipients],
        [liveBCCRecipients],
        [includeBuHead],
        [includeAdminAndAA],
        [includeBrandPm],
        [updatedBy],
        [updatedAt]
    ) VALUES (
        1,
        'DEV',
        N'[{"email":"dramos@ics.com.ph","name":"Dave Ramos"},{"email":"bcandelaria@ics.com.ph","name":"Bryan Candelaria"},{"email":"jdoremon@ics.com.ph","name":"John Doremon"},{"email":"jesurena@ics.com.ph","name":"Jeric Esurena"},{"email":"mescario@ics.com.ph","name":"Mark Escario"}]',
        N'[]',
        N'[]',
        N'[{"email":"asy-lu@ics.com.ph","name":"Adeliana Sy-Lu"},{"email":"afrancisco@ics.com.ph","name":"Athena Francisco"}]',
        N'[{"email":"dramos@ics.com.ph","name":"Dave Ramos"},{"email":"bcandelaria@ics.com.ph","name":"Bryan Candelaria"},{"email":"jdoremon@ics.com.ph","name":"John Doremon"},{"email":"jesurena@ics.com.ph","name":"Jeric Esurena"},{"email":"mescario@ics.com.ph","name":"Mark Escario"}]',
        1,
        1,
        1,
        'SYSTEM_SETUP',
        GETDATE()
    );

    PRINT '>>> Default email configuration seeded successfully.';
END
ELSE
BEGIN
    PRINT '>>> Default row [id] = 1 already exists.';
END
GO

-- ------------------------------------------------------------------------------
-- Verify table structure and content
-- ------------------------------------------------------------------------------
SELECT 
    [id], 
    [mode], 
    [devRecipients],
    [devCCRecipients],
    [devBCCRecipients],
    [liveCCRecipients],
    [liveBCCRecipients],
    [includeBuHead], 
    [includeAdminAndAA], 
    [includeBrandPm],
    [updatedBy], 
    [updatedAt]
FROM [dbo].[app_email_config];
GO

