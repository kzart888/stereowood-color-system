-- 数据库索引优化
-- 添加索引以提升查询性能

-- ===== 分类表索引 =====
-- 分类名称索引（用于快速查找）
CREATE INDEX IF NOT EXISTS idx_categories_name 
ON categories(name);

-- ===== 自配颜色表索引 =====
-- 颜色编码索引（唯一且频繁查询）
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_colors_code 
ON custom_colors(color_code);

-- 分类ID索引（用于按分类筛选）
CREATE INDEX IF NOT EXISTS idx_custom_colors_category 
ON custom_colors(category_id);

-- 更新时间索引（用于按时间排序）
CREATE INDEX IF NOT EXISTS idx_custom_colors_updated 
ON custom_colors(updated_at DESC);

-- 配方索引（用于查重）
CREATE INDEX IF NOT EXISTS idx_custom_colors_formula 
ON custom_colors(formula);

-- ===== 作品表索引 =====
-- 作品名称索引
CREATE INDEX IF NOT EXISTS idx_artworks_name 
ON artworks(name);

-- 更新时间索引（用于按时间排序）
CREATE INDEX IF NOT EXISTS idx_artworks_updated 
ON artworks(updated_at DESC);

-- ===== 配色方案表索引 =====
-- 作品ID索引（用于关联查询）
CREATE INDEX IF NOT EXISTS idx_schemes_artwork 
ON color_schemes(artwork_id);

-- 方案名称索引
CREATE INDEX IF NOT EXISTS idx_schemes_name 
ON color_schemes(name);

-- 复合索引：作品ID + 更新时间（用于获取作品的最新方案）
CREATE INDEX IF NOT EXISTS idx_schemes_artwork_updated 
ON color_schemes(artwork_id, updated_at DESC);

-- ===== 层映射表索引 =====
-- 方案ID索引（用于关联查询）
CREATE INDEX IF NOT EXISTS idx_layers_scheme 
ON scheme_layers(scheme_id);

-- 颜色编码索引（用于查找颜色使用情况）
CREATE INDEX IF NOT EXISTS idx_layers_color_code 
ON scheme_layers(color_code);

-- 复合索引：方案ID + 层号（用于获取方案的层映射）
CREATE INDEX IF NOT EXISTS idx_layers_scheme_layer 
ON scheme_layers(scheme_id, layer_number);

-- 复合索引：颜色编码 + 方案ID（用于查找颜色在哪些方案中使用）
CREATE INDEX IF NOT EXISTS idx_layers_color_scheme 
ON scheme_layers(color_code, scheme_id);

-- ===== 蒙马特颜色表索引 =====
-- 颜色编码索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_mont_marte_code 
ON mont_marte_colors(color_code);

-- 颜色名称索引
CREATE INDEX IF NOT EXISTS idx_mont_marte_name 
ON mont_marte_colors(color_name);

-- 更新时间索引
CREATE INDEX IF NOT EXISTS idx_mont_marte_updated 
ON mont_marte_colors(updated_at DESC);

-- ===== 历史记录表索引（如果存在） =====
-- 注：这些表可能不存在，使用IF EXISTS确保安全

-- 颜色历史索引
CREATE INDEX IF NOT EXISTS idx_color_history_color_id 
ON color_history(color_id, created_at DESC);

-- 作品历史索引
CREATE INDEX IF NOT EXISTS idx_artwork_history_artwork_id 
ON artwork_history(artwork_id, created_at DESC);

-- ===== 分析和统计 =====
-- 使用ANALYZE更新统计信息，帮助查询优化器做出更好的决策
ANALYZE categories;
ANALYZE custom_colors;
ANALYZE artworks;
ANALYZE color_schemes;
ANALYZE scheme_layers;
ANALYZE mont_marte_colors;

-- ===== 查看索引效果 =====
-- 列出所有索引
SELECT 
    name as index_name,
    tbl_name as table_name,
    sql as create_sql
FROM sqlite_master 
WHERE type = 'index' 
    AND name NOT LIKE 'sqlite_%'
ORDER BY tbl_name, name;