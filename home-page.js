(function () {
  function initHome() {
    const data = window.HOME_DATA;
    if (!data || !data.items) return false;

    const modal = document.getElementById("home-detail-modal");
    const modalBody = document.getElementById("home-detail-body");
    const modalClose = document.querySelector(".home-detail-close");
    const modalBackdrop = document.querySelector(".home-detail-backdrop");

    function openDetail(id) {
      const item = data.items[id];
      if (!item || !modal || !modalBody) return;

      modalBody.innerHTML = `
      <div class="home-detail-grid">
        <div class="home-detail-media">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
        </div>
        <div class="home-detail-copy">
          <span class="chip">${item.tag}</span>
          <h2 id="home-detail-title">${item.title}</h2>
          <p class="home-detail-price">${item.price || ""}</p>
          <p class="home-detail-summary">${item.summary}</p>
          <ul class="home-detail-list">
            ${(item.details || []).map((d) => `<li>${d}</li>`).join("")}
          </ul>
          <div class="home-detail-actions">
            <a class="btn" href="${item.link || "/contact"}">${item.linkLabel || "Enquire"}</a>
            <a class="btn btn-outline" href="/contact">Contact Now</a>
          </div>
        </div>
      </div>`;

      modal.hidden = false;
      document.body.classList.add("home-modal-open");
    }

    function closeDetail() {
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove("home-modal-open");
    }

    function bindHomeCards(root) {
      (root || document).querySelectorAll(".home-card[data-home-id]").forEach((card) => {
        if (card.dataset.bound === "1") return;
        card.dataset.bound = "1";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.addEventListener("click", () => openDetail(card.getAttribute("data-home-id")));
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDetail(card.getAttribute("data-home-id"));
          }
        });
      });
    }

    if (modalClose) modalClose.addEventListener("click", closeDetail);
    if (modalBackdrop) modalBackdrop.addEventListener("click", closeDetail);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDetail();
    });

    function homeCardHtml(id) {
      const item = data.items[id];
      if (!item) return "";
      return `
      <article class="card home-card" data-home-id="${id}">
        <div class="home-card__media">
          <img src="${item.image.replace("w=1200", "w=900")}" alt="${item.title}" loading="lazy" decoding="async">
        </div>
        <div class="home-card__body">
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <span class="home-card__link">View details →</span>
        </div>
      </article>`;
    }

    function showcaseCardHtml(s) {
      return `
      <article class="home-showcase-box card">
        <button type="button" class="home-showcase-slide-hit" data-home-id="${s.homeId || ""}" aria-label="Open details for ${s.title}">
          <div class="home-showcase-frame">
            <img src="${s.image}" alt="${s.title}" loading="lazy">
          </div>
          <div class="home-showcase-meta">
            <p class="home-showcase-brand">${s.brand}</p>
            <h3>${s.title}</h3>
            <p class="home-showcase-desc">${s.description}</p>
            <span class="home-showcase-more">View details →</span>
          </div>
        </button>
      </article>`;
    }

    function mountCarousel(opts) {
      const { slider, viewport, dotsEl, prevBtn, nextBtn, slidesHtml, onBuilt } = opts;
      if (!slider || !viewport || !slidesHtml.length) return;

      let slideIndex = 0;
      let timer = null;
      const totalSlides = slidesHtml.length;
      const INTERVAL = opts.interval || 4000;

      slider.innerHTML = slidesHtml
        .map((html) => `<div class="home-showcase-slide"><div class="home-showcase-row">${html}</div></div>`)
        .join("");

      if (onBuilt) onBuilt(slider);
      bindHomeCards(slider);

      slider.querySelectorAll(".home-showcase-slide-hit").forEach((hit) => {
        hit.addEventListener("click", () => {
          const id = hit.getAttribute("data-home-id");
          if (id) openDetail(id);
        });
      });

      function slideWidth() {
        return viewport.clientWidth || 0;
      }

      function updateDots() {
        if (!dotsEl) return;
        dotsEl.querySelectorAll(".home-showcase-dot").forEach((dot, di) => {
          dot.classList.toggle("is-active", di === slideIndex);
        });
      }

      function goTo(i) {
        slideIndex = ((i % totalSlides) + totalSlides) % totalSlides;
        slider.style.transform = `translate3d(-${slideIndex * slideWidth()}px, 0, 0)`;
        updateDots();
      }

      function startAuto() {
        if (timer) window.clearInterval(timer);
        if (document.hidden) return;
        timer = window.setInterval(() => goTo(slideIndex + 1), INTERVAL);
      }

      function stopAuto() {
        if (timer) {
          window.clearInterval(timer);
          timer = null;
        }
      }

      if (dotsEl) {
        dotsEl.innerHTML = slidesHtml
          .map(
            (_, i) =>
              `<button type="button" class="home-showcase-dot" aria-label="Slide ${i + 1}" data-index="${i}"></button>`,
          )
          .join("");
        dotsEl.querySelectorAll(".home-showcase-dot").forEach((dot) => {
          dot.addEventListener("click", () => {
            goTo(Number(dot.getAttribute("data-index")));
            startAuto();
          });
        });
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", () => {
          goTo(slideIndex - 1);
          startAuto();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          goTo(slideIndex + 1);
          startAuto();
        });
      }

      const onResize = () => goTo(slideIndex);
      window.addEventListener("resize", onResize);

      goTo(0);
      startAuto();

      return { goTo, startAuto, stopAuto };
    }

    let mounted = false;

    if (data.showcase && data.showcase.length >= 3) {
      const len = data.showcase.length;
      const slides = [];
      for (let i = 0; i < len; i++) {
        const html = [0, 1, 2]
          .map((j) => showcaseCardHtml(data.showcase[(i + j) % len]))
          .join("");
        slides.push(html);
      }
      mountCarousel({
        slider: document.getElementById("home-showcase-track"),
        viewport: document.querySelector("#home-showcase .home-showcase-viewport"),
        dotsEl: document.getElementById("home-showcase-dots"),
        prevBtn: document.querySelector(".home-showcase-prev"),
        nextBtn: document.querySelector(".home-showcase-next"),
        slidesHtml: slides,
      });
      mounted = true;
    }

    const planIds = data.pricingPlans || ["starter-plan", "professional-plan", "premium-plan"];
    if (planIds.length >= 2) {
      const slides = [];
      for (let i = 0; i < planIds.length; i++) {
        const i1 = (i + 1) % planIds.length;
        slides.push(homeCardHtml(planIds[i]) + homeCardHtml(planIds[i1]));
      }
      mountCarousel({
        slider: document.getElementById("home-pricing-track"),
        viewport: document.querySelector(".home-pricing-viewport"),
        dotsEl: document.getElementById("home-pricing-dots"),
        prevBtn: document.querySelector(".home-pricing-prev"),
        nextBtn: document.querySelector(".home-pricing-next"),
        slidesHtml: slides,
        interval: 4500,
      });
      mounted = true;
    }

    bindHomeCards(document.getElementById("services"));
    return true;
  }

  function boot() {
    if (window.__homePageReady) return;
    if (initHome()) {
      window.__homePageReady = true;
      return;
    }
    let tries = 0;
    const retry = window.setInterval(() => {
      tries += 1;
      if (initHome()) {
        window.__homePageReady = true;
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
