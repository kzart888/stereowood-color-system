(function(window) {
    'use strict';

    function buildCustomColorsPrintHTML(options) {
        const { paletteGroups = [], colorCount = 0, baseURL = window.location.origin } = options || {};
        const groupCount = paletteGroups.length;
        const resolvedBase = baseURL || window.location.origin;

        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>自配色列表</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            background: white;
        }
        .print-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .print-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .print-stats {
            font-size: 14px;
            color: #666;
        }
        .print-main {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .print-group {
            display: grid;
            grid-template-columns: 30px 1fr;
            gap: 12px;
            margin: 0;
        }
        .print-group.group-spacing {
            margin-top: 8px;
        }
        .print-group-label {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 13px;
            font-weight: 600;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            padding: 8px 4px;
            border-radius: 4px;
            min-height: 100px;
        }
        .print-colors {
            display: grid;
            grid-template-columns: repeat(10, 80px);
            gap: 8px;
            padding: 0;
        }
        .print-color-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .print-color-block {
            width: 80px;
            height: 80px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
        }
        .print-color-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .print-no-image {
            color: #999;
            font-size: 10px;
            text-align: center;
            padding: 4px;
        }
        .print-color-name {
            font-size: 11px;
            font-weight: 500;
            text-align: center;
            max-width: 80px;
            word-wrap: break-word;
        }
        @media print {
            body {
                margin: 0;
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <div class="print-title">自配色列表</div>
        <div class="print-stats">共${colorCount}个颜色，${groupCount}个分类</div>
    </div>
    <div class="print-main">`;

        paletteGroups.forEach((group, groupIndex) => {
            html += `
        <div class="print-group${groupIndex > 0 ? ' group-spacing' : ''}">
            <div class="print-group-label">${group.categoryName}</div>
            <div class="print-colors">`;

            group.colors.forEach(color => {
                const imageUrl = color.image_path ? `${resolvedBase.replace(/\/$/, '')}/uploads/${color.image_path}` : null;
                const imageHtml = imageUrl
                    ? `<img src="${imageUrl}" class="print-color-image" onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\\'print-no-image\\'>图片加载失败</div>'" />`
                    : `<div class="print-no-image">未上传<br/>图片</div>`;

                html += `
                <div class="print-color-item">
                    <div class="print-color-block">${imageHtml}</div>
                    <div class="print-color-name">${color.color_code}</div>
                </div>`;
            });

            html += `
            </div>
        </div>`;
        });

        html += `
    </div>
</body>
</html>`;

        return html;
    }

    window.buildCustomColorsPrintHTML = buildCustomColorsPrintHTML;
})(window);
