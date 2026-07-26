import { supabase } from "./supabase_init.js";

// Where to send someone who isn't signed in.
const LOGIN_PAGE = "login.html";

const { data } = await supabase.auth.getSession();

if (!data?.session) {
  window.location.href = LOGIN_PAGE;
}

// Keep pages in sync if the session ends elsewhere (e.g. logout in another tab).
supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    window.location.href = LOGIN_PAGE;
  }
});

// Optional: wire up any element with [data-logout] to sign the user out.
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-logout]");
  if (!trigger) return;
  supabase.auth.signOut().then(() => {
    window.location.href = LOGIN_PAGE;
  });
});
