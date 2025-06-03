const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');
const models = require('./src/models');

async function generateDatabaseDiagram() {
  console.log('Generating database diagram...');
  
  // Get all model definitions
  const modelDefinitions = [];
  
  Object.keys(models).forEach(modelName => {
    if (modelName === 'sequelize' || modelName === 'Sequelize') return;
    
    const model = models[modelName];
    if (!model) return;
    
    const attributes = [];
    const associations = [];
    
    // Get attributes
    for (const [attrName, attrDef] of Object.entries(model.rawAttributes)) {
      attributes.push({
        name: attrName,
        type: attrDef.type ? attrDef.type.toString().replace('DATATYPE::', '') : 'UNKNOWN',
        primaryKey: attrDef.primaryKey || false,
        allowNull: attrDef.allowNull !== false,
        defaultValue: attrDef.defaultValue,
      });
    }
    
    // Get associations
    if (model.associations) {
      for (const [assocName, assoc] of Object.entries(model.associations)) {
        associations.push({
          name: assocName,
          type: assoc.associationType,
          target: assoc.target.name,
          foreignKey: assoc.foreignKey,
        });
      }
    }
    
    modelDefinitions.push({
      name: modelName,
      tableName: model.tableName || modelName,
      attributes,
      associations,
    });
  });
  
  // Generate diagram data
  const diagramData = {
    models: modelDefinitions,
    timestamp: new Date().toISOString(),
  };
  
  // Save diagram data
  fs.writeFileSync(
    path.join(__dirname, 'database-diagram.json'),
    JSON.stringify(diagramData, null, 2)
  );
  
  // Generate HTML visualization
  const html = generateHtml(diagramData);
  fs.writeFileSync(
    path.join(__dirname, 'database-diagram.html'),
    html
  );
  
  console.log('Database diagram generated:');
  console.log('- JSON: database-diagram.json');
  console.log('- HTML: database-diagram.html');
}

function generateHtml(data) {
  return `<!DOCTYPE html>
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
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .models {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
    }
    .model {
      border: 1px solid #ccc;
      border-radius: 5px;
      width: 300px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .model-header {
      background-color: #f5f5f5;
      padding: 10px;
      border-bottom: 1px solid #ccc;
      font-weight: bold;
      text-align: center;
    }
    .model-body {
      padding: 10px;
    }
    .attribute {
      padding: 5px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    .attribute:last-child {
      border-bottom: none;
    }
    .primary-key {
      font-weight: bold;
      color: #0066cc;
    }
    .associations {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #ccc;
    }
    .association {
      padding: 3px;
      font-size: 12px;
      color: #666;
    }
    #canvas-container {
      margin-top: 40px;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
    }
    canvas {
      background-color: #f9f9f9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Narxoz Library Database Schema</h1>
    
    <div class="models">
      ${data.models.map(model => `
        <div class="model">
          <div class="model-header">${model.name}</div>
          <div class="model-body">
            ${model.attributes.map(attr => `
              <div class="attribute ${attr.primaryKey ? 'primary-key' : ''}">
                ${attr.name}: ${attr.type} ${attr.primaryKey ? '(PK)' : ''} ${attr.allowNull ? '' : 'NOT NULL'}
              </div>
            `).join('')}
            
            <div class="associations">
              ${model.associations.map(assoc => `
                <div class="association">
                  ${assoc.type}: ${model.name} → ${assoc.target} (${assoc.name})
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div id="canvas-container">
      <canvas id="diagram" width="1200" height="800"></canvas>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const canvas = document.getElementById('diagram');
      const ctx = canvas.getContext('2d');
      const models = ${JSON.stringify(data.models)};
      
      // Resize canvas to fit container
      function resizeCanvas() {
        const container = document.getElementById('canvas-container');
        canvas.width = container.clientWidth;
        canvas.height = Math.max(800, models.length * 100);
      }
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      // Draw database diagram
      function drawDiagram() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const modelBoxes = {};
        const boxWidth = 180;
        const boxHeight = 30;
        const padding = 20;
        
        // Calculate positions
        let x = padding;
        let y = padding;
        const maxX = canvas.width - boxWidth - padding;
        
        models.forEach(model => {
          if (x > maxX) {
            x = padding;
            y += 150;
          }
          
          modelBoxes[model.name] = {
            x,
            y,
            width: boxWidth,
            height: boxHeight,
            model
          };
          
          x += boxWidth + 50;
        });
        
        // Draw models
        Object.values(modelBoxes).forEach(box => {
          // Draw box
          ctx.fillStyle = '#f5f5f5';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.fillRect(box.x, box.y, box.width, box.height);
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw model name
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(box.model.name, box.x + box.width / 2, box.y + box.height / 2);
        });
        
        // Draw associations
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        
        models.forEach(model => {
          const sourceBox = modelBoxes[model.name];
          
          model.associations.forEach(assoc => {
            const targetBox = modelBoxes[assoc.target];
            if (!targetBox) return;
            
            const startX = sourceBox.x + sourceBox.width / 2;
            const startY = sourceBox.y + sourceBox.height;
            const endX = targetBox.x + targetBox.width / 2;
            const endY = targetBox.y;
            
            // Draw arrow
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            // Draw curve
            const midY = (startY + endY) / 2;
            ctx.bezierCurveTo(
              startX, midY,
              endX, midY,
              endX, endY
            );
            
            ctx.stroke();
            
            // Draw arrowhead
            const arrowSize = 5;
            ctx.beginPath();
            ctx.moveTo(endX - arrowSize, endY + arrowSize);
            ctx.lineTo(endX, endY);
            ctx.lineTo(endX + arrowSize, endY + arrowSize);
            ctx.stroke();
            
            // Draw association type
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#666';
            ctx.fillText(
              assoc.type.replace('Association', ''),
              (startX + endX) / 2,
              midY - 5
            );
          });
        });
      }
      
      drawDiagram();
    });
  </script>
</body>
</html>`;
}

// Run the generator
generateDatabaseDiagram()
  .then(() => {
    console.log('Completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error generating database diagram:', err);
    process.exit(1);
  });