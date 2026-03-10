/**
 * 作品业务逻辑服务
 * 职责：处理作品和配色方案相关的业务逻辑
 * 引用：被 routes/artworks.js 使用
 * @module services/ArtworkService
 */

const artworkQueries = require('../db/queries/artworks');
const { db } = require('../db/index');
const AuditService = require('../domains/audit/service');
const UploadImageService = require('./upload-image-service');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const {
    detectExtension,
    normalizeUploadedOriginalName,
    normalizeSourceModifiedAtInput,
    resolveAssetFileTypeLabel,
} = require('../domains/shared/asset-file-utils');

const MAX_SCHEME_ASSETS = 6;
const MAX_TEXT_PREVIEW_CHARS = 30000;
const MAX_TABLE_PREVIEW_ROWS = 120;
const MAX_TABLE_PREVIEW_COLS = 16;
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const REPLACEMENT_CHAR_RE = /\uFFFD/g;
const CJK_CHAR_RE = /[\u3400-\u9FFF]/g;
const DOC_MIME_SET = new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
]);

function stripLeadingBom(text) {
    return String(text || '').replace(/^\uFEFF/, '');
}

function printableRatio(text) {
    const value = String(text || '');
    if (!value) {
        return 1;
    }

    let printable = 0;
    for (const char of value) {
        const code = char.codePointAt(0);
        if (code === 0x09 || code === 0x0A || code === 0x0D) {
            printable += 1;
            continue;
        }
        if (code >= 0x20 && code !== 0x7F) {
            printable += 1;
        }
    }
    return printable / value.length;
}

function decodeUtf16Be(buffer) {
    let input = buffer;
    if (input.length >= 2 && input[0] === 0xFE && input[1] === 0xFF) {
        input = input.subarray(2);
    }
    const normalizedLength = input.length - (input.length % 2);
    const swapped = Buffer.allocUnsafe(normalizedLength);
    for (let index = 0; index < normalizedLength; index += 2) {
        swapped[index] = input[index + 1];
        swapped[index + 1] = input[index];
    }
    return stripLeadingBom(swapped.toString('utf16le'));
}

function decodeTextBuffer(buffer, encoding) {
    if (encoding === 'utf8') {
        const input =
            buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF
                ? buffer.subarray(3)
                : buffer;
        return stripLeadingBom(input.toString('utf8'));
    }

    if (encoding === 'utf16le') {
        const input =
            buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE
                ? buffer.subarray(2)
                : buffer;
        return stripLeadingBom(input.toString('utf16le'));
    }

    if (encoding === 'utf16be') {
        return decodeUtf16Be(buffer);
    }

    if (encoding === 'gb18030') {
        const decoder = new TextDecoder('gb18030');
        return stripLeadingBom(decoder.decode(buffer));
    }

    throw new Error(`Unsupported text encoding: ${encoding}`);
}

function scoreDecodedText(text, options = {}) {
    const value = String(text || '');
    const replacementCount = (value.match(REPLACEMENT_CHAR_RE) || []).length;
    const cjkCount = (value.match(CJK_CHAR_RE) || []).length;
    const ratio = printableRatio(value);

    let score = 0;
    score -= replacementCount * 1000;
    score += ratio * 200;
    if (options.preferCjk && cjkCount > 0) {
        score += Math.min(cjkCount, 500);
    }
    if (options.bomPreferred) {
        score += 600;
    }

    return {
        score,
        replacementCount,
        cjkCount,
        printableRatio: ratio,
    };
}

function shouldPreferCjkDecoding(buffer) {
    if (!buffer || buffer.length === 0) {
        return false;
    }
    const sample = buffer.subarray(0, Math.min(buffer.length, 2048));
    let highByteCount = 0;
    for (const byte of sample) {
        if (byte >= 0x80) {
            highByteCount += 1;
        }
    }
    return highByteCount / sample.length >= 0.2;
}

function detectBomEncoding(buffer) {
    if (!buffer || buffer.length < 2) {
        return null;
    }
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'utf8';
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf16le';
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf16be';
    }
    return null;
}

function decodeTextPreviewBuffer(buffer) {
    const bomEncoding = detectBomEncoding(buffer);
    const preferCjk = shouldPreferCjkDecoding(buffer);
    const candidates = [];
    const addCandidate = (encoding, bomPreferred = false) => {
        if (!encoding || candidates.some((item) => item.encoding === encoding)) {
            return;
        }
        candidates.push({ encoding, bomPreferred });
    };

    if (bomEncoding) {
        addCandidate(bomEncoding, true);
    }
    addCandidate('utf8');
    addCandidate('gb18030');
    addCandidate('utf16le');
    addCandidate('utf16be');

    let best = null;
    for (const candidate of candidates) {
        try {
            const decoded = decodeTextBuffer(buffer, candidate.encoding);
            const metrics = scoreDecodedText(decoded, {
                preferCjk,
                bomPreferred: candidate.bomPreferred,
            });
            if (!best || metrics.score > best.metrics.score) {
                best = {
                    text: decoded,
                    metrics,
                };
            }
        } catch {
            // ignore unsupported/invalid decoder path and continue with next candidate
        }
    }

    if (best && typeof best.text === 'string') {
        return best.text;
    }
    return buffer.toString('utf8');
}

function createArtworkError(message, statusCode, code, extra = {}) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (code) {
        error.code = code;
    }
    Object.assign(error, extra);
    return error;
}

class ArtworkService {
    /**
     * 获取所有作品
     */
    async getAllArtworks() {
        try {
            const rows = await artworkQueries.getAllArtworks();
            const artworks = this.formatArtworkData(rows);
            const schemeIds = [];

            artworks.forEach((artwork) => {
                (artwork.schemes || []).forEach((scheme) => {
                    schemeIds.push(scheme.id);
                });
            });

            if (schemeIds.length === 0) {
                return artworks;
            }

            const assets = await artworkQueries.getSchemeAssetsForSchemeIds(schemeIds);
            const assetsByScheme = new Map();
            assets.forEach((asset) => {
                const normalized = this.toPublicSchemeAsset(asset);
                if (!assetsByScheme.has(normalized.scheme_id)) {
                    assetsByScheme.set(normalized.scheme_id, []);
                }
                assetsByScheme.get(normalized.scheme_id).push(normalized);
            });

            artworks.forEach((artwork) => {
                (artwork.schemes || []).forEach((scheme) => {
                    scheme.related_assets = assetsByScheme.get(scheme.id) || [];
                });
            });

            return artworks;
        } catch (error) {
            throw new Error(`获取作品列表失败: ${error.message}`);
        }
    }

    /**
     * 格式化作品数据结构
     */
    formatArtworkData(rows) {
        const artworksMap = new Map();
        
        rows.forEach(row => {
            if (!artworksMap.has(row.id)) {
                artworksMap.set(row.id, {
                    id: row.id,
                    code: row.code,
                    name: row.name,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    schemes: []
                });
            }
            
            const artwork = artworksMap.get(row.id);
            
            if (row.scheme_id) {
                let scheme = artwork.schemes.find(s => s.id === row.scheme_id);
                if (!scheme) {
                    scheme = {
                        id: row.scheme_id,
                        name: row.scheme_name,  // Frontend expects 'name' not 'scheme_name'
                        thumbnail_path: row.thumbnail_path,
                        thumbnail_thumb_path: UploadImageService.resolveAvailableThumbnailName(row.thumbnail_path),
                        initial_thumbnail_path: row.initial_thumbnail_path,  // Include initial thumbnail
                        initial_thumbnail_thumb_path: UploadImageService.resolveAvailableThumbnailName(row.initial_thumbnail_path),
                        version: row.scheme_version ?? null,
                        created_at: row.scheme_created_at,
                        updated_at: row.scheme_updated_at,
                        layers: [],
                        related_assets: []
                    };
                    artwork.schemes.push(scheme);
                }
                
                if (row.layer_number) {
                    scheme.layers.push({
                        layer: row.layer_number,  // Frontend expects 'layer' not 'layer_number'
                        colorCode: row.color_code ?? null,  // Frontend expects 'colorCode'
                        custom_color_id: row.custom_color_id ?? null,  // Keep for backend reference
                        formula: row.formula ?? null,
                        manualFormula: row.manual_formula ?? null
                    });
                }
            }
        });
        
        return Array.from(artworksMap.values());
    }

    toPublicSchemeAsset(asset) {
        if (!asset) return null;
        const assetType = this.resolveAssetType(asset.mime_type, asset.file_path, asset.asset_type);
        const isImage = assetType === 'image';
        const normalizedName = normalizeUploadedOriginalName(asset.original_name || asset.file_path || '');
        return {
            id: asset.id,
            scheme_id: asset.scheme_id,
            asset_type: assetType,
            original_name: normalizedName || asset.file_path,
            file_path: asset.file_path,
            mime_type: asset.mime_type || null,
            file_size: Number.isFinite(asset.file_size) ? asset.file_size : null,
            source_modified_at: asset.source_modified_at || null,
            file_type_label: resolveAssetFileTypeLabel(asset),
            sort_order: Number.isFinite(asset.sort_order) ? asset.sort_order : 0,
            created_at: asset.created_at || null,
            updated_at: asset.updated_at || null,
            is_image: isImage,
            thumb_path: isImage ? UploadImageService.resolveAvailableThumbnailName(asset.file_path) : null,
        };
    }

    resolveAssetType(mimeType, filePath, fallbackType = null) {
        if (UploadImageService.isImageMimeOrPath(mimeType, filePath)) {
            return 'image';
        }
        if (DOC_MIME_SET.has(String(mimeType || '').toLowerCase())) {
            return 'document';
        }
        if (fallbackType === 'image' || fallbackType === 'document') {
            return fallbackType;
        }
        return 'document';
    }

    /**
     * 创建新作品
     */
    async createArtwork(artworkData, context = {}) {
        try {
            const artworkId = await artworkQueries.createArtwork(artworkData);
            const created = await artworkQueries.getArtworkById(artworkId);
            await AuditService.recordEntityChangeSafe({
                entityType: 'artwork',
                entityId: artworkId,
                action: 'create',
                before: null,
                after: created,
                summary: 'Created artwork.',
                context,
            });
            return created;
        } catch (error) {
            if (error.message.includes('UNIQUE')) {
                throw new Error('Artwork code already exists.');
            }
            throw new Error(`创建作品失败: ${error.message}`);
        }
    }

    /**
     * 删除作品
     */
    async deleteArtwork(id, context = {}) {
        try {
            const existingArtwork = await artworkQueries.getArtworkById(id);
            const schemes = await artworkQueries.getArtworkSchemes(id);
            const schemeIds = [...new Set((schemes || []).map((scheme) => scheme.id).filter(Boolean))];
            const schemeAssets = schemeIds.length > 0
                ? await artworkQueries.getSchemeAssetsForSchemeIds(schemeIds)
                : [];

            const filesToDelete = new Set();
            for (const scheme of schemes) {
                if (scheme.thumbnail_path) {
                    filesToDelete.add(scheme.thumbnail_path);
                }
                if (scheme.initial_thumbnail_path) {
                    filesToDelete.add(scheme.initial_thumbnail_path);
                }
            }
            for (const asset of schemeAssets) {
                if (asset.file_path) {
                    filesToDelete.add(asset.file_path);
                }
            }

            for (const filePath of filesToDelete) {
                await this.deleteUploadedImage(filePath);
            }

            const changes = await artworkQueries.deleteArtwork(id);
            if (changes > 0) {
                await AuditService.recordEntityChangeSafe({
                    entityType: 'artwork',
                    entityId: Number(id),
                    action: 'delete',
                    before: {
                        artwork: existingArtwork,
                        schemes,
                    },
                    after: null,
                    summary: 'Deleted artwork.',
                    context,
                });
            }
            return { success: changes > 0, deletedId: id };
        } catch (error) {
            throw new Error(`删除作品失败: ${error.message}`);
        }
    }

    /**
     * 将颜色代码转换为颜色 ID
     */
    async convertColorCodesToIds(layers) {
        if (!layers || !layers.length) return [];
        
        const convertedLayers = [];
        for (const layer of layers) {
            // Handle both frontend format (layer, colorCode) and backend format (layer_number, custom_color_id)
            const layerNumber = layer.layer || layer.layer_number;
            let colorId = layer.custom_color_id;
            const manualFormula =
                typeof layer.manualFormula === 'string'
                    ? layer.manualFormula.trim()
                    : typeof layer.manual_formula === 'string'
                      ? layer.manual_formula.trim()
                      : null;
            
            // If we have colorCode but not custom_color_id, look it up
            if (layer.colorCode && !layer.custom_color_id) {
                if (layer.colorCode) {
                    // Look up the color ID from the database
                    const color = await new Promise((resolve, reject) => {
                        db.get(
                            `SELECT id FROM custom_colors WHERE color_code = ?`,
                            [layer.colorCode],
                            (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            }
                        );
                    });
                    colorId = color ? color.id : null;
                }
            }
            
            if (layerNumber && (colorId || manualFormula)) {
                convertedLayers.push({
                    layer_number: layerNumber,
                    custom_color_id: colorId ?? null,
                    manual_formula: manualFormula || null
                });
            }
        }
        return convertedLayers;
    }

    /**
     * 创建配色方案
     */
    async createScheme(schemeData, context = {}) {
        try {
            const convertedLayers = await this.convertColorCodesToIds(schemeData.layers);
            const dataWithConvertedLayers = {
                ...schemeData,
                layers: convertedLayers
            };

            const schemeId = await artworkQueries.createScheme(dataWithConvertedLayers);
            const createdScheme = await artworkQueries.getSchemeWithLayers(schemeId);
            if (createdScheme) {
                createdScheme.related_assets = [];
            }
            await AuditService.recordEntityChangeSafe({
                entityType: 'color_scheme',
                entityId: schemeId,
                action: 'create',
                before: null,
                after: createdScheme,
                summary: 'Created color scheme.',
                context,
            });
            return { id: schemeId, ...schemeData };
        } catch (error) {
            throw new Error(`创建配色方案失败: ${error.message}`);
        }
    }

    /**
     * 更新配色方案
     */
    async updateScheme(schemeId, schemeData, expectedVersion = null, context = {}) {
        const existingScheme = await artworkQueries.getSchemeWithLayers(schemeId);
        if (!existingScheme) {
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }
        existingScheme.related_assets = (await artworkQueries.getSchemeAssets(schemeId)).map((asset) =>
            this.toPublicSchemeAsset(asset)
        );

        if (expectedVersion !== null && expectedVersion !== undefined && expectedVersion !== '') {
            const parsedVersion = Number.parseInt(expectedVersion, 10);
            if (!Number.isInteger(parsedVersion) || parsedVersion < 0) {
                throw createArtworkError('version must be a non-negative integer.', 400, 'VALIDATION_ERROR');
            }
            if (existingScheme.version !== parsedVersion) {
                throw createArtworkError('Scheme has been modified by another request.', 409, 'VERSION_CONFLICT', {
                    entityType: 'color_scheme',
                    expectedVersion: parsedVersion,
                    actualVersion: existingScheme.version,
                    latestData: existingScheme,
                });
            }
            expectedVersion = parsedVersion;
        } else {
            expectedVersion = null;
        }

        const convertedLayers = await this.convertColorCodesToIds(schemeData.layers);
        const dataWithConvertedLayers = {
            ...schemeData,
            layers: convertedLayers
        };

        const changes = await artworkQueries.updateScheme(schemeId, dataWithConvertedLayers, expectedVersion);
            if (changes === 0) {
                if (expectedVersion !== null) {
                    const latestScheme = await artworkQueries.getSchemeWithLayers(schemeId);
                    if (latestScheme) {
                        latestScheme.related_assets = (await artworkQueries.getSchemeAssets(schemeId)).map((asset) =>
                            this.toPublicSchemeAsset(asset)
                        );
                    }
                    throw createArtworkError('Scheme has been modified by another request.', 409, 'VERSION_CONFLICT', {
                        entityType: 'color_scheme',
                        expectedVersion,
                        actualVersion: latestScheme ? latestScheme.version : null,
                        latestData: latestScheme,
                });
            }
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }

        const updatedScheme = await artworkQueries.getSchemeWithLayers(schemeId);
        if (updatedScheme) {
            updatedScheme.related_assets = (await artworkQueries.getSchemeAssets(schemeId)).map((asset) =>
                this.toPublicSchemeAsset(asset)
            );
        }
        try {
            await artworkQueries.archiveSchemeHistory(existingScheme, {
                changeAction: 'UPDATE',
                actorId: context.actorId,
                actorName: context.actorName,
                requestId: context.requestId,
                source: context.source,
            });
        } catch (archiveError) {
            console.warn('Scheme history archive failed (update):', archiveError.message);
        }
        await AuditService.recordEntityChangeSafe({
            entityType: 'color_scheme',
            entityId: Number(schemeId),
            action: 'update',
            before: existingScheme,
            after: updatedScheme,
            summary: 'Updated color scheme.',
            context,
        });
        return { success: true };
    }

    /**
     * 删除配色方案
     */
    async deleteScheme(schemeId, context = {}) {
        try {
            const scheme = await artworkQueries.getSchemeById(schemeId);
            const existingScheme = await artworkQueries.getSchemeWithLayers(schemeId);
            const schemeAssets = await artworkQueries.getSchemeAssets(schemeId);
            if (existingScheme) {
                existingScheme.related_assets = schemeAssets.map((asset) => this.toPublicSchemeAsset(asset));
            }

            if (scheme) {
                if (scheme.thumbnail_path) {
                    await this.deleteUploadedImage(scheme.thumbnail_path);
                }
                if (scheme.initial_thumbnail_path) {
                    await this.deleteUploadedImage(scheme.initial_thumbnail_path);
                }
            }
            for (const asset of schemeAssets) {
                if (asset.file_path) {
                    await this.deleteUploadedImage(asset.file_path);
                }
            }

            const changes = await artworkQueries.deleteScheme(schemeId);
            if (changes > 0 && existingScheme) {
                try {
                    await artworkQueries.archiveSchemeHistory(existingScheme, {
                        changeAction: 'DELETE',
                        actorId: context.actorId,
                        actorName: context.actorName,
                        requestId: context.requestId,
                        source: context.source,
                    });
                } catch (archiveError) {
                    console.warn('Scheme history archive failed (delete):', archiveError.message);
                }
            }
            if (changes > 0) {
                await AuditService.recordEntityChangeSafe({
                    entityType: 'color_scheme',
                    entityId: Number(schemeId),
                    action: 'delete',
                    before: existingScheme,
                    after: null,
                    summary: 'Deleted color scheme.',
                    context,
                });
            }
            return { success: changes > 0, deletedId: schemeId };
        } catch (error) {
            throw new Error(`删除配色方案失败: ${error.message}`);
        }
    }

    async listSchemeAssets(artworkId, schemeId) {
        const scheme = await artworkQueries.getSchemeById(schemeId);
        if (!scheme || Number(scheme.artwork_id) !== Number(artworkId)) {
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }
        const assets = await artworkQueries.getSchemeAssets(schemeId);
        return assets.map((asset) => this.toPublicSchemeAsset(asset));
    }

    async resolveSchemeAssetFileContext(artworkId, schemeId, assetId) {
        const scheme = await artworkQueries.getSchemeById(schemeId);
        if (!scheme || Number(scheme.artwork_id) !== Number(artworkId)) {
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }

        const asset = await artworkQueries.getSchemeAssetById(assetId);
        if (!asset || Number(asset.scheme_id) !== Number(schemeId)) {
            throw createArtworkError('Asset not found.', 404, 'NOT_FOUND');
        }

        const storedName = UploadImageService.normalizeUploadName(asset.file_path);
        if (!storedName) {
            throw createArtworkError('Asset file not found.', 404, 'NOT_FOUND');
        }

        const absolutePath = path.join(UPLOADS_DIR, storedName);
        try {
            await fs.access(absolutePath);
        } catch {
            throw createArtworkError('Asset file not found.', 404, 'NOT_FOUND');
        }

        return { scheme, asset, storedName, absolutePath };
    }

    async getSchemeAssetDownloadPayload(artworkId, schemeId, assetId) {
        const { asset, storedName, absolutePath } = await this.resolveSchemeAssetFileContext(
            artworkId,
            schemeId,
            assetId
        );
        const originalName = normalizeUploadedOriginalName(asset.original_name || '');
        const downloadName = String(originalName || storedName).slice(0, 255);

        return {
            absolutePath,
            filePath: storedName,
            mimeType: asset.mime_type || null,
            downloadName,
        };
    }

    async getSchemeAssetPreviewPayload(artworkId, schemeId, assetId) {
        const { asset, absolutePath } = await this.resolveSchemeAssetFileContext(
            artworkId,
            schemeId,
            assetId
        );
        const extension = detectExtension(asset.original_name || asset.file_path);
        const basePayload = {
            asset: this.toPublicSchemeAsset(asset),
            preview: {
                kind: 'unsupported',
                warning: '当前文件类型暂不支持内置预览，可使用“下载”后查看。',
            },
        };

        try {
            if (asset.is_image || this.resolveAssetType(asset.mime_type, asset.file_path, asset.asset_type) === 'image') {
                basePayload.preview = {
                    kind: 'image',
                    warning: null,
                };
                return basePayload;
            }

            if (extension === 'txt' || extension === 'md') {
                const rawBuffer = await fs.readFile(absolutePath);
                const text = decodeTextPreviewBuffer(rawBuffer);
                const trimmedText = String(text || '').slice(0, MAX_TEXT_PREVIEW_CHARS);
                basePayload.preview = {
                    kind: 'text',
                    text: trimmedText,
                    truncated: String(text || '').length > trimmedText.length,
                };
                return basePayload;
            }

            if (extension === 'docx') {
                const result = await mammoth.extractRawText({ path: absolutePath });
                const text = String(result?.value || '').trim();
                basePayload.preview = {
                    kind: 'text',
                    text: text.slice(0, MAX_TEXT_PREVIEW_CHARS),
                    truncated: text.length > MAX_TEXT_PREVIEW_CHARS,
                    warning: null,
                };
                return basePayload;
            }

            if (extension === 'xlsx' || extension === 'xls') {
                const workbook = XLSX.readFile(absolutePath, { cellDates: true });
                const firstSheetName = Array.isArray(workbook.SheetNames) ? workbook.SheetNames[0] : null;
                if (!firstSheetName || !workbook.Sheets[firstSheetName]) {
                    basePayload.preview = {
                        kind: 'unsupported',
                        warning: '表格内容为空，可使用“下载”后查看。',
                    };
                    return basePayload;
                }

                const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
                    header: 1,
                    raw: false,
                    defval: '',
                    blankrows: false,
                });
                const rows = matrix.slice(0, MAX_TABLE_PREVIEW_ROWS).map((row) =>
                    (Array.isArray(row) ? row : [row]).slice(0, MAX_TABLE_PREVIEW_COLS)
                );

                basePayload.preview = {
                    kind: 'table',
                    sheetName: firstSheetName,
                    rows,
                    truncated:
                        matrix.length > MAX_TABLE_PREVIEW_ROWS ||
                        matrix.some((row) => Array.isArray(row) && row.length > MAX_TABLE_PREVIEW_COLS),
                };
                return basePayload;
            }

            if (extension === 'doc') {
                basePayload.preview = {
                    kind: 'unsupported',
                    warning: 'DOC 老格式暂不支持内置解析，请使用“下载”后查看。',
                };
                return basePayload;
            }
        } catch (error) {
            basePayload.preview = {
                kind: 'unsupported',
                warning: `预览解析失败：${error.message || '未知错误'}，可使用“下载”后查看。`,
            };
            return basePayload;
        }

        return basePayload;
    }

    async addSchemeAsset(artworkId, schemeId, file, context = {}, options = {}) {
        const scheme = await artworkQueries.getSchemeById(schemeId);
        if (!scheme || Number(scheme.artwork_id) !== Number(artworkId)) {
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }
        if (!file || !file.filename) {
            throw createArtworkError('Asset file is required.', 400, 'VALIDATION_ERROR');
        }

        const existingCount = await artworkQueries.countSchemeAssets(schemeId);
        if (existingCount >= MAX_SCHEME_ASSETS) {
            throw createArtworkError(`A scheme can have at most ${MAX_SCHEME_ASSETS} related assets.`, 400, 'ASSET_LIMIT');
        }

        const currentAssets = await artworkQueries.getSchemeAssets(schemeId);
        const nextOrder = currentAssets.length > 0
            ? Math.max(...currentAssets.map((asset) => Number(asset.sort_order) || 0)) + 1
            : 1;
        const assetType = this.resolveAssetType(file.mimetype, file.originalname, null);
        const originalName = normalizeUploadedOriginalName(file.originalname || file.filename || '');
        const normalizedSourceModifiedAt = normalizeSourceModifiedAtInput(options.sourceModifiedAt);

        await artworkQueries.createSchemeAsset({
            scheme_id: schemeId,
            asset_type: assetType,
            original_name: originalName || file.filename,
            file_path: file.filename,
            mime_type: file.mimetype || null,
            file_size: Number.isFinite(file.size) ? file.size : null,
            source_modified_at: normalizedSourceModifiedAt,
            sort_order: nextOrder,
        });

        if (assetType === 'image') {
            await UploadImageService.ensureThumbnailForUpload(file);
        }

        const latestAssets = await artworkQueries.getSchemeAssets(schemeId);
        const createdAsset = latestAssets.find((asset) => asset.file_path === file.filename) || latestAssets[latestAssets.length - 1];
        const payload = this.toPublicSchemeAsset(createdAsset);

        await AuditService.recordEntityChangeSafe({
            entityType: 'color_scheme',
            entityId: Number(schemeId),
            action: 'update',
            before: null,
            after: { related_asset: payload, operation: 'asset_add' },
            summary: 'Added related asset.',
            context,
        });

        return payload;
    }

    async deleteSchemeAsset(artworkId, schemeId, assetId, context = {}) {
        const scheme = await artworkQueries.getSchemeById(schemeId);
        if (!scheme || Number(scheme.artwork_id) !== Number(artworkId)) {
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }
        const asset = await artworkQueries.getSchemeAssetById(assetId);
        if (!asset || Number(asset.scheme_id) !== Number(schemeId)) {
            throw createArtworkError('Asset not found.', 404, 'NOT_FOUND');
        }

        const changes = await artworkQueries.deleteSchemeAsset(assetId, schemeId);
        if (changes === 0) {
            throw createArtworkError('Asset not found.', 404, 'NOT_FOUND');
        }

        await this.deleteUploadedImage(asset.file_path);

        await AuditService.recordEntityChangeSafe({
            entityType: 'color_scheme',
            entityId: Number(schemeId),
            action: 'update',
            before: { related_asset: this.toPublicSchemeAsset(asset), operation: 'asset_delete' },
            after: null,
            summary: 'Deleted related asset.',
            context,
        });

        return { success: true, deletedId: Number(assetId) };
    }

    async reorderSchemeAssets(artworkId, schemeId, orderedIds = [], context = {}) {
        const scheme = await artworkQueries.getSchemeById(schemeId);
        if (!scheme || Number(scheme.artwork_id) !== Number(artworkId)) {
            throw createArtworkError('Scheme not found.', 404, 'NOT_FOUND');
        }

        const assets = await artworkQueries.getSchemeAssets(schemeId);
        const currentIds = assets.map((asset) => Number(asset.id)).sort((a, b) => a - b);
        const requestedIds = (orderedIds || []).map((id) => Number(id)).sort((a, b) => a - b);

        if (currentIds.length !== requestedIds.length || currentIds.some((id, idx) => id !== requestedIds[idx])) {
            throw createArtworkError('Reorder payload must include all existing asset ids exactly once.', 400, 'VALIDATION_ERROR');
        }

        const updates = (orderedIds || []).map((id, index) => ({
            id: Number(id),
            sort_order: index + 1,
        }));

        await artworkQueries.reorderSchemeAssets(schemeId, updates);

        const after = (await artworkQueries.getSchemeAssets(schemeId)).map((asset) => this.toPublicSchemeAsset(asset));
        await AuditService.recordEntityChangeSafe({
            entityType: 'color_scheme',
            entityId: Number(schemeId),
            action: 'update',
            before: assets.map((asset) => this.toPublicSchemeAsset(asset)),
            after,
            summary: 'Reordered related assets.',
            context,
        });

        return after;
    }

    /**
     * 删除上传的图片文件
     */
    async deleteUploadedImage(imagePath) {
        if (!imagePath) return;
        await UploadImageService.deleteUploadAndThumbnail(imagePath);
    }
}

module.exports = new ArtworkService();



