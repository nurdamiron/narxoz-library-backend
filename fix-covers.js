/**
 * Script to fix book covers in the database.
 * Run with: node fix-covers.js
 */

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const db = require('./src/models');

// First clone the existing cover that works to serve as fallback
async function cloneExistingCover() {
  try {
    const coversDir = path.join(__dirname, 'public/uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
      console.log(`📂 Created covers directory: ${coversDir}`);
    }
    
    // Get list of existing files
    const existingFiles = fs.readdirSync(coversDir);
    console.log(`📚 Found ${existingFiles.length} cover files on disk`);
    
    if (existingFiles.length === 0) {
      console.log('⚠️ No cover files found to clone');
      return false;
    }
    
    // Use the first image as a template
    const sourcePath = path.join(coversDir, existingFiles[0]);
    
    // Create a default cover
    const defaultCoverPath = path.join(coversDir, 'no-image.png');
    
    if (!fs.existsSync(defaultCoverPath)) {
      fs.copyFileSync(sourcePath, defaultCoverPath);
      console.log(`✅ Created default cover: ${defaultCoverPath}`);
    } else {
      console.log(`ℹ️ Default cover already exists: ${defaultCoverPath}`);
    }
    
    return '/uploads/covers/no-image.png';
  } catch (error) {
    console.error(`❌ Error cloning existing cover: ${error.message}`);
    return false;
  }
}

// Fix book covers in the database
async function fixBookCovers() {
  try {
    // Get the default cover path
    const defaultCover = await cloneExistingCover();
    
    console.log('📚 Fetching all books from database...');
    const books = await db.Book.findAll();
    console.log(`📚 Found ${books.length} books in database`);
    
    // Count of covers fixed
    let fixedCount = 0;
    let alreadyOkCount = 0;
    
    // Iterate through all books
    for (const book of books) {
      console.log(`📘 Processing book ${book.id}: ${book.title}`);
      
      // Check if book has a cover
      if (!book.cover) {
        console.log(`⚠️ Book ${book.id} has no cover, setting default`);
        await book.update({ cover: defaultCover });
        fixedCount++;
        continue;
      }
      
      // Check if the cover is relative path starting with /uploads/
      if (book.cover.startsWith('/uploads/')) {
        console.log(`✅ Book ${book.id} already has proper relative path: ${book.cover}`);
        alreadyOkCount++;
        
        // Get just the filename
        const filename = book.cover.split('/').pop();
        
        // Check if file exists
        const filePath = path.join(__dirname, 'public', book.cover);
        const fileExists = fs.existsSync(filePath);
        
        if (!fileExists) {
          console.log(`⚠️ Cover file doesn't exist: ${filePath}`);
          
          // Get the existing covers
          const coversDir = path.join(__dirname, 'public/uploads/covers');
          const existingFiles = fs.readdirSync(coversDir);
          
          if (existingFiles.length > 0) {
            // Copy the first file with this filename
            const sourcePath = path.join(coversDir, existingFiles[0]);
            fs.copyFileSync(sourcePath, filePath);
            console.log(`✅ Created cover file copy: ${filePath}`);
          }
        }
        
        continue;
      }
      
      // If cover is full URL containing /uploads/
      if (book.cover.includes('/uploads/')) {
        console.log(`🔄 Converting full URL to relative path: ${book.cover}`);
        
        // Extract the relative path
        const matches = book.cover.match(/\/uploads\/.*$/);
        if (matches && matches[0]) {
          const relativePath = matches[0];
          console.log(`🔄 Extracted relative path: ${relativePath}`);
          
          await book.update({ cover: relativePath });
          fixedCount++;
          
          // Check if file exists
          const filePath = path.join(__dirname, 'public', relativePath);
          const fileExists = fs.existsSync(filePath);
          
          if (!fileExists) {
            console.log(`⚠️ Cover file doesn't exist: ${filePath}`);
            
            // Ensure directory exists 
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            // Get the existing covers
            const coversDir = path.join(__dirname, 'public/uploads/covers');
            const existingFiles = fs.readdirSync(coversDir);
            
            if (existingFiles.length > 0) {
              // Copy the first file with this filename
              const sourcePath = path.join(coversDir, existingFiles[0]);
              fs.copyFileSync(sourcePath, filePath);
              console.log(`✅ Created cover file copy: ${filePath}`);
            }
          }
          
          continue;
        }
      }
      
      // If it's an external URL, convert to relative and default
      if (book.cover.startsWith('http')) {
        console.log(`🔄 Converting external URL to default: ${book.cover}`);
        await book.update({ cover: defaultCover });
        fixedCount++;
        continue;
      }
      
      // Any other format, set to default
      console.log(`🔄 Unknown format, setting default: ${book.cover}`);
      await book.update({ cover: defaultCover });
      fixedCount++;
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`📚 Total books: ${books.length}`);
    console.log(`✅ Books already OK: ${alreadyOkCount}`);
    console.log(`🔄 Books fixed: ${fixedCount}`);
    
  } catch (error) {
    console.error(`❌ Error fixing book covers: ${error.message}`);
  } finally {
    // Close database connection
    await db.sequelize.close();
    console.log('📝 Database connection closed');
  }
}

// Run the fix
fixBookCovers()
  .then(() => {
    console.log('✅ Fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error(`❌ Error running fix: ${error.message}`);
    process.exit(1);
  });