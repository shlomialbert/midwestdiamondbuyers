/**
 * Midwest Diamond Buyers — Form Handler
 * ---------------------------------------------------------
 * Wires up:
 *   1. Every ".gSheetForm" (the "Inquiry Details" contact form,
 *      used on Contact / About / Categories pages) -> Apps Script
 *      Scenario 1 ("Contacts" sheet). Sent as standard
 *      x-www-form-urlencoded, matching e.parameter on the backend.
 *   2. The "#dynamic-intake" form (diamond/watch/jewelry
 *      evaluation, on the Categories page) -> Apps Script
 *      Scenario 2 ("Selling_Item" sheet). Sent as JSON matching
 *      { contact: {...}, intake: { intakeTitle, fields, image* } }.
 *
 * IMPORTANT: replace APPS_SCRIPT_URL below with the Web app URL
 * from your EXISTING Google Apps Script deployment (the one that
 * already writes to the "Contacts" / "Selling_Item" tabs).
 * ---------------------------------------------------------
 */
(function () {
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxy5p0VKj70PK49b26piaTAi639ttG39KklapDBIljITKtjdxJqyI-CX3UIa7LZVCMGFA/exec";

  function showConfirmation(message) {
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(11,15,23,0.55);z-index:9999;" +
      "display:flex;align-items:center;justify-content:center;padding:20px;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#fbfbf9;color:#0b0f17;max-width:420px;width:100%;" +
      "border-radius:18px;padding:32px 28px;text-align:center;" +
      "font-family:Inter,system-ui,-apple-system,sans-serif;" +
      "box-shadow:0 18px 60px rgba(0,0,0,0.28);";

    box.innerHTML =
      '<div style="width:52px;height:52px;border-radius:50%;background:rgba(0,85,162,0.1);' +
      'display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0055a2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
      "</div>" +
      '<h3 style="font-family:\'Playfair Display\',serif;font-size:1.4rem;margin-bottom:10px;">Thank you</h3>' +
      '<p style="font-size:0.98rem;color:rgba(11,15,23,0.72);margin-bottom:22px;line-height:1.5;">' +
      message +
      "</p>" +
      '<button type="button" style="background:#0055a2;color:#fff;border:none;border-radius:999px;' +
      'padding:12px 28px;font-weight:700;font-size:0.85rem;letter-spacing:0.06em;' +
      'text-transform:uppercase;cursor:pointer;">Close</button>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }
    box.querySelector("button").addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
  }

  function showError() {
    showConfirmation(
      "Something went wrong sending your details. Please call us directly at 708 683 9833 so we don't miss you."
    );
  }

  function setSubmitting(form, isSubmitting) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (isSubmitting) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
      btn.disabled = false;
    }
  }

  function isConfigured() {
    if (APPS_SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
      console.error(
        "form-handler.js: APPS_SCRIPT_URL is not configured yet. Paste in your existing Apps Script Web app URL."
      );
      return false;
    }
    return true;
  }

  // ---- Scenario 1: standard "Inquiry Details" contact forms ----
  function setLoadTimestamps() {
    document.querySelectorAll('input[name="form_loaded_at"]').forEach(function (el) {
      el.value = String(Date.now());
    });
  }

  // A submission is treated as a bot if the honeypot field has any value,
  // or if the form was submitted implausibly fast (bots are near-instant;
  // real people take at least a couple of seconds to read and type).
  const MIN_HUMAN_SECONDS = 3;

  function looksLikeBot(honeypotValue, loadedAtMs) {
    if (honeypotValue) return true;
    if (!loadedAtMs) return false;
    const elapsedSeconds = (Date.now() - Number(loadedAtMs)) / 1000;
    return elapsedSeconds < MIN_HUMAN_SECONDS;
  }

  function wireContactForms() {
    document.querySelectorAll("form.gSheetForm").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;
        if (!isConfigured()) {
          showError();
          return;
        }

        const hp = form.querySelector('input[name="hp_field"]');
        const loadedAt = form.querySelector('input[name="form_loaded_at"]');
        if (looksLikeBot(hp && hp.value, loadedAt && loadedAt.value)) {
          // Silently "succeed" without actually sending anything —
          // a real visitor never hits this path.
          form.reset();
          showConfirmation(
            "We've received your details and will reach out shortly to schedule your private evaluation."
          );
          return;
        }

        setSubmitting(form, true);

        // Sent as x-www-form-urlencoded so the backend's e.parameter
        // (form_type, fullName, email, phone, preferredContact, assets)
        // populates correctly.
        const body = new URLSearchParams(new FormData(form));

        fetch(APPS_SCRIPT_URL, { method: "POST", body: body })
          .then(function (res) {
            return res.json();
          })
          .then(function (json) {
            setSubmitting(form, false);
            if (json && json.result === "success") {
              form.reset();
              showConfirmation(
                "We've received your details and will reach out shortly to schedule your private evaluation."
              );
            } else {
              showError();
            }
          })
          .catch(function () {
            setSubmitting(form, false);
            showError();
          });
      });
    });
  }

  // ---- Scenario 2: diamond / watch / jewelry evaluation form ----
  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        // reader.result looks like "data:image/png;base64,AAAA..."
        const base64 = reader.result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function wireDynamicIntakeForm() {
    const form = document.getElementById("dynamic-intake");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (!isConfigured()) {
        showError();
        return;
      }

      const intakeHp = document.getElementById("intakeHpField");
      if (looksLikeBot(intakeHp && intakeHp.value, window.__intakeOpenedAt)) {
        form.reset();
        showConfirmation(
          "We've received your item details and will reach out shortly to schedule your private evaluation."
        );
        return;
      }

      const titleEl = document.getElementById("form-title");
      const intakeTitle = titleEl ? titleEl.textContent.trim() : "Evaluation";

      // Build { "Label": "value" } from every field inside #form-questions
      // that carries a data-label attribute (item-specific questions only —
      // contact fields and the file input are handled separately below).
      const fields = {};
      form.querySelectorAll("#form-questions [data-label]").forEach(function (el) {
        let value = el.value || "";
        // Fold "Other" free-text companions into the main value.
        if (el.id === "watchBrand" && value === "Other") {
          const other = document.getElementById("watchBrandOther");
          if (other && other.value) value = other.value;
        }
        if (el.id === "watchModel" && value === "Other") {
          const other = document.getElementById("watchModelOther");
          if (other && other.value) value = other.value;
        }
        if (el.id === "jewelryBrand" && value === "Other") {
          const other = document.getElementById("brandOther");
          if (other && other.value) value = other.value;
        }
        fields[el.getAttribute("data-label")] = value;
      });

      const contact = {
        fullName: (document.getElementById("intakeFullName") || {}).value || "",
        email: (document.getElementById("intakeEmail") || {}).value || "",
        phone: (document.getElementById("intakePhone") || {}).value || "",
        preferredContact: (document.getElementById("intakePreferredContact") || {}).value || "",
      };

      const fileInput = document.getElementById("itemImage");
      const file = fileInput && fileInput.files && fileInput.files[0];

      setSubmitting(form, true);

      const buildPayloadAndSend = function (imageData) {
        const payload = {
          hp_field: (intakeHp && intakeHp.value) || "",
          form_loaded_at: window.__intakeOpenedAt || "",
          contact: contact,
          intake: Object.assign(
            { intakeTitle: intakeTitle, fields: fields },
            imageData || {}
          ),
        };

        fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (json) {
            setSubmitting(form, false);
            if (json && json.result === "success") {
              form.reset();
              showConfirmation(
                "We've received your item details and will reach out shortly to schedule your private evaluation."
              );
            } else {
              showError();
            }
          })
          .catch(function () {
            setSubmitting(form, false);
            showError();
          });
      };

      if (file) {
        fileToBase64(file)
          .then(function (base64) {
            buildPayloadAndSend({
              imageBase64: base64,
              imageMimeType: file.type,
              imageName: file.name,
            });
          })
          .catch(function () {
            // If the image fails to read, still submit the rest of the details.
            buildPayloadAndSend(null);
          });
      } else {
        buildPayloadAndSend(null);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setLoadTimestamps();
    wireContactForms();
    wireDynamicIntakeForm();
  });
})();
