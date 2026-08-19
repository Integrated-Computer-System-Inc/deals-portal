-- ==========================================================
-- Migration / Creation Script for DealRenewal Table (MSSQL)
-- ==========================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DealRenewal]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DealRenewal] (
        [renewalID]    INT NOT NULL,
        [dealID]       INT NOT NULL,
        [dtRenewal]    DATE NULL,
        [rexpDt]       DATE NULL,
        [remarks]      VARCHAR(MAX) NULL,
        [dtCreated]    DATETIME NULL CONSTRAINT [DF_DealRenewal_dtCreated] DEFAULT (GETDATE()),
        CONSTRAINT [PK_DealRenewal] PRIMARY KEY CLUSTERED ([renewalID] ASC),
        CONSTRAINT [FK_DealRenewal_DealHeader] FOREIGN KEY ([dealID]) 
            REFERENCES [dbo].[DealHeader] ([dealID]) ON DELETE CASCADE
    );

    CREATE NONCLUSTERED INDEX [IX_DealRenewal_dealID] ON [dbo].[DealRenewal] ([dealID] ASC);
    CREATE NONCLUSTERED INDEX [IX_DealRenewal_dtRenewal] ON [dbo].[DealRenewal] ([dtRenewal] ASC);
    
    PRINT 'Table [dbo].[DealRenewal] and indexes created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[DealRenewal] already exists.';
END
GO
