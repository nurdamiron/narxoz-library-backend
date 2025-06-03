const mysql = require('mysql2/promise');

async function showSchema() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: 'biz360.czwiyugwum02.eu-north-1.rds.amazonaws.com',
      user: 'root',
      password: 'nurda0101',
      database: 'narxoz_library'
    });

    console.log('\n=====================================================');
    console.log('           NARXOZ LIBRARY DATABASE SCHEMA            ');
    console.log('=====================================================\n');

    // Get tables
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'narxoz_library'
      ORDER BY table_name
    `);

    // Process each table
    for (const table of tables) {
      const tableName = table.table_name || table.TABLE_NAME;
      
      console.log(`\n\x1b[1;36m== TABLE: ${tableName} ==\x1b[0m`);
      
      // Get columns
      const [columns] = await connection.query(`
        SELECT 
          column_name, 
          column_type, 
          is_nullable, 
          column_key, 
          column_default, 
          extra
        FROM 
          information_schema.columns 
        WHERE 
          table_schema = 'narxoz_library' 
          AND table_name = ?
        ORDER BY 
          ordinal_position
      `, [tableName]);

      // Display columns
      console.log('\x1b[1;33mCOLUMNS:\x1b[0m');
      for (const col of columns) {
        const name = col.column_name || col.COLUMN_NAME;
        const type = col.column_type || col.COLUMN_TYPE;
        const nullable = (col.is_nullable || col.IS_NULLABLE) === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.column_key || col.COLUMN_KEY;
        const extra = col.extra || col.EXTRA;

        let keyStr = '';
        if (key === 'PRI') keyStr = '🔑 PRIMARY KEY';
        else if (key === 'UNI') keyStr = '🔒 UNIQUE';
        else if (key === 'MUL') keyStr = '🔗 INDEX';

        console.log(`  \x1b[1m${name}\x1b[0m: ${type} ${nullable} ${keyStr} ${extra}`);
      }

      // Get foreign keys
      const [foreignKeys] = await connection.query(`
        SELECT
          column_name,
          constraint_name,
          referenced_table_name,
          referenced_column_name
        FROM
          information_schema.key_column_usage
        WHERE
          table_schema = 'narxoz_library'
          AND table_name = ?
          AND referenced_table_name IS NOT NULL
      `, [tableName]);

      // Display foreign keys
      if (foreignKeys.length > 0) {
        console.log('\x1b[1;33mFOREIGN KEYS:\x1b[0m');
        for (const fk of foreignKeys) {
          const column = fk.column_name || fk.COLUMN_NAME;
          const constraint = fk.constraint_name || fk.CONSTRAINT_NAME;
          const refTable = fk.referenced_table_name || fk.REFERENCED_TABLE_NAME;
          const refColumn = fk.referenced_column_name || fk.REFERENCED_COLUMN_NAME;

          console.log(`  \x1b[1m${column}\x1b[0m → ${refTable}.${refColumn} (${constraint})`);
        }
      }
    }

    // Display relationship summary
    console.log('\n\x1b[1;36m=====================================================');
    console.log('              TABLE RELATIONSHIPS SUMMARY              ');
    console.log('=====================================================\x1b[0m\n');

    for (const table of tables) {
      const tableName = table.table_name || table.TABLE_NAME;
      
      // Get foreign keys
      const [foreignKeys] = await connection.query(`
        SELECT
          column_name,
          referenced_table_name,
          referenced_column_name
        FROM
          information_schema.key_column_usage
        WHERE
          table_schema = 'narxoz_library'
          AND table_name = ?
          AND referenced_table_name IS NOT NULL
      `, [tableName]);

      if (foreignKeys.length > 0) {
        console.log(`\x1b[1m${tableName}\x1b[0m has references to:`);
        for (const fk of foreignKeys) {
          const column = fk.column_name || fk.COLUMN_NAME;
          const refTable = fk.referenced_table_name || fk.REFERENCED_TABLE_NAME;
          const refColumn = fk.referenced_column_name || fk.REFERENCED_COLUMN_NAME;

          console.log(`  - ${column} → ${refTable}.${refColumn}`);
        }
        console.log('');
      }
    }

    // Close connection
    await connection.end();

  } catch (error) {
    console.error('Error showing schema:', error);
  }
}

// Run the function
showSchema();