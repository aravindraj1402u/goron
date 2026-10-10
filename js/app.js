/* MEMORYVAULT AI - static build (client-side). Mirrors the Flask app's UI and logic. */
(function () {
  'use strict';
  var MV = window.MV;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- session ---------------- */
  function getUser() { try { return JSON.parse(localStorage.getItem('mv_user') || 'null'); } catch (e) { return null; } }
  function setUser(u) { localStorage.setItem('mv_user', JSON.stringify(u)); }
  function doLogout() { localStorage.removeItem('mv_user'); location.href = 'index.html'; }
  window.MVlogout = doLogout;
  window.MVsearch = function (f) { location.href = 'search.html?q=' + encodeURIComponent(f.q.value.trim()); return false; };

  /* ---------------- data ---------------- */
  function extra(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function saveExtra(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function allUsers() { return MV.users.concat(extra('mv_users')); }
  function allProjects() { return MV.projects.concat(extra('mv_projects')); }
  function allFailures() { return MV.failures.concat(extra('mv_failures')); }
  function projectById(id) { id = String(id); return allProjects().filter(function (p) { return String(p.id) === id; })[0]; }
  function failuresOf(id) { id = String(id); return allFailures().filter(function (f) { return String(f.project_id) === id; }); }
  function needLogin() { $('#main').innerHTML = '<div class="card p-4 mx-auto" style="max-width:520px"><h3>Please log in</h3><p>This page needs an account.</p><a class="btn btn-info" href="login.html">Log in</a> <a class="btn btn-outline-secondary" href="register.html">Register</a></div>'; }

  /* ---------------- search (ported from services.py) ---------------- */
  var STOP = { the: 1, and: 1, for: 1, what: 1, which: 1, how: 1, did: 1, our: 1, was: 1, are: 1, with: 1, that: 1, this: 1, last: 1, year: 1 };
  function toks(s) { var out = {}; (String(s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []).forEach(function (t) { if (!STOP[t]) out[t] = 1; }); return out; }
  function excerpt(text, qt, n) { n = n || 240; var low = String(text).toLowerCase(), pos = -1, t; for (t in qt) { var i = low.indexOf(t); if (i >= 0 && (pos < 0 || i < pos)) pos = i; } if (pos < 0) pos = 0; var s = Math.max(0, pos - 60); return (s ? '\u2026' : '') + String(text).slice(s, s + n).replace(/\n/g, ' ') + '\u2026'; }
  function search(q, limit) {
    limit = limit || 15; var qt = toks(q), res = [];
    if (!Object.keys(qt).length) return res;
    function score(title, text) { var c = 0, tt = toks(title + ' ' + text); for (var t in qt) if (tt[t]) c++; return c; }
    allProjects().forEach(function (p) {
      var sc = score(p.title, p.description + ' ' + p.tech + ' ' + p.tags + ' ' + p.handover_notes) * 2;
      if (sc) res.push({ kind: 'Project', title: p.title, excerpt: excerpt(p.description + ' ' + p.tech + ' ' + p.tags, qt), url: 'project.html?id=' + p.id, meta: p.department + ' \u00b7 ' + p.year, score: sc });
    });
    allFailures().forEach(function (f) {
      var p = projectById(f.project_id) || {};
      var txt = [f.error_message, f.description, f.root_cause, f.solution, f.lessons, f.technologies].join(' ');
      var sc = score(f.title, txt) * 3;
      if (sc) res.push({ kind: 'Failure' + (f.verified ? ' \u2714 verified' : ' (unverified)'), title: f.title, excerpt: excerpt(txt, qt), url: 'failure.html?id=' + f.id, meta: (p.title || '') + ' \u00b7 ' + f.severity, score: sc });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, limit);
  }

  /* ---------------- handover (ported from services.py) ---------------- */
  function nd(v) { return (v && v.trim()) ? v : 'Not documented'; }
  function handover(p) {
    var fs = failuresOf(p.id);
    var L = ['# Handover Guide: ' + p.title, "_Generated from stored data. Missing items are marked 'Not documented'._", '',
      '## 1-2. Objective & Overview', nd(p.description), '', '## 3. Team & Ownership',
      'Owner: ' + (p.owner || 'Not documented') + '; Department: ' + nd(p.department) + '; Year: ' + nd(p.year) + '; Status: ' + p.status, '',
      '## 4. Technologies & Dependencies', nd(p.tech), '',
      '## 5-9, 12-15. Setup, Files, Database, Features, Testing, Deployment, Security, Pending Tasks', 'Not documented (see handover notes)', '',
      '## Handover Notes', nd(p.handover_notes), '', '## 10. Previous Errors & Solutions'];
    if (fs.length) fs.forEach(function (f) { L.push('- **' + f.title + '** [' + (f.verified ? 'verified' : 'UNVERIFIED') + '] error: ' + nd(f.error_message) + '; solution: ' + nd(f.solution) + '; prevention: ' + nd(f.prevention)); });
    else L.push('Not documented');
    L.push('', '## 11. Failed Approaches to Avoid');
    var fa = fs.filter(function (f) { return f.failed_attempts && f.failed_attempts.trim(); });
    if (fa.length) fa.forEach(function (f) { L.push('- ' + f.title + ': ' + f.failed_attempts); }); else L.push('Not documented');
    L.push('', '## 16. Recommendations (lessons learned)');
    var ls = fs.filter(function (f) { return f.lessons && f.lessons.trim(); });
    if (ls.length) ls.forEach(function (f) { L.push('- ' + f.lessons); }); else L.push('Not documented');
    L.push('', '## 17. Source Documents', 'Not documented');
    return L.join('\n');
  }

  /* ---------------- chat (search-only fallback) ---------------- */
  function answer(q) {
    var src = search(q, 5);
    if (!src.length) return { answer: "No records you can access match this question, so I can't answer from documented evidence. Try other keywords or record the problem in Failure Memory.", sources: [], mode: 'no-evidence' };
    var lines = src.map(function (s, i) { return '[' + (i + 1) + '] ' + s.kind + ': ' + s.title + ' \u2014 ' + s.excerpt; }).join('\n');
    return { answer: 'Search-based assistance (this static demo has no live LLM \u2014 it runs the same labelled search-only fallback as the app).\n' + lines, sources: src, mode: 'fallback' };
  }

  /* ---------------- chrome ---------------- */
  function renderChrome() {
    var u = getUser();
    var nav = $('#nav');
    var html = '<button class="btn btn-outline-light d-md-none me-2" data-bs-toggle="collapse" data-bs-target="#side" aria-label="Menu">\u2630</button>' +
      '<a class="navbar-brand fw-bold" href="index.html">\uD83E\uDDE0 MEMORY<span class="cy">VAULT</span> AI</a>';
    if (u) {
      html += '<form class="d-flex flex-grow-1 mx-3" onsubmit="return MVsearch(this)"><input name="q" class="form-control" placeholder="Search projects, errors, solutions\u2026" aria-label="Global search"></form>' +
        '<span class="text-light me-2 d-none d-sm-inline">' + esc(u.name) + ' (' + esc(u.role) + ')</span>' +
        '<button class="btn btn-sm btn-outline-info" onclick="MVlogout()">Log out</button>';
    } else {
      html += '<span class="ms-auto"><a class="btn btn-sm btn-info" href="login.html">Log in</a> <a class="btn btn-sm btn-outline-info" href="register.html">Register</a></span>';
    }
    nav.innerHTML = html;

    var side = $('#side');
    if (side) {
      if (u) {
        side.className = 'side p-3 collapse d-md-block';
        var links = [['dashboard.html', 'Dashboard'], ['projects.html', 'Repository'], ['projects.html?mine=1', 'My Projects'],
          ['my-documents.html', 'My Documents'], ['new-project.html', '+ New Project'], ['failures.html', 'Failure Memory'],
          ['new-failure.html', '+ Record Failure'], ['search.html', 'Smart Search'], ['handover.html', 'Handover Generator'],
          ['chat.html', 'AI Assistant']];
        if (u.role === 'admin') links.push(['admin.html', 'Admin']);
        side.innerHTML = '<div class="nav flex-column">' + links.map(function (l) { return '<a class="nav-link" href="' + l[0] + '">' + l[1] + '</a>'; }).join('') + '</div>';
      } else { side.style.display = 'none'; }
    }
    var fab = $('#fab');
    if (fab) { if (u) fab.hidden = false; else fab.style.display = 'none'; }
  }

  /* ---------------- pages ---------------- */
  function pageHome() {
    if (getUser()) { location.replace('dashboard.html'); return; }
    $('#main').innerHTML = '<div class="hero text-center"><h1>Never lose project knowledge again.</h1>' +
      '<p class="lead">MEMORYVAULT AI preserves reports, failures and solutions so the next student batch starts ahead.</p>' +
      '<a class="btn btn-info btn-lg" href="register.html">Get started</a> <a class="btn btn-outline-light btn-lg" href="login.html">Log in</a></div>';
  }

  function pageLogin() {
    $('#main').innerHTML = '<div class="card p-4 mx-auto" style="max-width:520px"><h2>Log in</h2>' +
      '<div class="alert alert-info small mb-3">Demo accounts \u2014 faculty: <b>demo@memoryvault.local</b> / <b>demo1234</b> &nbsp;\u00b7&nbsp; admin: <b>admin@memoryvault.local</b> / <b>admin1234</b></div>' +
      '<div id="err"></div><form id="f"><div class="mb-3"><label class="form-label">Email</label><input class="form-control" name="email" type="email" required></div>' +
      '<div class="mb-3"><label class="form-label">Password</label><input class="form-control" name="password" type="password" required></div>' +
      '<button class="btn btn-info">Log in</button></form></div>';
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      var email = this.email.value.trim().toLowerCase(), pw = this.password.value;
      var u = allUsers().filter(function (x) { return x.email.toLowerCase() === email && x.password === pw; })[0];
      if (u) { setUser({ name: u.name, email: u.email, role: u.role, department: u.department, year: u.year }); location.href = 'dashboard.html'; }
      else { $('#err').innerHTML = '<div class="alert alert-danger">Invalid credentials. Use a demo account above.</div>'; }
      return false;
    };
  }

  function pageRegister() {
    $('#main').innerHTML = '<div class="card p-4 mx-auto" style="max-width:720px"><h2>Register</h2><div id="err"></div>' +
      '<form id="f">' +
      '<div class="mb-3"><label class="form-label">Full name</label><input class="form-control" name="name" required></div>' +
      '<div class="mb-3"><label class="form-label">Email</label><input class="form-control" name="email" type="email" required></div>' +
      '<div class="mb-3"><label class="form-label">Password (min 8)</label><input class="form-control" name="password" type="password" required></div>' +
      '<div class="mb-3"><label class="form-label">Department</label><input class="form-control" name="department"></div>' +
      '<div class="mb-3"><label class="form-label">Academic year</label><input class="form-control" name="year" placeholder="2024-25"></div>' +
      '<div class="mb-3"><label class="form-label">Role</label><select class="form-select" name="role"><option>student</option><option>faculty</option></select></div>' +
      '<button class="btn btn-info">Create account</button></form></div>';
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      var d = { name: this.name.value.trim(), email: this.email.value.trim().toLowerCase(), password: this.password.value, department: this.department.value.trim(), year: this.year.value.trim(), role: this.role.value };
      if (!d.name || d.email.indexOf('@') < 0 || d.password.length < 8) { $('#err').innerHTML = '<div class="alert alert-danger">Enter name, valid email and 8+ char password.</div>'; return false; }
      if (allUsers().filter(function (x) { return x.email.toLowerCase() === d.email; }).length) { $('#err').innerHTML = '<div class="alert alert-danger">Email already registered.</div>'; return false; }
      var ex = extra('mv_users'); ex.push(d); saveExtra('mv_users', ex);
      setUser({ name: d.name, email: d.email, role: d.role, department: d.department, year: d.year });
      location.href = 'dashboard.html';
      return false;
    };
  }

  function pageDashboard() {
    var u = getUser(); if (!u) return needLogin();
    var ps = allProjects(), fs = allFailures();
    var stats = { Projects: ps.length, Failures: fs.length, Verified: fs.filter(function (f) { return f.verified; }).length, Handovers: extra('mv_handovers').length };
    var tech = {};
    ps.forEach(function (p) { (p.tech || '').split(',').forEach(function (t) { t = t.trim(); if (t) tech[t] = (tech[t] || 0) + 1; }); });
    var techArr = Object.keys(tech).map(function (k) { return [k, tech[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    var recent = ps.slice().sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }).slice(0, 5);
    var cards = Object.keys(stats).map(function (k) { return '<div class="col-6 col-lg"><div class="card p-3 text-center stat-card"><div class="fs-2 fw-bold">' + stats[k] + '</div>' + k + '</div></div>'; }).join('');
    var recHtml = recent.map(function (p) { return '<div class="mb-2"><a href="project.html?id=' + p.id + '">' + esc(p.title) + '</a><br><small class="text-muted">' + esc(p.department) + ' \u00b7 ' + esc(p.created) + '</small></div>'; }).join('') || '<p>No projects yet.</p>';
    var techHtml = techArr.map(function (t) { return '<div>' + esc(t[0]) + ' <span class="badge bg-info">' + t[1] + '</span></div>'; }).join('') || '<p>None yet.</p>';
    $('#main').innerHTML = '<div class="d-flex justify-content-between"><h2>Dashboard</h2><a class="btn btn-info" href="chat.html">Ask MemoryVault AI</a></div>' +
      '<div class="row g-3 my-2">' + cards + '</div>' +
      '<div class="row g-3"><div class="col-md-7"><div class="card p-3"><h5>Recently added knowledge</h5>' + recHtml + '</div></div>' +
      '<div class="col-md-5"><div class="card p-3"><h5>Frequent technologies</h5>' + techHtml + '</div></div></div>';
  }

  function field(name, label, val) { return '<div class="col-md"><input class="form-control" name="' + name + '" placeholder="' + label + '" value="' + esc(val || '') + '"></div>'; }

  function pageProjects() {
    var u = getUser(); if (!u) return needLogin();
    var p = new URLSearchParams(location.search);
    var mine = p.get('mine') === '1';
    var ps = allProjects().slice();
    if (mine) ps = ps.filter(function (x) { return x.owner === u.email; });
    var q = (p.get('q') || '').toLowerCase(), tech = (p.get('tech') || '').toLowerCase(), dep = p.get('department') || '', yr = p.get('year') || '', sort = p.get('sort') || '';
    if (q) ps = ps.filter(function (x) { return (x.title + x.description + x.tags).toLowerCase().indexOf(q) >= 0; });
    if (tech) ps = ps.filter(function (x) { return (x.tech || '').toLowerCase().indexOf(tech) >= 0; });
    if (dep) ps = ps.filter(function (x) { return x.department === dep; });
    if (yr) ps = ps.filter(function (x) { return x.year === yr; });
    ps.sort(function (a, b) { return sort === 'title' ? a.title.localeCompare(b.title) : String(b.created).localeCompare(String(a.created)); });
    var page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1), per = 9;
    var slice = ps.slice((page - 1) * per, page * per);
    var grid = slice.map(function (x) {
      return '<div class="col-md-6 col-xl-4"><div class="card p-3 h-100"><h5><a href="project.html?id=' + x.id + '">' + esc(x.title) + '</a></h5>' +
        '<p>' + esc((x.description || '').slice(0, 120)) + '</p><small>' + esc(x.department) + ' \u00b7 ' + esc(x.year) + ' \u00b7 ' + esc(x.tech) + '</small>' +
        '<span class="badge bg-secondary mt-2 align-self-start">' + esc(x.visibility) + '</span></div></div>';
    }).join('') || '<p>No projects found. <a href="new-project.html">Create one</a>.</p>';
    $('#main').innerHTML = '<h2>' + (mine ? 'My Projects' : 'Project Knowledge Repository') + '</h2>' +
      '<form class="row g-2 mb-3" method="get" action="projects.html">' +
      field('q', 'Search', p.get('q')) + field('tech', 'Technology', p.get('tech')) + field('department', 'Department', p.get('department')) + field('year', 'Year', p.get('year')) +
      '<div class="col-md"><select class="form-select" name="sort"><option value="">Newest</option><option value="title"' + (sort === 'title' ? ' selected' : '') + '>Title</option></select></div>' +
      '<div class="col-auto"><button class="btn btn-info">Filter</button></div></form>' +
      '<div class="row g-3">' + grid + '</div>' +
      '<div class="mt-3">' + (page > 1 ? '<a class="btn btn-outline-info" href="?page=' + (page - 1) + '">Prev</a> ' : '') +
      (ps.length > page * per ? '<a class="btn btn-outline-info" href="?page=' + (page + 1) + '">Next</a>' : '') + '</div>';
  }

  function pageProject() {
    var u = getUser(); if (!u) return needLogin();
    var id = new URLSearchParams(location.search).get('id');
    var p = projectById(id);
    if (!p) { $('#main').innerHTML = '<div class="alert alert-danger">Project not found.</div>'; return; }
    var fs = failuresOf(p.id);
    var docs = (p.docs || []).map(function (d) { return '<div>' + esc(d.name) + ' <span class="badge bg-success">ready</span></div>'; }).join('') || '<p>No documents.</p>';
    var fsHtml = fs.map(function (f) { return '<div><a href="failure.html?id=' + f.id + '">' + esc(f.title) + '</a> <span class="badge bg-' + (f.verified ? 'success' : 'warning') + '">' + (f.verified ? 'Verified' : 'Unverified') + '</span></div>'; }).join('') || '<p>None recorded.</p>';
    $('#main').innerHTML = '<div class="card p-4"><h2>' + esc(p.title) + '</h2><p>' + esc(p.description) + '</p>' +
      '<p><b>Dept:</b> ' + esc(p.department || 'Not documented') + ' \u00b7 <b>Year:</b> ' + esc(p.year || 'Not documented') + ' \u00b7 <b>Tech:</b> ' + esc(p.tech || 'Not documented') + ' \u00b7 <b>Status:</b> ' + esc(p.status) + ' \u00b7 <b>Owner:</b> ' + esc(p.owner) + '</p>' +
      '<h5>Handover notes</h5><p class="prewrap">' + esc(p.handover_notes || 'Not documented') + '</p>' +
      '<h5>Documents</h5>' + docs +
      '<h5 class="mt-3">Failures</h5>' + fsHtml +
      '<div class="mt-3"><a class="btn btn-info" href="handover.html?id=' + p.id + '">Generate handover guide</a> ' +
      '<a class="btn btn-outline-info" href="new-failure.html?project=' + p.id + '">+ Record failure</a></div></div>';
  }

  function pageFailures() {
    var u = getUser(); if (!u) return needLogin();
    var p = new URLSearchParams(location.search);
    var fs = allFailures().slice();
    var sev = p.get('severity') || '', tech = (p.get('tech') || '').toLowerCase(), q = (p.get('q') || '').toLowerCase();
    if (sev) fs = fs.filter(function (f) { return f.severity === sev; });
    if (tech) fs = fs.filter(function (f) { return (f.technologies || '').toLowerCase().indexOf(tech) >= 0; });
    if (q) fs = fs.filter(function (f) { return (f.title + f.error_message + f.solution).toLowerCase().indexOf(q) >= 0; });
    fs.sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); });
    var list = fs.map(function (f) {
      var pr = projectById(f.project_id) || {};
      return '<div class="card p-3 mb-2"><h5><a href="failure.html?id=' + f.id + '">' + esc(f.title) + '</a> ' +
        '<span class="badge bg-' + (f.verified ? 'success' : 'warning') + '">' + (f.verified ? 'Verified' : 'Unverified') + '</span> ' +
        '<span class="badge bg-secondary">' + esc(f.severity) + '</span></h5>' +
        '<small>' + esc(pr.title || '') + ' \u00b7 ' + esc(f.technologies) + '</small>' +
        '<p class="mb-0"><b>Solution:</b> ' + esc((f.solution || 'Not documented').slice(0, 160)) + '</p></div>';
    }).join('') || '<p>No failure records match.</p>';
    $('#main').innerHTML = '<div class="d-flex justify-content-between"><h2>Project Failure Memory</h2><a class="btn btn-info" href="new-failure.html">Record failure</a></div>' +
      '<form class="row g-2 my-2" method="get" action="failures.html">' +
      '<div class="col"><input class="form-control" name="q" placeholder="Paste an error or keywords to find similar failures" value="' + esc(p.get('q')) + '"></div>' +
      '<div class="col-md-2"><input class="form-control" name="tech" placeholder="Technology" value="' + esc(p.get('tech')) + '"></div>' +
      '<div class="col-md-2"><select class="form-select" name="severity"><option value="">Any severity</option>' + ['Low', 'Medium', 'High', 'Critical'].map(function (s) { return '<option' + (sev === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-auto"><button class="btn btn-info">Search</button></div></form>' + list;
  }

  function pageFailure() {
    var u = getUser(); if (!u) return needLogin();
    var id = new URLSearchParams(location.search).get('id');
    var f = allFailures().filter(function (x) { return String(x.id) === String(id); })[0];
    if (!f) { $('#main').innerHTML = '<div class="alert alert-danger">Failure not found.</div>'; return; }
    var p = projectById(f.project_id) || {};
    var rows = [['Problem', f.description], ['Error / symptom', f.error_message], ['Root cause', f.root_cause], ['Failed attempts', f.failed_attempts], ['Final solution', f.solution], ['Lessons learned', f.lessons], ['Prevention', f.prevention]]
      .map(function (r) { return '<h5>' + r[0] + '</h5><p class="prewrap">' + esc(r[1] || 'Not documented') + '</p>'; }).join('');
    var rel = search(f.title + ' ' + f.error_message, 6).filter(function (r) { return r.url.indexOf('failure.html') === 0 && r.url !== 'failure.html?id=' + f.id; });
    var relHtml = rel.map(function (r) { return '<div><a href="' + r.url + '">' + esc(r.title) + '</a> <small>' + esc(r.meta) + '</small></div>'; }).join('') || '<p>None found.</p>';
    var verify = (u.role === 'faculty' || u.role === 'admin') ? '<button class="btn btn-outline-success" id="ver">' + (f.verified ? 'Remove verification' : 'Mark solution as verified') + '</button>' : '';
    $('#main').innerHTML = '<div class="card p-4"><h2>' + esc(f.title) + '</h2>' +
      '<p>' + esc(p.title || '') + ' \u00b7 ' + esc(f.severity) + ' \u00b7 Recorded by ' + esc(f.contributor) + ' \u00b7 <b>' + (f.verified ? 'Verified by ' + esc(f.verified_by) : 'UNVERIFIED') + '</b></p>' +
      rows + verify + '<h5 class="mt-3">Related failures</h5>' + relHtml + '</div>';
    if ($('#ver')) $('#ver').onclick = function () {
      f.verified = !f.verified; f.verified_by = f.verified ? u.name : '';
      var ex = extra('mv_failures'); var found = ex.filter(function (x) { return String(x.id) === String(f.id); })[0];
      if (found) { found.verified = f.verified; found.verified_by = f.verified_by; }
      else { var base = MV.failures.filter(function (x) { return String(x.id) === String(f.id); })[0]; base.verified = f.verified; base.verified_by = f.verified_by; }
      saveExtra('mv_failures', ex);
      pageFailure();
    };
  }

  function pageSearch() {
    var u = getUser(); if (!u) return needLogin();
    var q = new URLSearchParams(location.search).get('q') || '';
    var res = q ? search(q, 30) : [];
    var list = res.map(function (r) { return '<div class="card p-3 mb-2"><span class="badge bg-info align-self-start">' + esc(r.kind) + '</span><h5><a href="' + r.url + '">' + esc(r.title) + '</a></h5><p class="mb-1">' + esc(r.excerpt) + '</p><small>' + esc(r.meta) + '</small></div>'; }).join('');
    var empty = q ? '<p>No matching records you can access. Try different keywords.</p>' : '<p>Enter a question or keywords to search projects, failures and document text.</p>';
    $('#main').innerHTML = '<h2>Smart Search</h2>' +
      '<form class="input-group mb-3" method="get" action="search.html"><input class="form-control" name="q" value="' + esc(q) + '" placeholder="e.g. Flask SQLite database locked" autofocus><button class="btn btn-info">Search</button></form>' +
      (res.length ? list : empty);
  }

  function pageHandover() {
    var u = getUser(); if (!u) return needLogin();
    var ps = allProjects();
    var sel = new URLSearchParams(location.search).get('id');
    var p = projectById(sel) || ps[0];
    if (!p) { $('#main').innerHTML = '<div class="alert alert-danger">No projects available.</div>'; return; }
    var opts = ps.map(function (x) { return '<option value="' + x.id + '"' + (String(x.id) === String(p.id) ? ' selected' : '') + '>' + esc(x.title) + '</option>'; }).join('');
    var content = handover(p);
    var saved = extra('mv_handovers').slice().reverse().slice(0, 10);
    var savedHtml = saved.map(function (h, i) { return '<div>Guide #' + (h.id) + ' \u00b7 ' + esc(h.created) + ' \u00b7 ' + esc(h.title) + ' <a href="#" data-i="' + i + '" class="dl">Download .md</a></div>'; }).join('') || '<p>None saved yet.</p>';
    $('#main').innerHTML = '<h2>Handover Guide Generator</h2>' +
      '<form class="input-group mb-3" method="get" action="handover.html"><select class="form-select" name="id" aria-label="Project">' + opts + '</select><button class="btn btn-info">Generate</button></form>' +
      '<label for="content" class="form-label">Preview / edit (Markdown)</label>' +
      '<textarea id="content" class="form-control" rows="22">' + esc(content) + '</textarea>' +
      '<button class="btn btn-info mt-2" id="save">Save guide</button>' +
      '<h5 class="mt-4">Saved guides</h5>' + savedHtml;
    $('#save').onclick = function () {
      var arr = extra('mv_handovers');
      arr.push({ id: arr.length + 1, project_id: p.id, title: p.title, content: $('#content').value, created: new Date().toISOString().slice(0, 10) });
      saveExtra('mv_handovers', arr);
      alert('Guide saved.');
      location.reload();
    };
    document.querySelectorAll('.dl').forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var h = saved[parseInt(a.getAttribute('data-i'), 10)];
        var blob = new Blob([h.content], { type: 'text/markdown' });
        var url = URL.createObjectURL(blob); var t = document.createElement('a');
        t.href = url; t.download = 'handover-' + h.id + '.md'; t.click(); URL.revokeObjectURL(url);
      };
    });
  }

  function pageChat() {
    var u = getUser(); if (!u) return needLogin();
    var msgs = extra('mv_chat_' + u.email);
    $('#main').innerHTML = '<div class="d-flex justify-content-between"><h2>MemoryVault Assistant</h2>' +
      '<button class="btn btn-outline-danger btn-sm" id="clear">New / clear conversation</button></div>' +
      '<p class="text-muted small">Answers use only records you may access. This static build runs in labelled search-based fallback mode (no live LLM).</p>' +
      '<div id="log" class="card p-3 mb-2" style="min-height:300px"></div>' +
      '<div class="mb-2">' + ['What errors did previous teams face?', 'Which projects used Flask and SQLite?', 'How was the database locked problem solved?'].map(function (s) { return '<button class="btn btn-sm btn-outline-info chip me-1">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '<div class="input-group"><input id="q" class="form-control" placeholder="Ask about past projects, errors, solutions\u2026" aria-label="Question"><button id="go" class="btn btn-info">Send</button></div>';
    var log = $('#log'), q = $('#q');
    function add(t, c) { var d = document.createElement('div'); d.className = 'msg ' + c; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
    msgs.forEach(function (m) { add(m.content, m.role); });
    function ask(t) {
      if (!t) return;
      add(t, 'user'); q.value = ''; msgs.push({ role: 'user', content: t });
      var w = add('Searching\u2026', 'assistant');
      var r = answer(t);
      w.textContent = r.answer; msgs.push({ role: 'assistant', content: r.answer });
      r.sources.forEach(function (s, i) { var a = document.createElement('a'); a.href = s.url; a.className = 'd-block small'; a.textContent = '[' + (i + 1) + '] ' + s.title; w.appendChild(a); });
      saveExtra('mv_chat_' + u.email, msgs); log.scrollTop = log.scrollHeight;
    }
    $('#go').onclick = function () { ask(q.value.trim()); };
    q.onkeydown = function (e) { if (e.key === 'Enter') ask(q.value.trim()); };
    document.querySelectorAll('.chip').forEach(function (c) { c.onclick = function () { ask(c.textContent); }; });
    $('#clear').onclick = function () { saveExtra('mv_chat_' + u.email, []); location.reload(); };
  }

  function pageAdmin() {
    var u = getUser(); if (!u) return needLogin();
    if (u.role !== 'admin') { $('#main').innerHTML = '<div class="card p-4 mx-auto" style="max-width:520px"><h2>Access denied</h2><p>You do not have permission to view this.</p></div>'; return; }
    var users = allUsers(), ps = allProjects();
    var st = { Users: users.length, Projects: ps.length, Failed_docs: 0, Upload_MB: 0 };
    var stHtml = Object.keys(st).map(function (k) { return '<div class="col"><div class="card p-2 text-center"><b>' + st[k] + '</b><br>' + k + '</div></div>'; }).join('');
    var usersHtml = users.map(function (x) { return '<div class="card p-2 mb-1"><b>' + esc(x.name) + '</b> (' + esc(x.email) + ') \u2014 <span class="badge bg-secondary">' + esc(x.role) + '</span></div>'; }).join('');
    var psHtml = ps.map(function (p) { return '<div class="mb-1">' + esc(p.title) + ' \u2014 <span class="badge bg-success">active</span></div>'; }).join('');
    var logs = [['project created', 'demo@memoryvault.local'], ['failure recorded', 'demo@memoryvault.local'], ['project edited', 'demo@memoryvault.local']];
    var logsHtml = logs.map(function (l) { return '<div class="small">' + esc(l[1]) + ' \u00b7 ' + esc(l[0]) + '</div>'; }).join('');
    $('#main').innerHTML = '<h2>Admin Dashboard</h2><div class="row g-2 mb-3">' + stHtml + '</div>' +
      '<h5>Users</h5>' + usersHtml + '<h5 class="mt-3">Projects</h5>' + psHtml +
      '<h5 class="mt-3">Activity log (demo)</h5>' + logsHtml +
      '<p class="text-muted small mt-3">Role changes, deactivation and uploads are disabled in this static demo.</p>';
  }

  function pageMyDocs() {
    var u = getUser(); if (!u) return needLogin();
    $('#main').innerHTML = '<h2>My Documents</h2><div class="alert alert-info">This static demo has no backend, so file uploads and text extraction are disabled. In the full Flask app you can upload PDF/DOCX/TXT files (max 10&nbsp;MB) and they are parsed for search.</div><p>No documents uploaded yet.</p>';
  }

  function pageNewProject() {
    var u = getUser(); if (!u) return needLogin();
    $('#main').innerHTML = '<div class="card p-4 mx-auto" style="max-width:720px"><h2>New project</h2><div id="err"></div><form id="f">' +
      '<div class="mb-3"><label class="form-label">Title</label><input class="form-control" name="title" required></div>' +
      '<div class="mb-3"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="3"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Department</label><input class="form-control" name="department" value="' + esc(u.department || '') + '"></div>' +
      '<div class="mb-3"><label class="form-label">Academic year</label><input class="form-control" name="year" value="' + esc(u.year || '') + '"></div>' +
      '<div class="mb-3"><label class="form-label">Category</label><input class="form-control" name="category"></div>' +
      '<div class="mb-3"><label class="form-label">Technologies (comma separated)</label><input class="form-control" name="tech"></div>' +
      '<div class="mb-3"><label class="form-label">Tags</label><input class="form-control" name="tags"></div>' +
      '<div class="mb-3"><label class="form-label">Status</label><select class="form-select" name="status"><option>Active</option><option>Completed</option><option>Archived</option></select></div>' +
      '<div class="mb-3"><label class="form-label">Visibility</label><select class="form-select" name="visibility"><option>private</option><option>department</option><option>public</option></select></div>' +
      '<div class="mb-3"><label class="form-label">Handover notes</label><textarea class="form-control" name="handover_notes" rows="2"></textarea></div>' +
      '<button class="btn btn-info">Save project</button></form></div>';
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      if (!this.title.value.trim()) { $('#err').innerHTML = '<div class="alert alert-danger">Enter a title.</div>'; return false; }
      var p = { id: 'u' + Date.now(), title: this.title.value.trim(), description: this.description.value, department: this.department.value, year: this.year.value, category: this.category.value, tech: this.tech.value, tags: this.tags.value, status: this.status.value, visibility: this.visibility.value, handover_notes: this.handover_notes.value, owner: u.email, created: new Date().toISOString().slice(0, 10), demo: false, docs: [] };
      var arr = extra('mv_projects'); arr.push(p); saveExtra('mv_projects', arr);
      location.href = 'project.html?id=' + p.id;
      return false;
    };
  }

  function pageNewFailure() {
    var u = getUser(); if (!u) return needLogin();
    var ps = allProjects();
    var presel = new URLSearchParams(location.search).get('project');
    var opts = ps.map(function (p) { return '<option value="' + p.id + '"' + (String(p.id) === String(presel) ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('');
    $('#main').innerHTML = '<div class="card p-4 mx-auto" style="max-width:720px"><h2>Record a failure</h2><div id="err"></div><form id="f">' +
      '<div class="mb-3"><label class="form-label">Related project</label><select class="form-select" name="project_id">' + opts + '</select></div>' +
      '<div class="mb-3"><label class="form-label">Failure title</label><input class="form-control" name="title" required></div>' +
      '<div class="mb-3"><label class="form-label">Error message / symptom</label><textarea class="form-control" name="error_message" rows="2"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Problem description</label><textarea class="form-control" name="description" rows="2"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Root cause</label><textarea class="form-control" name="root_cause" rows="2"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Failed approaches</label><textarea class="form-control" name="failed_attempts" rows="2"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Final working solution</label><textarea class="form-control" name="solution" rows="2"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Technologies involved</label><input class="form-control" name="technologies"></div>' +
      '<div class="mb-3"><label class="form-label">Severity</label><select class="form-select" name="severity"><option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option></select></div>' +
      '<div class="mb-3"><label class="form-label">Lessons learned</label><textarea class="form-control" name="lessons" rows="2"></textarea></div>' +
      '<div class="mb-3"><label class="form-label">Prevention recommendations</label><textarea class="form-control" name="prevention" rows="2"></textarea></div>' +
      '<button class="btn btn-info">Save failure</button></form></div>';
    $('#f').onsubmit = function (e) {
      e.preventDefault();
      if (!this.title.value.trim()) { $('#err').innerHTML = '<div class="alert alert-danger">Enter a title.</div>'; return false; }
      var f = { id: 'u' + Date.now(), project_id: this.project_id.value, title: this.title.value.trim(), error_message: this.error_message.value, description: this.description.value, root_cause: this.root_cause.value, failed_attempts: this.failed_attempts.value, solution: this.solution.value, technologies: this.technologies.value, severity: this.severity.value, lessons: this.lessons.value, prevention: this.prevention.value, verified: false, verified_by: '', contributor: u.name, created: new Date().toISOString().slice(0, 10) };
      var arr = extra('mv_failures'); arr.push(f); saveExtra('mv_failures', arr);
      location.href = 'failure.html?id=' + f.id;
      return false;
    };
  }

  var ROUTES = { home: pageHome, login: pageLogin, register: pageRegister, dashboard: pageDashboard, projects: pageProjects, project: pageProject, failures: pageFailures, failure: pageFailure, search: pageSearch, handover: pageHandover, chat: pageChat, admin: pageAdmin, mydocs: pageMyDocs, newproject: pageNewProject, newfailure: pageNewFailure };

  document.addEventListener('DOMContentLoaded', function () {
    renderChrome();
    var page = document.body.getAttribute('data-page');
    (ROUTES[page] || pageHome)();
  });
})();
