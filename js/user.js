import { supabase } from "./supabase_init.js";

const emailEl = document.getElementById("user-email");

const {
  data: { user },
} = await supabase.auth.getUser();

if (user && emailEl) {
  emailEl.textContent = user.email;
}
