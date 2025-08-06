// 数据库初始化脚本 - 插入示例数据
// 运行命令: node init-data.js

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('color_management.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
        process.exit(1);
    } else {
        console.log('数据库连接成功，开始初始化示例数据...');
        initSampleData();
    }
});

function initSampleData() {
    // 1. 插入颜色分类数据
    const categories = [
        ['BU', '蓝色系'],
        ['YE', '黄色系'],
        ['RD', '红色系'],
        ['GN', '绿色系'],
        ['VT', '紫色系']
    ];
    
    console.log('插入颜色分类数据...');
    const categoryStmt = db.prepare('INSERT OR IGNORE INTO color_categories (code, name) VALUES (?, ?)');
    categories.forEach(category => {
        categoryStmt.run(category);
    });
    categoryStmt.finalize();
    
    // 2. 插入蒙马特颜色数据
    const montMarteColors = [
        '朱红',
        '桔黄',
        '橘红',
        '钛白',
        '象牙黑',
        '紫红',
        '天蓝',
        '柠檬黄',
        '深绿',
        '紫罗兰',
        '灰色',
        '棕色',
        '粉红',
        '海绿',
        '土黄'
    ];
    
    console.log('插入蒙马特颜色数据...');
    const montMarteStmt = db.prepare('INSERT OR IGNORE INTO mont_marte_colors (name) VALUES (?)');
    montMarteColors.forEach(colorName => {
        montMarteStmt.run(colorName);
    });
    montMarteStmt.finalize();
    
    // 3. 插入自配颜色示例数据
    const customColors = [
        [1, 'BU001', '蓝5g 白2g', '078-蝶恋花(4)(8)(12)'],
        [1, 'BU002', '天蓝8g 白1g', '009-星芒(2)(6)'],
        [1, 'BU003', '天蓝10g 紫红2g', '078-蝶恋花(1)(3)'],
        [2, 'YE001', '柠檬黄6g 白1g', '009-星芒(1)(5)'],
        [2, 'YE002', '桔黄5g 朱红1g', '078-蝶恋花(7)(9)'],
        [3, 'RD001', '朱红8g 黑1g', '009-星芒(3)(4)'],
        [3, 'RD002', '紫红10g 白2g', '078-蝶恋花(2)(10)'],
        [4, 'GN001', '深绿7g 白3g', '009-星芒(7)(8)'],
        [4, 'GN002', '海绿5g 黄2g', '078-蝶恋花(5)(11)'],
        [5, 'VT001', '紫罗兰6g 白2g', '009-星芒(9)(10)']
    ];
    
    console.log('插入自配颜色示例数据...');
    const customColorStmt = db.prepare(`
        INSERT OR IGNORE INTO custom_colors (category_id, color_code, formula, applicable_layers) 
        VALUES (?, ?, ?, ?)
    `);
    customColors.forEach(color => {
        customColorStmt.run(color);
    });
    customColorStmt.finalize();
    
    // 4. 插入作品示例数据
    const artworks = [
        ['078', '蝶恋花'],
        ['009', '星芒'],
        ['156', '太极鱼'],
        ['234', '山水意境'],
        ['089', '花鸟图']
    ];
    
    console.log('插入作品示例数据...');
    const artworkStmt = db.prepare('INSERT OR IGNORE INTO artworks (code, name) VALUES (?, ?)');
    artworks.forEach(artwork => {
        artworkStmt.run(artwork);
    });
    artworkStmt.finalize();
    
    // 等待所有插入完成后插入配色方案
    setTimeout(() => {
        insertColorSchemes();
    }, 1000);
}

function insertColorSchemes() {
    // 5. 插入配色方案示例数据
    const colorSchemes = [
        [1, '金黄'],      // 078-蝶恋花
        [1, '蓝棕'],
        [1, '南海岸'],
        [1, '标准'],
        [2, '金黄'],      // 009-星芒
        [2, '蓝棕'],
        [2, '标准'],
        [3, '经典'],      // 156-太极鱼
        [3, '现代'],
        [4, '传统'],      // 234-山水意境
        [4, '简约'],
        [5, '春色'],      // 089-花鸟图
        [5, '秋韵']
    ];
    
    console.log('插入配色方案示例数据...');
    const schemeStmt = db.prepare('INSERT OR IGNORE INTO color_schemes (artwork_id, scheme_name) VALUES (?, ?)');
    colorSchemes.forEach(scheme => {
        schemeStmt.run(scheme);
    });
    schemeStmt.finalize();
    
    // 等待配色方案插入完成后插入层号数据
    setTimeout(() => {
        insertSchemeLayers();
    }, 1000);
}

function insertSchemeLayers() {
    // 6. 插入配色方案层号数据示例
    const schemeLayers = [
        // 078-蝶恋花 金黄方案 (scheme_id: 1)
        [1, 1, 1],   // 第1层使用BU001
        [1, 2, 4],   // 第2层使用YE001
        [1, 3, 1],   // 第3层使用BU001
        [1, 4, 1],   // 第4层使用BU001
        [1, 5, 4],   // 第5层使用YE001
        
        // 078-蝶恋花 蓝棕方案 (scheme_id: 2)
        [2, 1, 1],   // 第1层使用BU001
        [2, 2, 7],   // 第2层使用RD002
        [2, 3, 3],   // 第3层使用BU003
        [2, 4, 1],   // 第4层使用BU001
        
        // 009-星芒 金黄方案 (scheme_id: 5)
        [5, 1, 4],   // 第1层使用YE001
        [5, 2, 2],   // 第2层使用BU002
        [5, 3, 6],   // 第3层使用RD001
        [5, 4, 6],   // 第4层使用RD001
        [5, 5, 4],   // 第5层使用YE001
        
        // 009-星芒 蓝棕方案 (scheme_id: 6)
        [6, 1, 2],   // 第1层使用BU002
        [6, 2, 2],   // 第2层使用BU002
        [6, 3, 6],   // 第3层使用RD001
        [6, 4, 6],   // 第4层使用RD001
        [6, 5, 2]    // 第5层使用BU002
    ];
    
    console.log('插入配色方案层号数据...');
    const layerStmt = db.prepare('INSERT OR IGNORE INTO scheme_layers (scheme_id, layer_number, custom_color_id) VALUES (?, ?, ?)');
    schemeLayers.forEach(layer => {
        layerStmt.run(layer);
    });
    layerStmt.finalize();
    
    console.log('示例数据初始化完成！');
    console.log('');
    console.log('=== 已插入的示例数据 ===');
    console.log('- 5个颜色分类 (蓝色系、黄色系、红色系、绿色系、紫色系)');
    console.log('- 15种蒙马特颜色');
    console.log('- 10个自配颜色');
    console.log('- 5个作品');
    console.log('- 13个配色方案');
    console.log('- 多个层号-颜色对应关系');
    console.log('');
    console.log('现在可以启动服务器了：npm start');
    
    db.close();
}