(function () {
  let loginBusy = false;
  let connectionOnline = null;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function connectionLabel() {
    if (connectionOnline === true) return '<span class="supabase-dot online"></span>Local Supabase connected';
    if (connectionOnline === false) return '<span class="supabase-dot offline"></span>Local Supabase unavailable';
    return '<span class="supabase-dot checking"></span>Checking local Supabase';
  }

  login = function () {
    const previousEmail = state().supabaseIdentity?.email || "";
    return `<section class="field-login"><button class="login-back" aria-label="Back to Welcome" onclick="go('welcome')">←</button><aside class="login-estate" role="img" aria-label="Crown and Cross estate at sunrise"><div class="login-estate-brand"><img class="crest login-approved-crest" src="crown-cross-monogram-approved.png" alt="Crown and Cross approved crest"><strong>Crown &amp; Cross</strong><span>Organic Estate</span></div><blockquote>“Commit your work to the Lord,<br>and your plans will be established.”<cite>Proverbs 16:3</cite></blockquote></aside><main class="login-paper"><div class="login-brand-real"><img class="crest login-approved-crest" src="crown-cross-monogram-approved.png" alt="Crown and Cross approved crest"><p>Crown &amp; Cross</p><small>Estate Field Journal</small></div><form class="login-form-real" onsubmit="submitSupabaseLogin(event)"><div class="login-faith-mark">†</div><p class="login-kicker">Secure Estate Access</p><h1>Sign In</h1><p class="login-intro">Use your approved CCEMS account to continue to your field day.</p><div id="supabase-connection" class="supabase-connection">${connectionLabel()}</div><label><span>Email</span><div class="login-input"><b aria-hidden="true">♙</b><input name="email" type="email" autocomplete="username" value="${escapeHtml(previousEmail)}" required></div></label><label><span>Password</span><div class="login-input"><b aria-hidden="true">▣</b><input name="password" type="password" autocomplete="current-password" required><button type="button" aria-label="Show password" onclick="const i=this.previousElementSibling;i.type=i.type==='password'?'text':'password'">◉</button></div></label><div class="login-options"><label><input name="remember" type="checkbox" checked> Remember this approved device</label><button type="button" onclick="alert('Password recovery will be enabled when the production email service is configured.')">Forgot password?</button></div><p id="supabase-login-error" class="supabase-login-error" role="alert"></p><button class="journal-primary login-submit" ${loginBusy ? "disabled" : ""}>${loginBusy ? "Signing In…" : "Sign In"} <span>→</span></button><button type="button" class="login-biometric" onclick="alert('Secure PIN and biometric sign-in will be connected after device approval is linked to Supabase.')">Use Secure PIN or Face ID</button><div class="secure-note"><span>✓</span><p><strong>Protected by Supabase Auth</strong><small>Access is checked against the employee and estate permissions held in the local development database.</small></p></div></form><img class="login-botanical" src="faith-botanical-divider-v1.png" alt=""></main></section>`;
  };

  window.submitSupabaseLogin = async function (event) {
    event.preventDefault();
    if (loginBusy) return;
    const errorElement = document.querySelector("#supabase-login-error");
    const data = new FormData(event.currentTarget);
    loginBusy = true;
    render();
    try {
      const user = await window.CCEMSSupabase.signIn(
        String(data.get("email") || "").trim(),
        String(data.get("password") || ""),
        data.get("remember") === "on"
      );
      const employee = await window.CCEMSSupabase.currentEmployee(user.id);
      const saved = state();
      saved.supabaseIdentity = {
        userId: user.id,
        employeeId: employee.id,
        employeeNumber: employee.employee_number,
        preferredName: employee.preferred_name,
        email: user.email,
        connectedAt: new Date().toISOString()
      };
      save(saved);
      go("home");
    } catch (error) {
      loginBusy = false;
      render();
      const currentError = document.querySelector("#supabase-login-error");
      if (currentError) currentError.textContent = error.message || "Sign-in failed.";
      else if (errorElement) errorElement.textContent = error.message || "Sign-in failed.";
    }
  };

  async function refreshConnectionStatus() {
    const online = await window.CCEMSSupabase.health();
    if (online === connectionOnline) return;
    connectionOnline = online;
    const element = document.querySelector("#supabase-connection");
    if (element) element.innerHTML = connectionLabel();
  }

  const previousRender = render;
  render = function () {
    previousRender();
    if (view === "login") refreshConnectionStatus();
  };
})();
