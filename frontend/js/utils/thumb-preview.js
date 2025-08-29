// 全局缩略图预览工具
// 用法：window.thumbPreview.show(event, imageURL)
// 自动：ESC 关闭、点击任意位置关闭、对话框上层 zIndex
(function(){
  if (window.thumbPreview) return;
  const OVERLAY_ID = 'thumbPreviewLayer';
  function ensureLayer(){
    let layer = document.getElementById(OVERLAY_ID);
    if (!layer){
      layer = document.createElement('div');
      layer.id = OVERLAY_ID;
      layer.className = 'thumb-preview-overlay';
      // Ensure proper styling
      layer.style.cssText = `
        position: fixed;
        width: 320px;
        height: 320px;
        background: #fff center/cover no-repeat;
        box-shadow: 0 6px 18px rgba(0,0,0,0.18);
        border: 2px solid #fff;
        border-radius: 8px;
        z-index: 4000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(layer);
    }
    return layer;
  }
  function hide(){
    const layer = document.getElementById(OVERLAY_ID);
    if (layer) {
      layer.style.opacity = '0';
      layer.style.pointerEvents = 'none';
      layer.classList.remove('show');
    }
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', onDocClick, true);
  }
  function onKey(e){ if (e.key === 'Escape') hide(); }
  function onDocClick(e){
    const layer = document.getElementById(OVERLAY_ID);
    if (!layer) return;
    // 任意点击关闭（包含内部）
    hide();
  }
  function show(ev, img){
    if (!img) return;
    const layer = ensureLayer();
    layer.style.backgroundImage = `url(${img})`;
    layer.style.zIndex = 4000; // 确保高于对话框
    
    const rect = ev.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const size = 320; // Fixed size instead of computed style
    
    let left = rect.right + 8;
    if (left + size > vw) left = rect.left - size - 8;
    if (left < 4) left = 4;
    let top = rect.top + rect.height/2 - size/2;
    if (top + size > vh) top = vh - size - 8;
    if (top < 4) top = 4;
    
    layer.style.left = left + 'px';
    layer.style.top = top + 'px';
    
    // Show the layer
    requestAnimationFrame(() => {
      layer.style.opacity = '1';
      layer.style.pointerEvents = 'auto';
      layer.classList.add('show');
    });
    
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick, true);
  }
  window.thumbPreview = { show, hide };
})();
