/**
 * 数据库恢复脚本
 * 用于从备份恢复 SQLite 数据库
 * 使用: npm run restore
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 数据库路径
const dbPath = path.join(__dirname, '../backend/color_management.db');
const dbWalPath = path.join(__dirname, '../backend/color_management.db-wal');
const dbShmPath = path.join(__dirname, '../backend/color_management.db-shm');

// 备份目录
const backupDir = path.join(__dirname, '../backups');

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 列出可用的备份
function listBackups() {
    if (!fs.existsSync(backupDir)) {
        console.log('❌ 备份目录不存在');
        return [];
    }
    
    const backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .sort()
        .reverse();
    
    if (backupFiles.length === 0) {
        console.log('❌ 没有找到备份文件');
        return [];
    }
    
    console.log('========================================');
    console.log('可用的备份文件:');
    console.log('========================================');
    
    backupFiles.forEach((file, index) => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        const modTime = stats.mtime.toLocaleString('zh-CN');
        
        console.log(`${index + 1}. ${file}`);
        console.log(`   大小: ${sizeMB} MB`);
        console.log(`   时间: ${modTime}`);
        console.log('');
    });
    
    return backupFiles;
}

// 执行恢复
function restoreBackup(backupFile) {
    const backupPath = path.join(backupDir, backupFile);
    
    if (!fs.existsSync(backupPath)) {
        console.error('❌ 备份文件不存在:', backupPath);
        return false;
    }
    
    try {
        // 备份当前数据库（如果存在）
        if (fs.existsSync(dbPath)) {
            const tempBackup = dbPath + '.before-restore';
            fs.copyFileSync(dbPath, tempBackup);
            console.log('✅ 当前数据库已备份到:', tempBackup);
        }
        
        // 删除现有的数据库文件
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        if (fs.existsSync(dbWalPath)) fs.unlinkSync(dbWalPath);
        if (fs.existsSync(dbShmPath)) fs.unlinkSync(dbShmPath);
        
        // 恢复数据库
        fs.copyFileSync(backupPath, dbPath);
        console.log('✅ 数据库已恢复:', dbPath);
        
        // 恢复 WAL 和 SHM 文件（如果存在）
        const backupWalPath = backupPath.replace('.db', '.db-wal');
        const backupShmPath = backupPath.replace('.db', '.db-shm');
        
        if (fs.existsSync(backupWalPath)) {
            fs.copyFileSync(backupWalPath, dbWalPath);
            console.log('✅ WAL文件已恢复');
        }
        
        if (fs.existsSync(backupShmPath)) {
            fs.copyFileSync(backupShmPath, dbShmPath);
            console.log('✅ SHM文件已恢复');
        }
        
        console.log('========================================');
        console.log('恢复完成!');
        console.log('恢复的备份:', backupFile);
        console.log('恢复时间:', new Date().toLocaleString('zh-CN'));
        console.log('========================================');
        console.log('⚠️  请重启服务器以使用恢复的数据库');
        
        return true;
    } catch (error) {
        console.error('❌ 恢复失败:', error.message);
        return false;
    }
}

// 主程序
async function main() {
    const backupFiles = listBackups();
    
    if (backupFiles.length === 0) {
        rl.close();
        return;
    }
    
    console.log('========================================');
    
    rl.question('请输入要恢复的备份编号 (输入 0 取消): ', (answer) => {
        const choice = parseInt(answer);
        
        if (choice === 0 || isNaN(choice)) {
            console.log('已取消恢复操作');
            rl.close();
            return;
        }
        
        if (choice < 1 || choice > backupFiles.length) {
            console.log('❌ 无效的选择');
            rl.close();
            return;
        }
        
        const selectedBackup = backupFiles[choice - 1];
        
        console.log('');
        console.log('⚠️  警告: 恢复操作将覆盖当前数据库!');
        console.log('选择的备份:', selectedBackup);
        console.log('');
        
        rl.question('确认恢复? (输入 yes 确认): ', (confirm) => {
            if (confirm.toLowerCase() === 'yes') {
                restoreBackup(selectedBackup);
            } else {
                console.log('已取消恢复操作');
            }
            rl.close();
        });
    });
}

// 运行主程序
main();