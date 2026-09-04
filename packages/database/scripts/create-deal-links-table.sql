-- ==========================================================
-- Migration / Creation Script for DealLinks Table (MSSQL)
-- ==========================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DealLinks]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DealLinks] (
        [id]             INT NOT NULL,
        [dealID]         INT NOT NULL,
        [previousDealID] INT NOT NULL,
        [dtCreated]      DATETIME NULL CONSTRAINT [DF_DealLinks_dtCreated] DEFAULT (GETDATE()),
        CONSTRAINT [PK_DealLinks] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_DealLinks_DealHeader_Current] FOREIGN KEY ([dealID]) 
            REFERENCES [dbo].[DealHeader] ([dealID]) ON DELETE CASCADE,
        CONSTRAINT [FK_DealLinks_DealHeader_Previous] FOREIGN KEY ([previousDealID]) 
            REFERENCES [dbo].[DealHeader] ([dealID])
    );

    CREATE NONCLUSTERED INDEX [IX_DealLinks_dealID] ON [dbo].[DealLinks] ([dealID] ASC);
    CREATE NONCLUSTERED INDEX [IX_DealLinks_previousDealID] ON [dbo].[DealLinks] ([previousDealID] ASC);
    
    PRINT 'Table [dbo].[DealLinks] and indexes created successfully.';
END
ELSE
BEGIN
    PRINT 'Table [dbo].[DealLinks] already exists.';
END
GO
