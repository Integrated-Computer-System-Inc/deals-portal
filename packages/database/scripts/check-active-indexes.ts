import { prisma } from '../src/index';

async function checkIndexes() {
  console.log('=== Checking Current Indexes in SQL Server ===\n');
  const indexes: any = await prisma.$queryRawUnsafe(`
    SELECT 
      t.name AS TableName,
      i.name AS IndexName,
      i.type_desc AS IndexType,
      i.is_primary_key AS IsPK,
      i.is_unique AS IsUnique,
      STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) AS KeyColumns
    FROM sys.indexes i
    INNER JOIN sys.tables t ON i.object_id = t.object_id
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE ic.is_included_column = 0
    GROUP BY t.name, i.name, i.type_desc, i.is_primary_key, i.is_unique
    ORDER BY t.name, i.name;
  `);

  console.table(indexes);
}

checkIndexes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
