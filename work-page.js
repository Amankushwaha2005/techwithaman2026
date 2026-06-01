/**
 * =============================================================================
 * CLIENT — work-page.js
 * URL: /work
 * Custom category/skill pickers for hiring form
 * =============================================================================
 */

(function () {
  var roleMap = {
    "App Development": [
      "Android Developer",
      "iOS Developer",
      "Flutter Developer",
      "React Native Developer",
      "Cross-platform App Developer",
    ],
    "Development & IT": [
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "WordPress Developer",
      "QA / Testing Engineer",
    ],
    "Design & Creative": [
      "UI/UX Designer",
      "Graphic Designer",
      "Logo Designer",
      "Social Media Designer",
      "Content Writer",
    ],
    "Admin & Support": [
      "Virtual Assistant",
      "Customer Support Executive",
      "Data Entry Operator",
      "Project Coordinator",
    ],
    "Video & Audio": [
      "Video Editor",
      "Motion Graphics Editor",
      "Subtitle Writer",
      "Audio Editor",
    ],
    "AI & Automation": [
      "AI Prompt Engineer",
      "Automation Specialist",
      "Chatbot Builder",
      "No-Code Workflow Expert",
    ],
  };

  var categoryKeys = Object.keys(roleMap);

  function closeAllPickers(except) {
    document.querySelectorAll(".work-picker.is-open").forEach(function (p) {
      if (p !== except) {
        p.classList.remove("is-open");
        var btn = p.querySelector(".work-picker__trigger");
        var menuEl = p.querySelector(".work-picker__menu");
        if (btn) btn.setAttribute("aria-expanded", "false");
        if (menuEl) menuEl.hidden = true;
      }
    });
  }

  function initPicker(pickerEl, options) {
    var trigger = pickerEl.querySelector(".work-picker__trigger");
    var valueEl = pickerEl.querySelector(".work-picker__value");
    var menu = pickerEl.querySelector(".work-picker__menu");
    var hidden = pickerEl.querySelector('input[type="hidden"]');
    if (!trigger || !valueEl || !menu || !hidden) return null;

    function setValue(val, label) {
      hidden.value = val || "";
      valueEl.textContent = label || options.placeholder || "Select";
      pickerEl.classList.toggle("has-value", !!val);
      menu.querySelectorAll(".work-picker__option").forEach(function (btn) {
        btn.classList.toggle("is-selected", btn.getAttribute("data-value") === val);
      });
      if (options.onChange) options.onChange(val, label);
    }

    function renderMenu(items) {
      menu.innerHTML = "";
      items.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "work-picker__option";
        btn.setAttribute("data-value", item.value);
        btn.textContent = item.label;
        btn.addEventListener("click", function () {
          setValue(item.value, item.label);
          pickerEl.classList.remove("is-open");
          trigger.setAttribute("aria-expanded", "false");
          menu.hidden = true;
        });
        menu.appendChild(btn);
      });
    }

    renderMenu(options.items || []);

    trigger.addEventListener("click", function () {
      if (pickerEl.classList.contains("is-disabled")) return;
      var open = !pickerEl.classList.contains("is-open");
      closeAllPickers(null);
      if (open) {
        pickerEl.classList.add("is-open");
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
      } else {
        pickerEl.classList.remove("is-open");
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    pickerEl.setValue = setValue;
    pickerEl.setDisabled = function (disabled) {
      pickerEl.classList.toggle("is-disabled", disabled);
      trigger.disabled = disabled;
    };
    pickerEl.renderMenu = renderMenu;

    return pickerEl;
  }

  var categoryPicker = document.getElementById("workCategoryPicker");
  var skillPicker = document.getElementById("workSkillPicker");
  if (!categoryPicker || !skillPicker) return;

  var category = initPicker(categoryPicker, {
    placeholder: "Select a category",
    items: categoryKeys.map(function (k) {
      return { value: k, label: k };
    }),
    onChange: function (val) {
      var roles = roleMap[val] || [];
      skillPicker.renderMenu(
        roles.map(function (r) {
          return { value: r, label: r };
        }),
      );
      skillPicker.setValue("", roles.length ? "Select role / skill" : "First select a category");
      skillPicker.setDisabled(roles.length === 0);
    },
  });

  var skill = initPicker(skillPicker, {
    placeholder: "First select a category",
    items: [],
  });
  skill.setDisabled(true);

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".work-picker")) closeAllPickers(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAllPickers(null);
  });
})();
