(function () {
  const slides = Array.from(document.querySelectorAll(".slide"));
  const progressBar = document.querySelector(".progress-bar");
  const slideCounter = document.querySelector(".slide-counter");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let currentIndex = getInitialIndex();
  let overviewMode = false;

  slides.forEach((slide) => {
    slide.querySelectorAll(".motion-item").forEach((item, index) => {
      item.style.setProperty("--i", index);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");
      if (action === "next") goTo(currentIndex + 1);
      if (action === "previous") goTo(currentIndex - 1);
      if (action === "overview") toggleOverview();
      if (action === "print") window.print();
    });
  });

  slides.forEach((slide, index) => {
    slide.addEventListener("click", () => {
      if (!overviewMode) return;
      overviewMode = false;
      document.body.classList.remove("overview-mode");
      goTo(index);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    const key = event.key;

    if (key === "ArrowRight" || key === "PageDown" || key === " ") {
      event.preventDefault();
      goTo(currentIndex + 1);
    }

    if (key === "ArrowLeft" || key === "PageUp") {
      event.preventDefault();
      goTo(currentIndex - 1);
    }

    if (key === "Home") {
      event.preventDefault();
      goTo(0);
    }

    if (key === "End") {
      event.preventDefault();
      goTo(slides.length - 1);
    }

    if (key.toLowerCase() === "o") {
      event.preventDefault();
      toggleOverview();
    }

    if (key === "Escape" && overviewMode) {
      event.preventDefault();
      overviewMode = false;
      document.body.classList.remove("overview-mode");
      goTo(currentIndex);
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) < 54 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX < 0) goTo(currentIndex + 1);
      if (deltaX > 0) goTo(currentIndex - 1);
    },
    { passive: true }
  );

  window.addEventListener("hashchange", () => {
    const nextIndex = getInitialIndex();
    if (nextIndex !== currentIndex) goTo(nextIndex, { updateHash: false });
  });

  window.addEventListener("load", renderIcons);

  renderIcons();
  setupCtaInteractions();
  goTo(currentIndex, { updateHash: false });

  function getInitialIndex() {
    const match = window.location.hash.match(/slide-(\d+)/);
    if (!match) return 0;
    const requested = Number.parseInt(match[1], 10) - 1;
    if (Number.isNaN(requested)) return 0;
    return clamp(requested, 0, slides.length - 1);
  }

  function goTo(index, options = {}) {
    const updateHash = options.updateHash !== false;
    currentIndex = clamp(index, 0, slides.length - 1);

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === currentIndex);
      slide.setAttribute("aria-hidden", slideIndex === currentIndex ? "false" : "true");
      if (slideIndex === currentIndex) slide.scrollTop = 0;
    });

    if (overviewMode) {
      document.body.classList.add("overview-mode");
    }

    updateProgress();
    animateSlide(slides[currentIndex]);
    updateButtons();

    const title = slides[currentIndex].getAttribute("data-title") || "Slide";
    document.title = `${currentIndex + 1}. ${title} - YEMS Administrative Presentation`;

    if (updateHash) {
      history.replaceState(null, "", `#slide-${currentIndex + 1}`);
    }
  }

  function updateProgress() {
    const percent = ((currentIndex + 1) / slides.length) * 100;
    progressBar.style.width = `${percent}%`;
    slideCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }

  function updateButtons() {
    const previous = document.querySelector('[data-action="previous"]');
    const next = document.querySelector('[data-action="next"]');

    if (previous) previous.disabled = currentIndex === 0;
    if (next) next.disabled = currentIndex === slides.length - 1;
  }

  function animateSlide(slide) {
    const items = Array.from(slide.querySelectorAll(".motion-item"));
    const counters = Array.from(slide.querySelectorAll("[data-count]"));
    const ctaButtons = Array.from(slide.querySelectorAll(".cta-action"));
    const ctaUnderlines = Array.from(slide.querySelectorAll(".cta-underline"));

    slides.forEach((item) => {
      item.classList.remove("animate__animated", "animate__fadeIn");
    });

    slide.classList.add("animate__animated", "animate__fadeIn");

    if (reduceMotion || overviewMode) {
      counters.forEach((counter) => {
        counter.textContent = `${counter.dataset.count}${counter.dataset.suffix || ""}`;
      });
      ctaUnderlines.forEach((underline) => {
        underline.style.transform = "scaleX(1)";
      });
      return;
    }

    if (window.gsap) {
      window.gsap.killTweensOf([...items, ...ctaButtons, ...ctaUnderlines]);
      window.gsap.fromTo(
        items,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.56,
          stagger: 0.07,
          ease: "power2.out",
        }
      );

      if (ctaButtons.length) {
        window.gsap.fromTo(
          ctaButtons,
          { autoAlpha: 0, scale: 0.94, y: 18 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.54,
            stagger: 0.08,
            delay: 0.28,
            ease: "back.out(1.8)",
          }
        );

        window.gsap.fromTo(
          ctaUnderlines,
          { scaleX: 0.18, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 0.68,
            stagger: 0.08,
            delay: 0.42,
            ease: "power3.out",
          }
        );
      }

      counters.forEach((counter) => {
        const target = Number.parseInt(counter.dataset.count, 10);
        const suffix = counter.dataset.suffix || "";
        const state = { value: 0 };
        window.gsap.to(state, {
          value: target,
          duration: 0.85,
          ease: "power1.out",
          onUpdate: () => {
            counter.textContent = `${Math.round(state.value)}${suffix}`;
          },
          onComplete: () => {
            counter.textContent = `${target}${suffix}`;
          },
        });
      });
    } else {
      counters.forEach((counter) => {
        counter.textContent = `${counter.dataset.count}${counter.dataset.suffix || ""}`;
      });
    }
  }

  function setupCtaInteractions() {
    document.querySelectorAll(".cta-action").forEach((button) => {
      const underline = button.querySelector(".cta-underline");
      const icon = button.querySelector("svg, i");

      const lift = () => {
        if (!window.gsap || reduceMotion) return;
        window.gsap.to(button, {
          y: -5,
          scale: 1.035,
          duration: 0.22,
          ease: "power2.out",
        });
        if (underline) {
          window.gsap.to(underline, {
            scaleX: 1,
            duration: 0.24,
            ease: "power2.out",
          });
        }
        if (icon) {
          window.gsap.to(icon, {
            x: 3,
            rotate: 6,
            duration: 0.22,
            ease: "power2.out",
          });
        }
      };

      const settle = () => {
        if (!window.gsap || reduceMotion) return;
        window.gsap.to(button, {
          y: 0,
          scale: 1,
          duration: 0.24,
          ease: "power2.out",
        });
        if (underline && button.getAttribute("aria-pressed") !== "true") {
          window.gsap.to(underline, {
            scaleX: 0.42,
            duration: 0.24,
            ease: "power2.out",
          });
        }
        if (icon) {
          window.gsap.to(icon, {
            x: 0,
            rotate: 0,
            duration: 0.24,
            ease: "power2.out",
          });
        }
      };

      button.addEventListener("mouseenter", lift);
      button.addEventListener("focus", lift);
      button.addEventListener("mouseleave", settle);
      button.addEventListener("blur", settle);

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const active = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!active));
        button.classList.toggle("is-active", !active);

        if (!window.gsap || reduceMotion) return;
        window.gsap.fromTo(
          button,
          { scale: 0.98 },
          {
            scale: 1.06,
            duration: 0.16,
            yoyo: true,
            repeat: 1,
            ease: "power2.out",
          }
        );
        if (underline) {
          window.gsap.fromTo(
            underline,
            { scaleX: 0.2 },
            {
              scaleX: 1,
              duration: 0.34,
              ease: "power3.out",
            }
          );
        }
      });
    });
  }

  function toggleOverview() {
    overviewMode = !overviewMode;
    document.body.classList.toggle("overview-mode", overviewMode);
    animateSlide(slides[currentIndex]);
  }

  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
