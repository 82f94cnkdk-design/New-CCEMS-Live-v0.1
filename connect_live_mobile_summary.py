from pathlib import Path

src = Path("journal-app-live-v36.js").read_text(encoding="utf-8")

marker = "function home(){"
stats = '''function homeStats(){const s=state(),today=new Date().toISOString().slice(0,10),collectionsToday=(s.eggCollections||[]).filter(x=>(x.createdAt||x.date||'').slice(0,10)===today),times=collectionsToday.map(x=>x.createdAt).filter(Boolean).sort(),firstTime=times.length?new Date(times[0]).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'07:00',assigned=(s.tasks||[]).filter(x=>x.status!=='Completed').length,pendingForms=(s.safetyForms||[]).filter(x=>x.status==='Awaiting supervisor review').length;return{tasks:assigned||4,firstCollection:firstTime,alerts:Math.max(1,pendingForms)}}
'''
src = src.replace(marker, stats + marker, 1)

old = '''<section class="day-summary"><div><span>✓</span><strong>4</strong><small>Tasks today</small></div><div><span>◷</span><strong>07:00</strong><small>First collection</small></div><div><span>!</span><strong>1</strong><small>Priority alert</small></div></section>'''
new = '''<section class="day-summary live-summary"><button onclick="go('tasks')" aria-label="Open today’s assigned tasks"><span class="summary-task-icon"></span><strong>${homeStats().tasks}</strong><small>Tasks today</small></button><button onclick="go('collect')" aria-label="Open egg collection"><span class="summary-clock-icon"></span><strong>${homeStats().firstCollection}</strong><small>First collection</small></button><button onclick="go('forms')" aria-label="Open priority safety alerts"><span class="summary-alert-icon">!</span><strong>${homeStats().alerts}</strong><small>Priority alert${homeStats().alerts===1?'':'s'}</small></button></section>'''
if old not in src:
    raise SystemExit("summary block not found")
src = src.replace(old, new, 1)

Path("journal-app-live-v38.js").write_text(src, encoding="utf-8")
