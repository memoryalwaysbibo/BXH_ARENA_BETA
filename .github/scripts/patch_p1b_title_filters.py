from pathlib import Path

p = Path("index.html")
s = p.read_text(encoding="utf-8")
marker = "function renderPlayerTitleCenter(p){"
if marker not in s:
    raise SystemExit("renderPlayerTitleCenter not found")

if "let titleGalleryFilter='all';" not in s:
    s = s.replace(marker, "let titleGalleryFilter='all';\n" + marker, 1)

old = '''    <div class="panel-title" style="margin-top:20px;">稱號圖鑑</div>
    ${catalog.length?`<div class="title-gallery">${catalog.map(t=>{const got=earnedIds.has(t.id);const hidden=t.isHidden&&!got;const current=Number((t.progress&&t.progress.currentValue)||0),target=Math.max(1,Number(t.targetValue||1));const pct=got?100:Math.min(100,Math.round(current/target*100));return `<article class="title-card rarity-${esc(t.rarity||'common')} ${got?'':'locked'}"><div class="title-card-name"><span>${esc(hidden?'？？？':t.name)}</span><span class="rarity-badge rarity-${esc(t.rarity||'common')}">${esc(titleRarityLabel(t.rarity))}</span></div><div class="title-card-desc">${esc(hidden?(t.hint||'達成特殊條件後解鎖'):(t.description||t.hint||'榮譽稱號'))}</div>${!hidden?titleConditionBadge(t):''}${!hidden&&t.source?`<div class="hint">來源：${esc(t.source)}</div>`:''}<div class="title-progress"><span style="width:${pct}%"></span></div><div class="hint" style="margin-top:5px;">${got?'✓ 已取得':`${current}／${target}`}${t.isActive===false?'・籌備中':''}${t.isLimited?'・限定':''}${t.isArchived?'・已絕版':''}</div></article>`;}).join("")}</div>`:`<div class="empty-state">稱號圖鑑尚未發布；已取得紀錄不會受到影響。</div>`}
'''
new = '''    <div class="panel-title" style="margin-top:20px;">稱號圖鑑</div>
    ${catalog.length?(()=>{const filters=[['all','全部'],['earned','已取得'],['official','官方積分賽'],['event','主辦成就'],['activity','每日簽到'],['special','限定／特殊']];const shown=catalog.filter(t=>{if(titleGalleryFilter==='all')return true;if(titleGalleryFilter==='earned')return earnedIds.has(t.id);return titleConditionMeta(t).category===titleGalleryFilter;});return `<div class="btn-row" style="margin:10px 0 12px;gap:6px;flex-wrap:wrap;">${filters.map(([k,v])=>`<button type="button" class="btn ${titleGalleryFilter===k?'btn-primary':'btn-ghost'} btn-sm" onclick="titleGalleryFilter='${k}';render();">${v}</button>`).join('')}</div>${shown.length?`<div class="title-gallery">${shown.map(t=>{const got=earnedIds.has(t.id);const hidden=t.isHidden&&!got;const current=Number((t.progress&&t.progress.currentValue)||0),target=Math.max(1,Number(t.targetValue||1));const pct=got?100:Math.min(100,Math.round(current/target*100));return `<article class="title-card rarity-${esc(t.rarity||'common')} ${got?'':'locked'}"><div class="title-card-name"><span>${esc(hidden?'？？？':t.name)}</span><span class="rarity-badge rarity-${esc(t.rarity||'common')}">${esc(titleRarityLabel(t.rarity))}</span></div><div class="title-card-desc">${esc(hidden?(t.hint||'達成特殊條件後解鎖'):(t.description||t.hint||'榮譽稱號'))}</div>${!hidden?titleConditionBadge(t):''}${!hidden&&t.source?`<div class="hint">來源：${esc(t.source)}</div>`:''}<div class="title-progress"><span style="width:${pct}%"></span></div><div class="hint" style="margin-top:5px;">${got?'✓ 已取得':`${current}／${target}`}${t.isActive===false?'・籌備中':''}${t.isLimited?'・限定':''}${t.isArchived?'・已絕版':''}</div></article>`;}).join('')}</div>`:`<div class="empty-state">此分類目前沒有稱號。</div>`}`;})():`<div class="empty-state">稱號圖鑑尚未發布；已取得紀錄不會受到影響。</div>`}
'''

if "titleGalleryFilter==='all'" not in s:
    if old not in s:
        raise SystemExit("P1-A title gallery block not found")
    s = s.replace(old, new, 1)

checks = [
    "let titleGalleryFilter='all';",
    "['official','官方積分賽']",
    "['activity','每日簽到']",
    "['special','限定／特殊']",
    "此分類目前沒有稱號。",
]
for check in checks:
    if check not in s:
        raise SystemExit(f"verification failed: {check}")

p.write_text(s, encoding="utf-8")
print("P1-B patch verified")
