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
      document.body.appendChild(layer);
    }
    return layer;
  }
  function hide(){
    const layer = document.getElementById(OVERLAY_ID);
    if (layer) layer.classList.remove('show');
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
    const size = parseInt(getComputedStyle(layer).width) || 320;
    let left = rect.right + 8;
    if (left + size > vw) left = rect.left - size - 8;
    if (left < 4) left = 4;
    let top = rect.top + rect.height/2 - size/2;
    if (top + size > vh) top = vh - size - 8;
    if (top < 4) top = 4;
    layer.style.left = left + 'px';
    layer.style.top = top + 'px';
    requestAnimationFrame(()=>layer.classList.add('show'));
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick, true);
  }
  window.thumbPreview = { show, hide };
})();
