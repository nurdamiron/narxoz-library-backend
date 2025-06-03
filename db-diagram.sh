#!/bin/bash

# Database credentials
DB_HOST="biz360.czwiyugwum02.eu-north-1.rds.amazonaws.com"
DB_USER="root"
DB_PASS="nurda0101"
DB_NAME="narxoz_library"

echo "========================================"
echo "     NARXOZ LIBRARY DATABASE SCHEMA     "
echo "========================================"
echo

# Check if mysql client is installed
if ! command -v mysql &> /dev/null; then
    echo "MySQL client not installed. Installing alternative using Node.js..."
    
    # Create and run a temporary Node.js script
    cat > temp_schema.js << 'EOF'
const { execSync } = require('child_process');
const mysql = require('mysql2');

// Database credentials from script
const DB_HOST = process.argv[2];
const DB_USER = process.argv[3];
const DB_PASS = process.argv[4];
const DB_NAME = process.argv[5];

// Create connection
const connection = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME
});

// Connect to database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  
  // Get list of tables
  connection.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [DB_NAME],
    (err, tables) => {
      if (err) {
        console.error('Error fetching tables:', err.message);
        connection.end();
        process.exit(1);
      }
      
      let processedTables = 0;
      
      // Process each table
      tables.forEach(table => {
        const tableName = table.TABLE_NAME || table.table_name;
        console.log(`\n== TABLE: ${tableName} ==`);
        
        // Get table structure
        connection.query(
          `DESCRIBE ${tableName}`,
          (err, columns) => {
            if (err) {
              console.error(`Error fetching structure for ${tableName}:`, err.message);
            } else {
              // Display columns
              columns.forEach(col => {
                const key = col.Key === 'PRI' ? '(Primary Key)' : 
                           col.Key === 'MUL' ? '(Foreign Key)' : 
                           col.Key === 'UNI' ? '(Unique)' : '';
                console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${key} ${col.Default ? `DEFAULT '${col.Default}'` : ''}`);
              });
              
              // Get foreign keys
              connection.query(
                `SELECT
                  column_name,
                  referenced_table_name,
                  referenced_column_name
                FROM
                  information_schema.key_column_usage
                WHERE
                  table_schema = ? AND
                  table_name = ? AND
                  referenced_table_name IS NOT NULL`,
                [DB_NAME, tableName],
                (err, foreignKeys) => {
                  if (err) {
                    console.error(`Error fetching foreign keys for ${tableName}:`, err.message);
                  } else if (foreignKeys.length) {
                    console.log('  -- Foreign Keys:');
                    foreignKeys.forEach(fk => {
                      const column = fk.COLUMN_NAME || fk.column_name;
                      const refTable = fk.REFERENCED_TABLE_NAME || fk.referenced_table_name;
                      const refColumn = fk.REFERENCED_COLUMN_NAME || fk.referenced_column_name;
                      console.log(`    ${column} -> ${refTable}.${refColumn}`);
                    });
                  }
                  
                  // Check if all tables have been processed
                  processedTables++;
                  if (processedTables === tables.length) {
                    connection.end();
                  }
                }
              );
            }
          }
        );
      });
    }
  );
});
EOF

    # Install mysql2 if not already installed
    if ! npm list mysql2 &> /dev/null; then
        npm install mysql2 --no-fund --no-audit
    fi
    
    # Run the Node.js script
    node temp_schema.js "$DB_HOST" "$DB_USER" "$DB_PASS" "$DB_NAME"
    
    # Clean up
    rm temp_schema.js
else
    # Use mysql client directly
    mysql -h "$DB_HOST" -u "$DB_USER" "-p$DB_PASS" "$DB_NAME" -e "
    SELECT CONCAT('SHOW TABLES;') AS query
    UNION ALL
    SELECT CONCAT('DESCRIBE ', table_name, ';') AS query
    FROM information_schema.tables 
    WHERE table_schema = '$DB_NAME'
    UNION ALL
    SELECT CONCAT(
        'SELECT \"Foreign keys for ', table_name, ':\" AS \"\", ',
        'column_name AS \"Column\", ',
        'referenced_table_name AS \"References Table\", ',
        'referenced_column_name AS \"References Column\" ',
        'FROM information_schema.key_column_usage ',
        'WHERE table_schema = \"$DB_NAME\" ',
        'AND table_name = \"', table_name, '\" ',
        'AND referenced_table_name IS NOT NULL;'
    ) AS query
    FROM information_schema.tables 
    WHERE table_schema = '$DB_NAME';" | mysql -h "$DB_HOST" -u "$DB_USER" "-p$DB_PASS" "$DB_NAME"
fi

echo
echo "========================================"