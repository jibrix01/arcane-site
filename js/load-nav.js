async function loadComponent(id, file) {
  const element = document.getElementById(id);

  const response = await fetch(file);
  const html = await response.text();

  element.innerHTML = html;

  // Initialize mobile navigation toggle after injection
  initMobileNav();
}

function initMobileNav() {
  const toggleBtn = document.getElementById("mobile-nav-toggle");
  const navContainer = document.querySelector(".rune-nav-container");

  if (toggleBtn && navContainer) {
    toggleBtn.addEventListener("click", () => {
      // Toggle the 'is-active' class on both elements
      toggleBtn.classList.toggle("is-active");
      navContainer.classList.toggle("is-active");
    });
  }
}

loadComponent("nav-placeholder", "/components/nav.html");
