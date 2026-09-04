-- ==========================================================
-- Migration / Creation Script for activity_logs Table (MSSQL)
-- ==========================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[activity_logs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[activity_logs] (
        [logID]           INT NOT NULL,
        [dealID]          INT NULL,
        [dealRegID]       VARCHAR(50) NULL,
        [custName]        NVARCHAR(MAX) NULL,
        [projectName]     NVARCHAR(MAX) NULL,
        [action]          VARCHAR(50) NOT NULL,
        [fieldName]       VARCHAR(100) NULL,
        [oldValue]        NVARCHAR(MAX) NULL,
        [newValue]        NVARCHAR(MAX) NULL,
        [remarks]         NVARCHAR(MAX) NULL,
        [performedBy]     VARCHAR(100) NOT NULL,
        [performedByName] NVARCHAR(200) NULL,
        [performedByRole] VARCHAR(50) NULL,
        [impersonatedBy]  VARCHAR(100) NULL,
        [dtCreated]       DATETIME NOT NULL CONSTRAINT [DF_activity_logs_dtCreated] DEFAULT (GETDATE()),
        CONSTRAINT [PK_activity_logs] PRIMARY KEY CLUSTERED ([logID] ASC)
    );

    CREATE NONCLUSTERED INDEX [IX_activity_logs_dtCreated] ON [dbo].[activity_logs] ([dtCreated] DESC);
    CREATE NONCLUSTERED INDEX [IX_activity_logs_dealID] ON [dbo].[activity_logs] ([dealID] ASC);
    CREATE NONCLUSTERED INDEX [IX_activity_logs_dealRegID] ON [dbo].[activity_logs] ([dealRegID] ASC);
    CREATE NONCLUSTERED INDEX [IX_activity_logs_action] ON [dbo].[activity_logs] ([action] ASC);
    CREATE NONCLUSTERED INDEX [IX_activity_logs_performedBy] ON [dbo].[activity_logs] ([performedBy] ASC);
    
    PRINT 'Table [dbo].[activity_logs] and indexes created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[activity_logs] already exists.';
END
GO
