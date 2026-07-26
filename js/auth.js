import { supabase } from "./supabase_init.js";

// Where to send someone once they're signed in.
// Change this to whatever your Houses / landing page is actually called.
const REDIRECT_TO = "index.html";

const form = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorEl = document.getElementById("auth-error");
const successEl = document.getElementById("auth-success");
const submitBtn = document.getElementById("auth-submit");
const submitLabel = submitBtn.querySelector(".login-btn__label");

function clearMessages() {
  errorEl.hidden = true;
  errorEl.textContent = "";
  successEl.hidden = true;
  successEl.textContent = "";
}

function showError(message) {
  console.log(message);
  errorEl.textContent = message;
  errorEl.hidden = false;
  successEl.hidden = true;
}

function showSuccess(message) {
  console.log(message);
  successEl.textContent = message;
  successEl.hidden = false;
  errorEl.hidden = true;
}

// If someone's already signed in, skip straight past the door.
supabase.auth.getSession().then(({ data }) => {
  if (data?.session) {
    window.location.href = REDIRECT_TO;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Both email and password are required.");
    return;
  }

  submitBtn.disabled = true;

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    window.location.href = REDIRECT_TO;
  } catch (err) {
    showError(err.message || "Something went wrong. Try again.");
  } finally {
    submitBtn.disabled = false;
  }
});
