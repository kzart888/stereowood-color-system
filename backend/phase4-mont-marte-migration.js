#!/usr/bin/env node
/**
 * Phase 4: Mont-Marte Integration
 * Migrate text categories to IDs and fix category names
 */

const { db } = require('./db/index');

console.log('Phase 4: Mont-Marte Category Migration\n');

// Step 1: Fix corrupted Chinese names in mont_marte_categories
const fixCategoryNames = () => {
  console.log('Step 1: Fixing Mont-Marte category names...');
  
  const updates = [
    { id: 1, name: '水性漆' },  // Water-based
    { id: 2, name: '油性漆' },  // Oil-based
    { id: 3, name: '其他' }     // Other
  ];
  
  let completed = 0;
  updates.forEach(update => {
    db.run('UPDATE mont_marte_categories SET name = ? WHERE id = ?', 
      [update.name, update.id], 
      function(err) {
        completed++;
        if (err) {
          console.error(`❌ Failed to update category ${update.id}:`, err.message);
        } else {
          console.log(`✅ Fixed category ${update.id}: ${update.name}`);
        }
        
        if (completed === updates.length) {
          migrateColors();
        }
      }
    );
  });
};

// Step 2: Migrate mont_marte_colors from text categories to category_id
const migrateColors = () => {
  console.log('\nStep 2: Migrating Mont-Marte colors to use category_id...');
  
  // First, check current structure
  db.all("PRAGMA table_info(mont_marte_colors)", (err, columns) => {
    if (err) {
      console.error('Error checking table structure:', err);
      db.close();
      return;
    }
    
    const hasCategory = columns.some(col => col.name === 'category');
    const hasCategoryId = columns.some(col => col.name === 'category_id');
    
    if (!hasCategoryId) {
      // Add category_id column if it doesn't exist
      db.run('ALTER TABLE mont_marte_colors ADD COLUMN category_id INTEGER', (err) => {
        if (err) {
          console.error('Error adding category_id column:', err);
          db.close();
          return;
        }
        console.log('✅ Added category_id column');
        updateCategoryIds(hasCategory);
      });
    } else {
      updateCategoryIds(hasCategory);
    }
  });
};

// Step 3: Update category_id based on text category values
const updateCategoryIds = (hasOldCategory) => {
  console.log('\nStep 3: Updating category IDs based on text categories...');
  
  if (hasOldCategory) {
    // Map text categories to IDs
    // 'acrylic' → Water-based (WB, id=1)
    // 'essence' → Oil-based (OB, id=2) or maybe should create ES category?
    // Others → Other (OT, id=3)
    
    const queries = [
      "UPDATE mont_marte_colors SET category_id = 1 WHERE category = 'acrylic'",
      "UPDATE mont_marte_colors SET category_id = 2 WHERE category = 'essence'",
      "UPDATE mont_marte_colors SET category_id = 3 WHERE category_id IS NULL"
    ];
    
    let completed = 0;
    queries.forEach((query, index) => {
      db.run(query, function(err) {
        completed++;
        if (err) {
          console.error(`❌ Query ${index + 1} failed:`, err.message);
        } else {
          console.log(`✅ Query ${index + 1}: Updated ${this.changes} rows`);
        }
        
        if (completed === queries.length) {
          verifyMigration();
        }
      });
    });
  } else {
    // No old category column, set all to "其他" for now
    db.run('UPDATE mont_marte_colors SET category_id = 3 WHERE category_id IS NULL', function(err) {
      if (err) {
        console.error('Error setting default category:', err);
      } else {
        console.log(`✅ Set ${this.changes} colors to "其他" category`);
      }
      verifyMigration();
    });
  }
};

// Step 4: Verify migration results
const verifyMigration = () => {
  console.log('\nStep 4: Verifying migration...');
  
  const query = `
    SELECT 
      mc.code as category_code,
      mc.name as category_name,
      COUNT(colors.id) as color_count
    FROM mont_marte_categories mc
    LEFT JOIN mont_marte_colors colors ON mc.id = colors.category_id
    GROUP BY mc.id
    ORDER BY mc.display_order
  `;
  
  db.all(query, (err, results) => {
    if (err) {
      console.error('Error verifying migration:', err);
    } else {
      console.log('\nCategory distribution after migration:');
      results.forEach(row => {
        console.log(`  ${row.category_code} (${row.category_name}): ${row.color_count} colors`);
      });
    }
    
    // Close database
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n✅ Phase 4 migration completed successfully!');
      }
    });
  });
};

// Start the migration
fixCategoryNames();