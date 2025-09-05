#!/usr/bin/env node
/**
 * Fix corrupted Chinese category names in the database
 * Run this script to restore proper Chinese characters
 */

const { db } = require('./db/index');

const correctNames = {
  1: '蓝色系',
  2: '黄色系', 
  3: '红色系',
  4: '绿色系',
  5: '紫色系',
  11: '色精',
  82: '其他'
};

console.log('Starting category name fix...\n');

let completed = 0;
const total = Object.keys(correctNames).length;

Object.entries(correctNames).forEach(([id, name]) => {
  db.run('UPDATE color_categories SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
    [name, parseInt(id)], 
    function(err) {
      completed++;
      
      if (err) {
        console.error(`❌ Failed to update category ${id}:`, err.message);
      } else if (this.changes === 0) {
        console.warn(`⚠️  Category ${id} not found in database`);
      } else {
        console.log(`✅ Fixed category ${id}: ${name}`);
      }
      
      // Close database when all updates are complete
      if (completed === total) {
        console.log('\nAll updates completed. Closing database...');
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database closed successfully.');
          }
        });
      }
    }
  );
});