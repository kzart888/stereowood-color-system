// 运行数据库迁移脚本
// backend/db/run-migration.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 数据库路径
const dbPath = path.join(__dirname, '..', 'color_management.db');
const migrationPath = path.join(__dirname, 'migrations', 'add_indexes.sql');

// 读取迁移SQL
const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

// 连接数据库
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('无法连接数据库:', err);
        process.exit(1);
    }
    console.log('已连接到数据库');
});

// 分割SQL语句（SQLite不支持一次执行多条语句）
const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

// 执行迁移
let completed = 0;
let errors = [];

console.log(`准备执行 ${statements.length} 条SQL语句...`);

// 串行执行每条语句
function executeStatements(index = 0) {
    if (index >= statements.length) {
        // 所有语句执行完毕
        if (errors.length > 0) {
            console.error('\n执行过程中遇到错误:');
            errors.forEach(err => console.error(`- ${err}`));
        }
        
        console.log(`\n迁移完成: ${completed} 成功, ${errors.length} 失败`);
        
        // 关闭数据库
        db.close((err) => {
            if (err) {
                console.error('关闭数据库时出错:', err);
            } else {
                console.log('数据库连接已关闭');
            }
            process.exit(errors.length > 0 ? 1 : 0);
        });
        return;
    }
    
    const stmt = statements[index];
    
    // 跳过SELECT语句（仅用于查看结果）
    if (stmt.toUpperCase().startsWith('SELECT')) {
        db.all(stmt, [], (err, rows) => {
            if (err) {
                console.error(`执行查询失败: ${stmt.substring(0, 50)}...`);
                errors.push(err.message);
            } else {
                console.log(`查询结果 (${rows.length} 行):`);
                rows.forEach(row => console.log('  ', row));
                completed++;
            }
            executeStatements(index + 1);
        });
    } else {
        db.run(stmt, [], (err) => {
            if (err) {
                // 某些索引可能已存在，这不是错误
                if (err.message.includes('already exists')) {
                    console.log(`✓ 索引已存在: ${stmt.substring(0, 50)}...`);
                    completed++;
                } else {
                    console.error(`✗ 执行失败: ${stmt.substring(0, 50)}...`);
                    console.error(`  错误: ${err.message}`);
                    errors.push(err.message);
                }
            } else {
                console.log(`✓ 成功执行: ${stmt.substring(0, 50)}...`);
                completed++;
            }
            
            // 继续下一条语句
            executeStatements(index + 1);
        });
    }
}

// 开始执行
executeStatements();