
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:5000/api' 
      : 'https://ai-money-mentor-sdoz.onrender.com/api';

    function getUsers() {
      try { return JSON.parse(localStorage.getItem('amm_users') || '{}'); } catch (e) { return {}; }
    }
    function saveUsers(u) { localStorage.setItem('amm_users', JSON.stringify(u)); }
    function getCurrentUser() { return localStorage.getItem('amm_current_user') || ''; }
    function setCurrentUser(email) { localStorage.setItem('amm_current_user', email); }
    function getToken() { return localStorage.getItem('amm_token') || ''; }
    function setToken(token) { localStorage.setItem('amm_token', token); }

    // ══════════════════════════════════════
    // AUTH MODE TOGGLE
    // ══════════════════════════════════════
    var authMode = 'login'; // 'login' | 'register'
    function toggleAuthMode() {
      authMode = authMode === 'login' ? 'register' : 'login';
      var isReg = authMode === 'register';
      document.getElementById('auth-heading').textContent = isReg ? 'Create Account' : 'Welcome Back';
      document.getElementById('auth-sub').textContent = isReg ? 'FILL IN YOUR DETAILS' : 'ENTER YOUR CREDENTIALS';
      document.getElementById('login-btn').textContent = isReg ? 'Register →' : 'Enter →';
      document.getElementById('hint-text').textContent = '';
      document.querySelectorAll('.inp-name').forEach(function (el) {
        if (isReg) { el.classList.add('show'); } else { el.classList.remove('show'); }
      });
      document.getElementById('auth-toggle-btn').textContent = isReg ? 'Sign in instead' : 'Create an account';
      document.querySelector('#auth-toggle-wrap').innerHTML =
        isReg ? 'Already have an account? <button class="auth-toggle-btn" id="auth-toggle-btn" onclick="toggleAuthMode()">Sign in instead</button>'
          : 'New here? <button class="auth-toggle-btn" id="auth-toggle-btn" onclick="toggleAuthMode()">Create an account</button>';
    }

    document.getElementById('email-inp').placeholder = 'Email';
    document.getElementById('pass-inp').placeholder = 'Password';
    document.getElementById('hint-text').textContent = '';

    // ══════════════════════════════════════
    // AUTH ACTIONS
    // ══════════════════════════════════════
    function showRegError(msg) {
      document.getElementById('reg-error-msg').textContent = msg;
      document.getElementById('pop-reg-error').classList.add('show');
    }

    async function doLogin() {
      if (authMode === 'register') { doRegister(); return; }
      var email = document.getElementById('email-inp').value.trim().toLowerCase();
      var pass = document.getElementById('pass-inp').value;
      if (!email || !pass) { document.getElementById('hint-text').textContent = 'Please fill in all fields.'; return; }

      try {
        const resp = await fetch(API_URL + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: pass })
        });
        const data = await resp.json();

        if (!data.success) {
          loginForm.style.animation = 'none';
          void loginForm.offsetWidth;
          loginForm.style.animation = 'shake .45s ease';
          setTimeout(function () { loginForm.style.animation = ''; }, 460);
          document.getElementById('fail-hint').textContent = ': ' + (data.message || 'Invalid credentials');
          document.getElementById('pop-fail').classList.add('show');
          return;
        }

        var name = data.data.user ? data.data.user.name : email;
        setToken(data.data.token);
        setCurrentUser(email);
        localStorage.setItem('amm_name', name);
        updateNavUser(name);
        document.getElementById('pop-success').classList.add('show');
      } catch (err) {
        console.error(err);
        showRegError('Failed to connect to backend server. Is it running?');
      }
    }

    async function doRegister() {
      var name = document.getElementById('name-inp').value.trim();
      var email = document.getElementById('email-inp').value.trim().toLowerCase();
      var pass = document.getElementById('pass-inp').value;
      var confirm = document.getElementById('pass-confirm-inp').value;
      if (!name || !email || !pass || !confirm) { showRegError('Please fill in all fields.'); return; }
      if (pass !== confirm) { showRegError('Passwords do not match. Please try again.'); return; }
      if (pass.length < 6) { showRegError('Password must be at least 6 characters.'); return; }

      try {
        const resp = await fetch(API_URL + '/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, password: pass })
        });
        const data = await resp.json();

        if (!data.success) {
          showRegError(data.message || 'Registration failed.');
          return;
        }

        setToken(data.data.token);
        setCurrentUser(email);
        localStorage.setItem('amm_name', name);
        updateNavUser(name);
        document.getElementById('pop-register').classList.add('show');
      } catch (err) {
        console.error(err);
        showRegError('Failed to connect to backend server.');
      }
    }

    function getTimeGreeting() {
      var hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 21) return 'Good evening';
      return 'Good night';
    }

    function updateNavUser(name) {
      var short = name.split(' ')[0];
      if (short.includes('@')) short = short.split('@')[0]; // If it's an email, take the first part

      var initials = name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
      if (initials.includes('@')) initials = initials[0].toUpperCase();

      document.querySelectorAll('.nav-user span').forEach(function (el) { el.textContent = 'Hello, ' + short; });
      document.querySelectorAll('.nav-avatar').forEach(function (el) { el.textContent = initials; });
      var greeting = getTimeGreeting();
      document.querySelectorAll('.dash-greeting').forEach(function (el) { el.textContent = greeting + ', ' + short + ' ✨'; });
    }

    function enterDashboard() {
      document.getElementById('pop-success').classList.remove('show');
      document.getElementById('pop-register').classList.remove('show');
      var email = getCurrentUser();
      // Using actual token from localStorage set during login
      showPage('dashboard');
      loadDashboardData();
      isTyping = false;
    }
    function doLogout() {
      localStorage.clear();
      showPage('login');
      isTyping = false;
      targetAngle = 0;
      // Reset form
      document.getElementById('email-inp').value = '';
      document.getElementById('pass-inp').value = '';
      document.getElementById('name-inp').value = '';
      document.getElementById('pass-confirm-inp').value = '';
      if (authMode === 'register') toggleAuthMode();
    }
    document.getElementById('login-btn').addEventListener('click', doLogin);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (!document.getElementById('page-login').classList.contains('active')) return;
      // If door is not open yet, open it first then login after it's open enough
      if (doorAngle < 40) {
        isTyping = true;
        targetAngle = 78;
        var waitOpen = setInterval(function () {
          if (doorAngle >= 38) {
            clearInterval(waitOpen);
            doLogin();
          }
        }, 50);
      } else {
        doLogin();
      }
    });

    async function loadDashboardData() {
      const token = getToken();
      if (!token) return;

      try {
        const [summaryRes, alertsRes] = await Promise.all([
          fetch(API_URL + '/finance/summary', {
            headers: { 'Authorization': 'Bearer ' + token }
          }),
          fetch(API_URL + '/finance/alerts', {
            headers: { 'Authorization': 'Bearer ' + token }
          })
        ]);

        const summary = await summaryRes.json();
        const alerts = await alertsRes.json();

        if (summary.success) {
          updateDashboardUI(summary.data, alerts.data || []);
        }
      } catch (err) {
        console.error("Dashboard Load Error:", err);
      }
    }

    function updateDashboardUI(data, alerts) {
      // Update Health Score
      const scoreEls = document.querySelectorAll('.stat-value.purple');
      if (scoreEls[0]) scoreEls[0].innerHTML = (data.healthScore || 0) + '<span style="font-size:1.2rem">/100</span>';

      // Update Monthly Savings
      const savingsEls = document.querySelectorAll('.stat-value.gold');
      if (savingsEls[0]) savingsEls[0].textContent = '₹' + (data.savings || 0).toLocaleString('en-IN');

      // Update Activity List with Alerts
      const activitySection = document.querySelector('.activity-section');
      if (activitySection && alerts.length > 0) {
        activitySection.innerHTML = '<div class="section-title">AI Alerts & Activity</div>';
        alerts.forEach(alert => {
          const item = document.createElement('div');
          item.className = 'activity-item';
          item.innerHTML = `<div class="activity-icon">✦</div><div class="activity-text">${alert}</div><div class="activity-time">Just now</div>`;
          activitySection.appendChild(item);
        });
      }
    }

    // Check auth on load
    if (localStorage.getItem('amm_token')) {
      var _email = getCurrentUser();
      var _name = localStorage.getItem('amm_name') || _email || 'User';
      updateNavUser(_name);
      showPage('dashboard');
      loadDashboardData();
    }


    // ══════════════════════════════════════
    // CURSOR
    // ══════════════════════════════════════
    (function initCursor() {
      var cur = document.getElementById('cursor');
      var ring = document.getElementById('cursor-ring');
      if (!cur || !ring) return;

      var mx = -200, my = -200, rx = -200, ry = -200;
      var entered = false;

      document.addEventListener('mousemove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!entered) {
          // First move — snap ring to cursor position, then fade in
          rx = mx; ry = my;
          cur.style.opacity = '1';
          ring.style.opacity = '1';
          entered = true;
        }
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
      });

      // Hide cursor when mouse leaves window
      document.addEventListener('mouseleave', function () {
        cur.style.opacity = '0';
        ring.style.opacity = '0';
      });
      document.addEventListener('mouseenter', function () {
        if (entered) {
          cur.style.opacity = '1';
          ring.style.opacity = '1';
        }
      });

      // Grow on interactive elements
      document.addEventListener('mouseover', function (e) {
        var t = e.target;
        var interactive = t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'INPUT' ||
          t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' ||
          t.classList.contains('feature-card') || t.classList.contains('hero-cta') ||
          t.classList.contains('sidebar-link') || t.classList.contains('stat-card') ||
          t.classList.contains('feat-btn') || t.classList.contains('activity-item') ||
          t.classList.contains('regime-card') || t.classList.contains('upload-zone') ||
          t.classList.contains('chat-orb');
        if (interactive) {
          cur.style.width = '22px'; cur.style.height = '22px';
          cur.style.boxShadow = '0 0 0 3px #fff,0 0 18px 7px rgba(200,80,255,0.95),0 0 36px 12px rgba(200,80,255,0.45)';
          ring.style.width = '52px'; ring.style.height = '52px';
          ring.style.borderColor = 'rgba(200,80,255,0.9)';
        }
      });

      document.addEventListener('mouseout', function (e) {
        var t = e.target;
        var interactive = t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'INPUT' ||
          t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' ||
          t.classList.contains('feature-card') || t.classList.contains('hero-cta') ||
          t.classList.contains('sidebar-link') || t.classList.contains('stat-card') ||
          t.classList.contains('feat-btn') || t.classList.contains('activity-item') ||
          t.classList.contains('regime-card') || t.classList.contains('upload-zone') ||
          t.classList.contains('chat-orb');
        if (interactive) {
          cur.style.width = '14px'; cur.style.height = '14px';
          cur.style.boxShadow = '0 0 0 2.5px #fff,0 0 10px 4px rgba(200,80,255,0.85),0 0 24px 8px rgba(200,80,255,0.35)';
          ring.style.width = '36px'; ring.style.height = '36px';
          ring.style.borderColor = 'rgba(160,80,240,0.75)';
        }
      });

      // Smooth lerp for ring
      (function lerp() {
        rx += (mx - rx) * 0.12;
        ry += (my - ry) * 0.12;
        ring.style.left = rx + 'px';
        ring.style.top = ry + 'px';
        requestAnimationFrame(lerp);
      })();
    })();

    // ══════════════════════════════════════
    // PAGE SYSTEM
    // ══════════════════════════════════════
    var dashPages = ['dashboard', 'health', 'fire', 'tax', 'mf'];
    function showPage(name) {
      document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); p.style.display = 'none'; });
      var pg = document.getElementById('page-' + name);
      if (pg) {
        pg.style.display = '';
        setTimeout(function () { pg.classList.add('active'); }, 10);
      }
      var cw = document.getElementById('chat-widget');
      if (dashPages.includes(name)) { cw.style.display = 'block'; } else { cw.style.display = 'none'; }
      window.scrollTo(0, 0);
    }

    // ══════════════════════════════════════
    // STARS
    // ══════════════════════════════════════
    function makeStars(id, n, col) {
      var el = document.getElementById(id);
      if (!el) return;
      for (var i = 0; i < n; i++) {
        var s = document.createElement('div');
        var sz = Math.random() * 2.5 + 1;
        s.style.cssText = 'position:absolute;border-radius:50%;width:' + sz + 'px;height:' + sz + 'px;left:' + Math.random() * 100 + '%;top:' + Math.random() * 100 + '%;background:' + col + ';opacity:' + (Math.random() * .7 + .15) + ';animation:twinkle ' + (Math.random() * 3 + 2) + 's ' + (Math.random() * 4) + 's ease-in-out infinite;';
        el.appendChild(s);
      }
    }
    makeStars('hero-stars', 55, 'rgba(180,160,255,0.8)');
    makeStars('inside-stars', 40, 'rgba(220,200,255,0.95)');

    // Floating words
    var words = ['SIP', 'XIRR', 'TAX', 'FIRE', 'RETURNS', 'CAGR', 'NPS', 'ELSS'];
    var fwrap = document.getElementById('floating-words');
    words.forEach(function (w, i) {
      var el = document.createElement('div');
      el.className = 'floating-word';
      el.textContent = w;
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.top = (10 + Math.random() * 80) + '%';
      el.style.animationDuration = (8 + Math.random() * 8) + 's';
      el.style.animationDelay = (Math.random() * 5) + 's';
      fwrap.appendChild(el);
    });

    // ══════════════════════════════════════
    // DOOR MECHANIC
    // ══════════════════════════════════════
    var doorFrame = document.getElementById('door-frame');
    var doorPanel = document.getElementById('door-panel');
    var loginForm = document.getElementById('login-form');
    var hint = document.getElementById('cursor-hint');
    var doorAngle = 0, targetAngle = 0, isTyping = false;

    document.getElementById('email-inp').addEventListener('focus', function () { isTyping = true; targetAngle = 78; });
    document.getElementById('pass-inp').addEventListener('focus', function () { isTyping = true; targetAngle = 78; });

    document.addEventListener('mousemove', function (e) {
      if (isTyping) return;
      if (!document.getElementById('page-login').classList.contains('active')) return;
      var r = doorFrame.getBoundingClientRect();
      var d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      targetAngle = d < 420 ? 78 : 0;
    });
    doorFrame.addEventListener('click', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      if (!isTyping) targetAngle = targetAngle > 40 ? 0 : 78;
    });

    // Click on empty space around the open door → close it
    document.getElementById('login-section').addEventListener('click', function (e) {
      if (isTyping) return;
      if (targetAngle <= 40) return; // door already closed, nothing to do
      // If click is outside the door frame, close the door
      var r = doorFrame.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) {
        isTyping = false;
        targetAngle = 0;
      }
    });
    (function loop() {
      doorAngle += (targetAngle - doorAngle) * .025;
      doorPanel.style.transform = 'rotateY(-' + doorAngle + 'deg)';
      doorPanel.style.pointerEvents = doorAngle > 50 ? 'none' : 'auto';
      if (doorAngle > 40) { loginForm.classList.add('show'); if (hint) hint.style.opacity = '0'; }
      else { if (!isTyping) loginForm.classList.remove('show'); if (hint && !isTyping) hint.style.opacity = '1'; }
      requestAnimationFrame(loop);
    })();

    // ══════════════════════════════════════
    // HEALTH SCORE QUIZ
    // ══════════════════════════════════════
    var healthQs = [
      { q: 'What is your monthly income?', hint: 'Include salary, freelance, rental income etc.', unit: '₹' },
      { q: 'What are your monthly expenses?', hint: 'Rent, food, EMIs, subscriptions, everything.', unit: '₹' },
      { q: 'What is your total savings?', hint: 'FD, savings account, liquid funds combined.', unit: '₹' },
      { q: 'What is your health insurance sum insured?', hint: 'Total cover amount across all health policies.', unit: '₹' },
      { q: 'What is your total outstanding debt?', hint: 'Home loan, personal loan, credit card dues.', unit: '₹' },
      { q: 'How old are you?', hint: 'Your current age in years.', unit: 'yrs' }
    ];
    var healthStep = 0, healthAnswers = [];

    function renderHealthQ() {
      var q = healthQs[healthStep];
      document.getElementById('health-step-label').textContent = 'Step ' + (healthStep + 1) + ' of ' + healthQs.length;
      document.getElementById('health-progress').style.width = (((healthStep + 1) / healthQs.length) * 100) + '%';
      document.getElementById('health-q').textContent = q.q;
      document.getElementById('health-hint').textContent = q.hint;
      document.getElementById('health-input').value = healthAnswers[healthStep] || '';
      document.getElementById('health-input').placeholder = 'Enter ' + q.unit;
      document.getElementById('health-back').style.visibility = healthStep > 0 ? 'visible' : 'hidden';
      var nextBtn = document.getElementById('health-next');
      nextBtn.textContent = healthStep === healthQs.length - 1 ? 'Calculate My Score →' : 'Next →';
      nextBtn.className = healthStep === healthQs.length - 1 ? 'btn-gold' : 'btn-primary';
    }
    renderHealthQ();

    function healthNext() {
      var val = document.getElementById('health-input').value;
      if (!val) { document.getElementById('health-input').style.borderColor = 'var(--danger)'; setTimeout(function () { document.getElementById('health-input').style.borderColor = ''; }, 1000); return; }
      healthAnswers[healthStep] = val;
      if (healthStep < healthQs.length - 1) { healthStep++; renderHealthQ(); }
      else { runHealthScore(); }
    }
    function healthBack() { if (healthStep > 0) { healthStep--; renderHealthQ(); } }

    async function runHealthScore() {
      document.getElementById('health-quiz-section').style.display = 'none';
      document.getElementById('health-loader').style.display = 'block';

      // Prepare data for backend
      const financeData = {
        income: parseFloat(healthAnswers[0]) || 0,
        expenses: parseFloat(healthAnswers[1]) || 0,
        savings: parseFloat(healthAnswers[2]) || 0,
        goals: [
          { name: "Emergency Fund", target: parseFloat(healthAnswers[2]) * 2 },
          { name: "Insurance Coverage", target: parseFloat(healthAnswers[3]) }
        ]
      };

      let calculatedScore = 72;
      try {
        const token = getToken();
        const saveRes = await fetch(API_URL + '/finance/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(financeData)
        });
        const saveData = await saveRes.json();
        if (saveData.success && saveData.data.healthScore) {
          calculatedScore = saveData.data.healthScore;
        }
      } catch (err) {
        console.error("Failed to save health data:", err);
      }

      setTimeout(async function () {
        document.getElementById('health-loader').style.display = 'none';
        document.getElementById('health-results').style.display = 'block';
        renderHealthResults(calculatedScore);
      }, 2000);
    }

    async function renderHealthResults(backendScore) {
      var income = parseFloat(healthAnswers[0]) || 0;
      var expenses = parseFloat(healthAnswers[1]) || 0;
      var savings = parseFloat(healthAnswers[2]) || 0;
      var insurance = parseFloat(healthAnswers[3]) || 0;
      var debt = parseFloat(healthAnswers[4]) || 0;

      var efScore = Math.min(100, Math.round((savings / (expenses * 6 || 1)) * 100));
      var insScore = Math.min(100, Math.round((insurance / (income * 10 || 1)) * 100));
      var invScore = Math.min(100, Math.round((savings / (income || 1)) * 100 * 5));
      var debtHealth = 100 - Math.min(100, Math.round((debt / (income * 12 || 1)) * 100));

      var score = Math.round((efScore + insScore + invScore + debtHealth + 60 + 60) / 6);
      if (backendScore && backendScore > 0) score = Math.round((score + backendScore) / 2); // Blended score

      var dims = [
        { name: 'Emergency Fund', score: efScore, color: '#50c890' },
        { name: 'Insurance', score: insScore, color: '#f5d490' },
        { name: 'Investments', score: invScore, color: '#9478e8' },
        { name: 'Debt Health', score: debtHealth, color: '#50c890' },
        { name: 'Tax Efficiency', score: 60, color: '#f5d490' },
        { name: 'Retirement', score: 65, color: '#9478e8' }
      ];

      // Animate score ring
      var circumference = 427;
      var offset = circumference - (score / 100) * circumference;
      setTimeout(function () {
        document.getElementById('score-ring-circle').style.strokeDashoffset = offset;
      }, 100);

      // Count up score
      var n = 0, target = score;
      var counter = setInterval(function () {
        n += 2; if (n >= target) { n = target; clearInterval(counter); }
        document.getElementById('score-display').textContent = n;
      }, 30);

      // Badge
      var badge = document.getElementById('score-badge');
      if (score >= 75) { badge.textContent = '💚 Excellent'; badge.style.background = 'rgba(80,200,144,0.12)'; badge.style.color = 'var(--success)'; }
      else if (score >= 50) { badge.textContent = '🟡 Good'; badge.style.background = 'rgba(245,212,144,0.2)'; badge.style.color = 'var(--gold-deep)'; }
      else { badge.textContent = '🔴 Needs Work'; badge.style.background = 'rgba(224,96,128,0.1)'; badge.style.color = 'var(--danger)'; }

      // Dimensions
      var dl = document.getElementById('dimensions-list');
      dl.innerHTML = '';
      dims.forEach(function (d, i) {
        var html = '<div class="dim-item"><div class="dim-header"><span>' + d.name + '</span><span class="dim-score">' + d.score + '%</span></div><div class="dim-track"><div class="dim-fill" style="width:0%;background:' + d.color + ';"></div></div></div>';
        dl.innerHTML += html;
      });
      setTimeout(function () {
        dl.querySelectorAll('.dim-fill').forEach(function (el, i) {
          setTimeout(function () { el.style.width = dims[i].score + '%'; }, i * 150);
        });
      }, 200);

      // Fetch real AI Analysis from backend
      try {
        const token = getToken();
        const resp = await fetch(API_URL + '/ai/health-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ answers: healthAnswers })
        });
        const res = await resp.json();

        const analysisText = res.success ? res.data.analysis
          : "Your emergency fund covers 3 months — aim for 6. Max your 80C. Keep debt below 40%.";

        const tips = analysisText.split('\n').filter(t => t.trim().length > 0).slice(0, 3);

        var tg = document.getElementById('tips-grid');
        tg.innerHTML = '';
        tips.forEach(function (tip, i) {
          var card = document.createElement('div');
          card.className = 'tip-card';
          card.style.animationDelay = (i * 0.2) + 's';
          setTimeout(function () { streamText(card, tip, 60); }, i * 400 + 500);
          tg.appendChild(card);
        });
      } catch (err) {
        console.error("Health Analysis Error:", err);
      }
    }

    // ══════════════════════════════════════
    // RESET FUNCTIONS
    // ══════════════════════════════════════
    function resetHealthScore() {
      healthStep = 0;
      healthAnswers = [];
      document.getElementById('health-results').style.display = 'none';
      document.getElementById('health-loader').style.display = 'none';
      document.getElementById('health-quiz-section').style.display = 'block';
      document.getElementById('health-input').value = '';
      document.getElementById('score-ring-circle').style.strokeDashoffset = 427;
      document.getElementById('score-display').textContent = '0';
      document.getElementById('dimensions-list').innerHTML = '';
      document.getElementById('tips-grid').innerHTML = '';
      renderHealthQ();
    }

    function resetFire() {
      document.getElementById('fire-results').style.display = 'none';
      document.getElementById('fire-loader').style.display = 'none';
      document.getElementById('fire-ai-text').innerHTML = '';
    }

    function resetTax() {
      document.getElementById('tax-results').style.display = 'none';
      document.getElementById('tax-loader').style.display = 'none';
      document.getElementById('tax-ai-text').innerHTML = '';
      document.getElementById('tax-bar-old').style.height = '0';
      document.getElementById('tax-bar-new').style.height = '0';
    }

    function resetMF() {
      document.getElementById('mf-results').style.display = 'none';
      document.getElementById('mf-loader').style.display = 'none';
      document.getElementById('mf-upload-section').style.display = 'block';
      document.getElementById('mf-ai-text').innerHTML = '';
      document.getElementById('file-name-display').style.display = 'none';
      var btn = document.getElementById('analyse-btn');
      btn.disabled = true; btn.style.opacity = '.5'; btn.style.cursor = 'not-allowed';
    }

    // ══════════════════════════════════════
    // FIRE PLANNER
    // ══════════════════════════════════════
    function generateFire() {
      document.getElementById('fire-results').style.display = 'none';
      document.getElementById('fire-loader').style.display = 'block';
      var loaderTexts = ['✦ Calculating your FIRE journey...', '✦ Building your SIP roadmap...', '✦ Projecting corpus growth...'];
      var lt = 0;
      var ltInterval = setInterval(function () {
        lt = (lt + 1) % loaderTexts.length;
        document.getElementById('fire-loader-text').textContent = loaderTexts[lt];
      }, 900);

      var income = parseInt(document.getElementById('fire-income').value) || 80000;
      var expense = parseInt(document.getElementById('fire-expense').value) || 45000;
      var corpus = parseInt(document.getElementById('fire-corpus').value) || 50000000;
      var rate = parseFloat(document.getElementById('fire-rate').value) || 12;
      var age = parseInt(document.getElementById('fire-age').value) || 28;

      setTimeout(async function () {
        clearInterval(ltInterval);
        document.getElementById('fire-loader').style.display = 'none';
        document.getElementById('fire-results').style.display = 'block';

        var monthly = income - expense;
        var r = rate / 100 / 12;
        var years = 20;
        var n = years * 12;
        var fv = monthly * ((Math.pow(1 + r, n) - 1) / r);
        var sipNeeded = Math.round(corpus * r / ((Math.pow(1 + r, n) - 1)));

        document.getElementById('fire-sip-val').textContent = '₹' + sipNeeded.toLocaleString('en-IN');
        document.getElementById('fire-sip-sub').textContent = 'for ' + years + ' years at ' + rate + '% returns';

        // Build chart data
        var data = [];
        for (var y = 1; y <= years; y++) {
          var months = y * 12;
          var val = sipNeeded * ((Math.pow(1 + r, months) - 1) / r);
          data.push({ year: y, value: val });
        }
        drawFireChart(data, corpus);
        findMilestones(data, corpus, r, sipNeeded);

        // Fetch real AI Roadmap from backend
        try {
          const token = getToken();
          const resp = await fetch(API_URL + '/ai/fire-roadmap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ params: { age, income, expense, corpus, rate } })
          });
          const resData = await resp.json();
          const roadmap = resData.success ? resData.data.roadmap : 'Start a monthly SIP of ₹' + sipNeeded.toLocaleString('en-IN') + ' in a diversified index fund. Maintain discipline through market cycles.';
          streamText(document.getElementById('fire-ai-text'), roadmap, 40);
        } catch (err) {
          console.error("FIRE AI Error:", err);
        }
      }, 2200);
    }

    function drawFireChart(data, corpus) {
      var maxVal = Math.max(corpus, data[data.length - 1].value) * 1.05;
      var w = 600, h = 180, pad = 10;
      var pts = data.map(function (d, i) {
        var x = pad + (i / (data.length - 1)) * (w - 2 * pad);
        var y = h - pad - (d.value / maxVal) * (h - 2 * pad);
        return { x: x, y: y, d: d };
      });
      var linePath = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p.x + ',' + p.y; }).join(' ');
      var areaPath = linePath + ' L' + pts[pts.length - 1].x + ',' + (h - pad) + ' L' + pts[0].x + ',' + (h - pad) + ' Z';
      document.getElementById('fire-line').setAttribute('d', linePath);
      document.getElementById('fire-area').setAttribute('d', areaPath);

      var labels = '';
      [1, 5, 10, 15, 20].forEach(function (y) {
        var idx = y - 1;
        if (data[idx]) {
          var x = pad + (idx / (data.length - 1)) * (100 - 2 * pad / 6) + '%';
          labels += '<span>Yr ' + y + '</span>';
        }
      });
      document.getElementById('fire-chart-labels').innerHTML = '<span>Yr 1</span><span>Yr 5</span><span>Yr 10</span><span>Yr 15</span><span>Yr 20</span>';
    }

    function findMilestones(data, corpus, r, sip) {
      var cr1 = null, target = null;
      data.forEach(function (d) {
        if (!cr1 && d.value >= 10000000) cr1 = d.year;
        if (!target && d.value >= corpus) target = d.year;
      });
      document.getElementById('m-1cr').textContent = cr1 ? 'Year ' + cr1 : 'Year 12';
      document.getElementById('m-target').textContent = target ? 'Year ' + target : 'Year 20';
      document.getElementById('m-break').textContent = 'Year 4';
    }

    // ══════════════════════════════════════
    // TAX WIZARD
    // ══════════════════════════════════════
    function calculateTax() {
      document.getElementById('tax-results').style.display = 'none';
      document.getElementById('tax-loader').style.display = 'block';
      setTimeout(async function () {
        document.getElementById('tax-loader').style.display = 'none';
        document.getElementById('tax-results').style.display = 'block';

        var salary = parseInt(document.getElementById('tax-salary').value) || 1200000;
        var c80 = parseInt(document.getElementById('tax-80c').value) || 100000;
        var hra = parseInt(document.getElementById('tax-hra').value) || 180000;
        var other = parseInt(document.getElementById('tax-other').value) || 50000;

        // Old regime calc
        var oldTaxable = salary - c80 - hra - other - 50000;
        var oldTax = calcOldTax(Math.max(0, oldTaxable));

        // New regime calc
        var newTaxable = salary - 75000;
        var newTax = calcNewTax(Math.max(0, newTaxable));

        var savings = Math.abs(oldTax - newTax);
        var winner = newTax < oldTax ? 'New' : 'Old';

        document.getElementById('tax-old-val').textContent = '₹' + oldTax.toLocaleString('en-IN');
        document.getElementById('tax-new-val').textContent = '₹' + newTax.toLocaleString('en-IN');
        document.getElementById('tax-old-rate').textContent = 'Eff. rate ' + (oldTax / salary * 100).toFixed(2) + '%';
        document.getElementById('tax-new-rate').textContent = 'Eff. rate ' + (newTax / salary * 100).toFixed(2) + '%';
        document.getElementById('tax-savings-text').textContent = 'You save ₹' + savings.toLocaleString('en-IN') + ' with ' + winner + ' Regime 🎉';
        document.getElementById('tax-bar-old-label').textContent = '₹' + oldTax.toLocaleString('en-IN');
        document.getElementById('tax-bar-new-label').textContent = '₹' + newTax.toLocaleString('en-IN');

        var maxTax = Math.max(oldTax, newTax);
        setTimeout(function () {
          document.getElementById('tax-bar-old').style.height = (oldTax / maxTax * 90) + 'px';
          document.getElementById('tax-bar-new').style.height = (newTax / maxTax * 90) + 'px';
        }, 200);

        // Fetch real AI Strategy from backend
        try {
          const token = getToken();
          const resp = await fetch(API_URL + '/ai/tax-strategy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ data: { salary, c80, hra, other } })
          });
          const resData = await resp.json();
          const rec = resData.success ? resData.data.strategy : 'Based on your salary of ₹' + salary.toLocaleString('en-IN') + ', the ' + winner + ' Regime saves you ₹' + savings.toLocaleString('en-IN') + ' annually.';
          streamText(document.getElementById('tax-ai-text'), rec, 40);
        } catch (err) {
          console.error("Tax AI Error:", err);
        }
      }, 1500);
    }

    function calcOldTax(income) {
      var tax = 0;
      if (income <= 250000) return 0;
      if (income > 250000) tax += Math.min(income - 250000, 250000) * 0.05;
      if (income > 500000) tax += Math.min(income - 500000, 500000) * 0.20;
      if (income > 1000000) tax += (income - 1000000) * 0.30;
      return Math.round(tax * 1.04);
    }
    function calcNewTax(income) {
      var tax = 0;
      if (income <= 300000) return 0;
      if (income > 300000) tax += Math.min(income - 300000, 400000) * 0.05;
      if (income > 700000) tax += Math.min(income - 700000, 300000) * 0.10;
      if (income > 1000000) tax += Math.min(income - 1000000, 200000) * 0.15;
      if (income > 1200000) tax += Math.min(income - 1200000, 300000) * 0.20;
      if (income > 1500000) tax += (income - 1500000) * 0.30;
      return Math.round(tax * 1.04);
    }

    // ══════════════════════════════════════
    // MF XRAY
    // ══════════════════════════════════════
    function fileSelected(input) {
      if (input.files && input.files[0]) {
        document.getElementById('file-name-text').textContent = input.files[0].name;
        document.getElementById('file-name-display').style.display = 'inline-flex';
        var btn = document.getElementById('analyse-btn');
        btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
      }
    }
    var dz = document.getElementById('upload-zone');
    if (dz) {
      dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('drag-over'); });
      dz.addEventListener('dragleave', function () { dz.classList.remove('drag-over'); });
      dz.addEventListener('drop', function (e) {
        e.preventDefault(); dz.classList.remove('drag-over');
        var f = e.dataTransfer.files[0];
        if (f) { document.getElementById('file-name-text').textContent = f.name; document.getElementById('file-name-display').style.display = 'inline-flex'; var btn = document.getElementById('analyse-btn'); btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
      });
    }

    async function analysePortfolio(isDemo) {
      document.getElementById('mf-upload-section').style.display = 'none';
      document.getElementById('mf-loader').style.display = 'block';
      var texts = ['✦ Reading your statement...', '✦ Identifying your funds...', '✦ Calculating XIRR...', '✦ Generating AI insights...'];
      var ti = 0;
      var tInt = setInterval(function () {
        ti = (ti + 1) % texts.length;
        document.getElementById('mf-loader-text').textContent = texts[ti];
      }, 900);
      setTimeout(async function () {
        clearInterval(tInt);
        document.getElementById('mf-loader').style.display = 'none';
        document.getElementById('mf-results').style.display = 'block';
        drawPie();
        // Fetch real AI Portfolio Analysis from backend
        try {
          const token = getToken();
          const resp = await fetch(API_URL + '/ai/mf-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ isDemo })
          });
          const resData = await resp.json();
          const rebalance = resData.success ? resData.data.analysis : 'Your portfolio shows solid XIRR. Consider monitoring overlap between your top holdings.';
          streamText(document.getElementById('mf-ai-text'), rebalance, 40);
        } catch (err) {
          console.error("MF AI Error:", err);
        }
      }, 3200);
    }

    function drawPie() {
      var data = [
        { label: 'Large Cap', pct: 35, color: '#9478e8' },
        { label: 'Mid Cap', pct: 25, color: '#f5d490' },
        { label: 'Small Cap', pct: 20, color: '#c878a8' },
        { label: 'Debt', pct: 15, color: '#c4b0f5' },
        { label: 'Others', pct: 5, color: '#8878b8' }
      ];
      var svg = document.getElementById('pie-chart');
      var cx = 100, cy = 80, r = 65;
      var total = 0, paths = '';
      data.forEach(function (d) {
        var startAngle = total / 100 * 2 * Math.PI - Math.PI / 2;
        var endAngle = (total + d.pct) / 100 * 2 * Math.PI - Math.PI / 2;
        var x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
        var x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
        var large = d.pct > 50 ? 1 : 0;
        paths += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + r + ',' + r + ' 0 ' + large + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + d.color + '" opacity=".85" stroke="#fff" stroke-width="2"/>';
        total += d.pct;
      });
      svg.innerHTML = paths;
      var leg = document.getElementById('pie-legend');
      leg.innerHTML = '';
      data.forEach(function (d) {
        leg.innerHTML += '<div class="pie-legend-item"><div class="pie-dot" style="background:' + d.color + '"></div>' + d.label + ' ' + d.pct + '%</div>';
      });
    }

    // ══════════════════════════════════════
    // STREAM TEXT
    // ══════════════════════════════════════
    function streamText(el, text, delay) {
      el.innerHTML = '';
      var words = text.split(' ');
      words.forEach(function (w, i) {
        setTimeout(function () {
          var span = document.createElement('span');
          span.className = 'word';
          span.textContent = w;
          span.style.animationDelay = '0s';
          el.appendChild(span);
          // Always append a real space text node so words stay separated
          el.appendChild(document.createTextNode(' '));
        }, i * (delay || 60));
      });
    }

    // ══════════════════════════════════════
    // CHAT WIDGET
    // ══════════════════════════════════════
    var chatOpen = false;
    function toggleChat() {
      chatOpen = !chatOpen;
      var panel = document.getElementById('chat-panel');
      if (chatOpen) { panel.classList.add('open'); } else { panel.classList.remove('open'); }
    }
    function openChat() {
      document.getElementById('chat-widget').style.display = 'block';
      chatOpen = true;
      document.getElementById('chat-panel').classList.add('open');
    }
    var chatResponses = [
      "Great question! Based on your financial profile, I'd recommend focusing on building your emergency fund first.",
      "Your XIRR of 14.2% is excellent — you're outperforming the index by 1.4%. Keep up the SIP discipline!",
      "For your tax situation, the New Regime saves you more. But if you max out 80C next year, Old Regime could win.",
      "The FIRE number really depends on your lifestyle. At 25x annual expenses as corpus, you're on track!",
      "Diversification is key. Consider adding international funds for 10–15% of your portfolio for currency hedge."
    ];
    var chatResponseIdx = 0;
    async function sendChat() {
      var input = document.getElementById('chat-input');
      var msg = input.value.trim();
      if (!msg) return;
      var msgs = document.getElementById('chat-messages');

      // Add user message to UI
      var userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user';
      userMsg.textContent = msg;
      msgs.appendChild(userMsg);
      input.value = '';
      msgs.scrollTop = msgs.scrollHeight;

      // Add thinking indicator
      var typing = document.createElement('div');
      typing.className = 'chat-msg ai';
      typing.textContent = '✦ thinking...';
      typing.style.opacity = '.5';
      msgs.appendChild(typing);
      msgs.scrollTop = msgs.scrollHeight;

      try {
        const token = getToken();
        const resp = await fetch(API_URL + '/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ message: msg })
        });
        const data = await resp.json();

        msgs.removeChild(typing);

        var aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg ai';
        msgs.appendChild(aiMsg);

        const response = data.success ? data.data.reply : "I'm sorry, I'm having trouble connecting to my AI core right now.";

        var words = response.split(' ');
        words.forEach(function (w, i) {
          setTimeout(function () {
            aiMsg.textContent += (i > 0 ? ' ' : '') + w;
            msgs.scrollTop = msgs.scrollHeight;
          }, i * 40);
        });
      } catch (err) {
        console.error(err);
        msgs.removeChild(typing);
        var errBox = document.createElement('div');
        errBox.className = 'chat-msg ai';
        errBox.textContent = "Error: Could not reach the AI server. Please make sure the backend is running.";
        msgs.appendChild(errBox);
      }
    }
    document.addEventListener('DOMContentLoaded', function () {
      var ci = document.getElementById('chat-input');
      if (ci) ci.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChat(); });
    });
  