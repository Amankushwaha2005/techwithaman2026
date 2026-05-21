(function () {
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
  }

  function isProjectAvailable(p) {
    return p.available === true && typeof p.portfolioUrl === "string" && p.portfolioUrl.trim().length > 0;
  }

  function initPortfolio() {
    const data = window.PORTFOLIO_DATA;
    if (!data || !data.projects || !data.projects.length) return false;

    const grid = document.getElementById("portfolio-grid");
    const modal = document.getElementById("portfolio-detail-modal");
    const modalBody = document.getElementById("portfolio-detail-body");
    const modalClose = document.querySelector(".portfolio-detail-close");
    const modalBackdrop = document.querySelector(".portfolio-detail-backdrop");

    if (!grid) return false;

    function renderUnavailableModal(p) {
      const img = escapeHtml(p.image.replace("w=900", "w=1200"));
      const title = escapeHtml(p.title);
      const category = escapeHtml(p.category);
      const summary = escapeHtml(p.summary);

      modalBody.innerHTML = `
      <div class="home-detail-grid portfolio-detail--unavailable">
        <div class="home-detail-media">
          <img src="${img}" alt="${title}" loading="lazy">
        </div>
        <div class="home-detail-copy">
          <span class="chip">${category}</span>
          <h2 id="portfolio-detail-title">${title}</h2>
          <p class="home-detail-summary">${summary}</p>
          <div class="portfolio-not-available" role="status">
            <strong>Not available</strong>
            <p>This live portfolio has not been added yet. When the project is ready, only its portfolio will appear here.</p>
          </div>
        </div>
      </div>`;
    }

    function renderAvailableModal(p) {
      const img = escapeHtml(p.image.replace("w=900", "w=1200"));
      const title = escapeHtml(p.title);
      const category = escapeHtml(p.category);
      const summary = escapeHtml(p.summary);
      const url = escapeHtml(p.portfolioUrl.trim());
      const details = (p.details || []).map((d) => `<li>${escapeHtml(d)}</li>`).join("");
      const gallery = (p.gallery || [])
        .map(
          (src) =>
            `<img src="${escapeHtml(src)}" alt="" loading="lazy" class="portfolio-detail-gallery__img">`,
        )
        .join("");

      const galleryBlock = gallery
        ? `<div class="portfolio-detail-gallery">${gallery}</div>`
        : "";

      modalBody.innerHTML = `
      <div class="home-detail-grid">
        <div class="home-detail-media">
          <img src="${img}" alt="${title}" loading="lazy">
          ${galleryBlock}
        </div>
        <div class="home-detail-copy">
          <span class="chip">${category}</span>
          <h2 id="portfolio-detail-title">${title}</h2>
          <p class="home-detail-summary">${summary}</p>
          <ul class="home-detail-list">${details}</ul>
          <div class="home-detail-actions">
            <a class="btn" href="${url}" target="_blank" rel="noopener noreferrer">View live portfolio</a>
          </div>
        </div>
      </div>`;
    }

    function openProject(id) {
      const p = data.projects.find((x) => x.id === id);
      if (!p || !modal || !modalBody) return;

      if (isProjectAvailable(p)) {
        renderAvailableModal(p);
      } else {
        renderUnavailableModal(p);
      }

      modal.hidden = false;
      document.body.classList.add("home-modal-open");
    }

    function closeProject() {
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove("home-modal-open");
    }

    grid.innerHTML = data.projects
      .map((p) => {
        const ready = isProjectAvailable(p);
        const badge = ready
          ? ""
          : '<span class="portfolio-card__badge">Coming soon</span>';
        const linkText = ready ? "View portfolio →" : "View details →";

        return `
      <article class="card portfolio-card" data-portfolio-id="${p.id}" role="button" tabindex="0">
        <div class="portfolio-card__media">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async" width="900" height="563">
          ${badge}
        </div>
        <div class="portfolio-card__body">
          <span class="portfolio-card__tag">${escapeHtml(p.category)}</span>
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.summary)}</p>
          <span class="home-card__link">${linkText}</span>
        </div>
      </article>`;
      })
      .join("");

    grid.querySelectorAll(".portfolio-card").forEach((card) => {
      card.addEventListener("click", () => openProject(card.getAttribute("data-portfolio-id")));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProject(card.getAttribute("data-portfolio-id"));
        }
      });
    });

    if (modalClose) modalClose.addEventListener("click", closeProject);
    if (modalBackdrop) modalBackdrop.addEventListener("click", closeProject);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeProject();
    });

    return true;
  }

  function boot() {
    if (window.__portfolioReady) return;
    if (initPortfolio()) {
      window.__portfolioReady = true;
      return;
    }
    let tries = 0;
    const retry = window.setInterval(() => {
      tries += 1;
      if (initPortfolio()) {
        window.__portfolioReady = true;
        window.clearInterval(retry);
      } else if (tries > 30) {
        window.clearInterval(retry);
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
