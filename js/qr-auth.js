import { supabase } from "/js/supabase_init.js";

const ALLOWED_EMAILS = new Set([
  "mod@bootcamp13.com",
  "alanturing@bootcamp.com",
]);

const qrContent = document.getElementById("qr-content");
const denied = document.getElementById("access-denied");

async function checkAccess() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const email = session.user.email.toLowerCase();

  console.log("Logged in as:", email);

  if (ALLOWED_EMAILS.has(email)) {
    qrContent.hidden = false;
    denied.hidden = true;
  } else {
    qrContent.hidden = true;
    denied.hidden = false;
  }
}

checkAccess();
