(() => {
  const body = document.body;
  const toggle = document.querySelector("[data-sidebar-toggle]");
  const scrim = document.querySelector("[data-sidebar-close]");
  const sidebar = document.querySelector("#site-sidebar");
  const closeMenu = () => {
    body.classList.remove("sidebar-open");
    toggle?.setAttribute("aria-expanded", "false");
  };
  toggle?.addEventListener("click", () => {
    const open = body.classList.toggle("sidebar-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  scrim?.addEventListener("click", closeMenu);
  sidebar?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });

  const progress = document.querySelector("#scroll-progress-bar");
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progress) progress.style.width = value + "%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const path = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = [...document.querySelectorAll("[data-nav-link]")];
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isUpdates = path === "updates.html" && href === "updates.html";
    const isHome = path !== "updates.html" && href === "#home";
    if (isUpdates || isHome) link.classList.add("active");
  });
  if (path !== "updates.html" && "IntersectionObserver" in window) {
    const sectionLinks = new Map(navLinks.map((link) => [link.getAttribute("href"), link]));
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.classList.remove("active"));
        sectionLinks.get("#" + entry.target.id)?.classList.add("active");
      });
    }, { rootMargin: "-25% 0px -60% 0px", threshold: 0 });
    document.querySelectorAll("main > section[id]").forEach((section) => sectionObserver.observe(section));
  }

  const revealTargets = document.querySelectorAll(".page-section, .social-card, .release-card, .about-card, .spotify-panel, .update-card, .updates-admin-card, .updates-feed");
  if ("IntersectionObserver" in window) {
    body.classList.add("reveal-ready");
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px 0px" });
    revealTargets.forEach((element, index) => {
      element.classList.add("reveal-on-scroll");
      if (element.matches(".social-card, .release-card, .update-card")) {
        element.style.transitionDelay = Math.min(index % 6, 5) * 55 + "ms";
      }
      observer.observe(element);
    });
  }

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (finePointer) {
    document.querySelectorAll(".social-card, .release-card, .spotify-panel, .about-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", (event.clientX - rect.left) + "px");
        card.style.setProperty("--spot-y", (event.clientY - rect.top) + "px");
      });
    });
  }
})();
