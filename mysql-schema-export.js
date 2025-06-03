const mysql = require('mysql2/promise');
const fs = require('fs');

async function exportSchema() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: 'biz360.czwiyugwum02.eu-north-1.rds.amazonaws.com',
      user: 'root',
      password: 'nurda0101',
      database: 'narxoz_library'
    });

    console.log('Connected to database. Exporting schema...');

    // Get tables
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'narxoz_library'
    `);

    const schema = {};

    // Get columns for each table
    for (const table of tables) {
      const tableName = table.table_name || table.TABLE_NAME;
      
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

      schema[tableName] = {
        columns: columns.map(col => ({
          name: col.column_name || col.COLUMN_NAME,
          type: col.column_type || col.COLUMN_TYPE,
          nullable: col.is_nullable === 'YES' || col.IS_NULLABLE === 'YES',
          key: col.column_key || col.COLUMN_KEY,
          default: col.column_default || col.COLUMN_DEFAULT,
          extra: col.extra || col.EXTRA
        })),
        foreignKeys: foreignKeys.map(fk => ({
          column: fk.column_name || fk.COLUMN_NAME,
          constraint: fk.constraint_name || fk.CONSTRAINT_NAME,
          referencedTable: fk.referenced_table_name || fk.REFERENCED_TABLE_NAME,
          referencedColumn: fk.referenced_column_name || fk.REFERENCED_COLUMN_NAME
        }))
      };
    }

    // Close the connection
    await connection.end();

    // Write the schema to a file
    fs.writeFileSync('db-schema.json', JSON.stringify(schema, null, 2));
    
    // Generate HTML visualization
    generateHtmlDiagram(schema);

    console.log('Schema exported to db-schema.json and db-schema.html');
  } catch (error) {
    console.error('Error exporting schema:', error);
  }
}

function generateHtmlDiagram(schema) {
  // Create the HTML content
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Narxoz Library Database Schema</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .tables {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    .table {
      border: 1px solid #ccc;
      border-radius: 5px;
      width: 350px;
      margin-bottom: 20px;
    }
    .table-header {
      background-color: #f0f0f0;
      padding: 10px;
      font-weight: bold;
      font-size: 16px;
      border-bottom: 1px solid #ccc;
    }
    .table-body {
      padding: 0;
    }
    .column {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
      display: flex;
      align-items: center;
    }
    .column:last-child {
      border-bottom: none;
    }
    .column-pk {
      color: #0066cc;
      font-weight: bold;
    }
    .column-fk {
      color: #00894d;
      font-weight: bold;
    }
    .column-type {
      color: #666;
      font-size: 12px;
      margin-left: 10px;
    }
    .fk-list {
      margin-top: 10px;
      padding: 10px;
      background-color: #f9f9f9;
      border-top: 1px dashed #ccc;
      font-size: 12px;
    }
    .fk-item {
      margin-bottom: 5px;
      color: #00894d;
    }
    .relationships {
      margin-top: 40px;
    }
    .relationships h2 {
      margin-bottom: 20px;
    }
    .relationship {
      margin-bottom: 10px;
      padding: 10px;
      border: 1px solid #eee;
      border-radius: 5px;
    }
    .export-options {
      margin-top: 20px;
      text-align: center;
    }
    .export-btn {
      padding: 10px 20px;
      background-color: #0066cc;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin: 0 10px;
    }
    .export-btn:hover {
      background-color: #0052a3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Narxoz Library Database Schema</h1>
    
    <div class="tables">
      ${Object.entries(schema).map(([tableName, table]) => `
        <div class="table">
          <div class="table-header">${tableName}</div>
          <div class="table-body">
            ${table.columns.map(col => `
              <div class="column ${col.key === 'PRI' ? 'column-pk' : col.key === 'MUL' ? 'column-fk' : ''}">
                ${col.name} <span class="column-type">${col.type}</span>
                ${col.key === 'PRI' ? '🔑' : col.key === 'MUL' ? '🔗' : ''}
              </div>
            `).join('')}
            
            ${table.foreignKeys.length > 0 ? `
              <div class="fk-list">
                <strong>Foreign Keys:</strong>
                ${table.foreignKeys.map(fk => `
                  <div class="fk-item">
                    ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="relationships">
      <h2>Table Relationships</h2>
      
      ${Object.entries(schema)
        .filter(([_, table]) => table.foreignKeys.length > 0)
        .map(([tableName, table]) => `
          <div class="relationship">
            <strong>${tableName}</strong> has references to:
            <ul>
              ${table.foreignKeys.map(fk => `
                <li>${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}</li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
    </div>
    
    <div class="export-options">
      <h3>Export Options</h3>
      <button class="export-btn" onclick="printSchema()">Print Schema</button>
      <button class="export-btn" onclick="downloadAsPDF()">Download as PDF</button>
    </div>
  </div>

  <script>
    function printSchema() {
      window.print();
    }
    
    function downloadAsPDF() {
      alert('This feature requires a PDF generation library. For now, you can use the browser\'s print function and save as PDF.');
      window.print();
    }
  </script>
</body>
</html>`;

  // Write to file
  fs.writeFileSync('db-schema.html', html);
}

// Run the export
exportSchema();