"use strict";

(function () {
  const CHECKOUT_STORAGE_KEY = "mg_checkout_last_order_v1";
  const DEVICE_STORAGE_KEY = "mg_checkout_device_id_v1";
  const DEFAULT_API_BASE = "https://api.mgen.fun";
  const DEFAULT_PROVIDER = "lemonsqueezy";

  const checkoutSection = document.querySelector("#buy");
  if (!checkoutSection) {
    return;
  }

  const checkoutForm = checkoutSection.querySelector("[data-checkout-form]");
  const orderStatusForm = checkoutSection.querySelector("[data-order-status-form]");
  if (!checkoutForm || !orderStatusForm) {
    return;
  }

  const checkoutStatus = checkoutSection.querySelector("[data-checkout-status]");
  const checkoutOrder = checkoutSection.querySelector("[data-checkout-order]");
  const orderStatus = checkoutSection.querySelector("[data-order-status]");
  const orderLicense = checkoutSection.querySelector("[data-order-license]");

  const checkoutSubmitButton = checkoutForm.querySelector("button[type='submit']");
  const statusSubmitButton = orderStatusForm.querySelector("button[type='submit']");

  const apiBase = normalizeApiBase(
    checkoutSection.getAttribute("data-license-api-base") ||
      (typeof window !== "undefined" ? window.MG_LICENSE_API_BASE : "") ||
      DEFAULT_API_BASE
  );

  hydrateFormsFromStorage();

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = readFieldValue(checkoutForm, "email");
    const provider = normalizeProvider(readFieldValue(checkoutForm, "provider"));
    if (!isValidEmail(email)) {
      setStatus(checkoutStatus, "Enter a valid email for checkout.", true);
      return;
    }

    disableButton(checkoutSubmitButton, true);
    setStatus(checkoutStatus, "Creating checkout order...", false);
    hideNode(checkoutOrder, true);

    try {
      const response = await postJson(`${apiBase}/v1/payment/create-checkout`, {
        provider,
        email,
        device_id: resolveDeviceId(),
      });

      if (!response.ok || !response.payload.available || !response.payload.checkout_url) {
        const message =
          response.payload.message ||
          response.payload.error ||
          "Checkout is unavailable right now. Please retry in a minute.";
        setStatus(checkoutStatus, message, true);
        return;
      }

      const orderId = safeString(response.payload.order_id);
      persistLastOrder({
        email,
        provider: safeString(response.payload.provider) || provider,
        order_id: orderId,
      });
      syncStatusFormFromLastOrder();
      if (orderId) {
        setOrderLabel(orderId);
      }

      setStatus(checkoutStatus, "Order created. Redirecting to checkout...", false);
      window.setTimeout(() => {
        window.location.assign(response.payload.checkout_url);
      }, 300);
    } catch (_error) {
      setStatus(
        checkoutStatus,
        "Cannot reach checkout API. Please retry or use in-app Buy License.",
        true
      );
    } finally {
      disableButton(checkoutSubmitButton, false);
    }
  });

  orderStatusForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = readFieldValue(orderStatusForm, "email");
    const orderId = readFieldValue(orderStatusForm, "order_id");
    const provider = normalizeProvider(readFieldValue(orderStatusForm, "provider"));

    if (!isValidEmail(email)) {
      setStatus(orderStatus, "Enter the same email used during checkout.", true);
      return;
    }
    if (!orderId) {
      setStatus(orderStatus, "Enter a valid order ID.", true);
      return;
    }

    disableButton(statusSubmitButton, true);
    setStatus(orderStatus, "Checking order status...", false);
    hideNode(orderLicense, true);

    try {
      const response = await postJson(`${apiBase}/v1/payment/order-status`, {
        provider,
        order_id: orderId,
        email,
      });

      if (!response.ok) {
        const message =
          response.payload.error ||
          response.payload.message ||
          "Order status lookup failed. Retry in a minute.";
        setStatus(orderStatus, message, true);
        return;
      }

      persistLastOrder({
        email,
        provider,
        order_id: orderId,
      });

      if (!response.payload.found) {
        setStatus(orderStatus, "Order not found yet. Recheck after payment confirmation.", true);
        return;
      }

      const statusText = safeString(response.payload.status) || "pending";
      const message = safeString(response.payload.message);
      if (response.payload.licensed && response.payload.license_key) {
        setStatus(
          orderStatus,
          message || `Payment confirmed (${statusText}). License key is ready.`,
          false
        );
        setLicenseLabel(response.payload.license_key);
      } else {
        setStatus(
          orderStatus,
          message || `Order status: ${statusText}. License key is not issued yet.`,
          false
        );
      }
    } catch (_error) {
      setStatus(
        orderStatus,
        "Cannot reach order-status API. Please retry or activate later in app.",
        true
      );
    } finally {
      disableButton(statusSubmitButton, false);
    }
  });

  function normalizeApiBase(base) {
    const normalized = safeString(base).trim().replace(/\/+$/, "");
    return normalized || DEFAULT_API_BASE;
  }

  function normalizeProvider(provider) {
    const normalized = safeString(provider).trim().toLowerCase();
    return normalized || DEFAULT_PROVIDER;
  }

  function safeString(value) {
    return typeof value === "string" ? value : "";
  }

  function readFieldValue(form, fieldName) {
    const value = new FormData(form).get(fieldName);
    return safeString(value).trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function disableButton(button, disabled) {
    if (!button) {
      return;
    }
    button.disabled = disabled;
  }

  function setStatus(node, text, isError) {
    if (!node) {
      return;
    }
    node.textContent = text;
    node.classList.remove("status-ok", "status-error");
    node.classList.add(isError ? "status-error" : "status-ok");
  }

  function hideNode(node, hidden) {
    if (!node) {
      return;
    }
    node.hidden = hidden;
  }

  function setOrderLabel(orderId) {
    if (!checkoutOrder) {
      return;
    }
    checkoutOrder.textContent = `Order ID: ${orderId}`;
    hideNode(checkoutOrder, false);
  }

  function setLicenseLabel(licenseKey) {
    if (!orderLicense) {
      return;
    }
    orderLicense.textContent = `License key: ${licenseKey}`;
    hideNode(orderLicense, false);
  }

  function resolveDeviceId() {
    const existing = readStorage(DEVICE_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    const next = `web-${Date.now().toString(36)}-${randomToken(8)}`;
    writeStorage(DEVICE_STORAGE_KEY, next);
    return next;
  }

  function randomToken(length) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let output = "";
    for (let index = 0; index < length; index += 1) {
      output += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return output;
  }

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_error) {
      return "";
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_error) {
      // Ignore local storage failures and continue with stateless behavior.
    }
  }

  function readLastOrder() {
    const raw = readStorage(CHECKOUT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return {
        email: safeString(parsed.email).trim(),
        provider: normalizeProvider(parsed.provider),
        order_id: safeString(parsed.order_id).trim(),
      };
    } catch (_error) {
      return null;
    }
  }

  function persistLastOrder(order) {
    writeStorage(CHECKOUT_STORAGE_KEY, JSON.stringify(order));
  }

  function hydrateFormsFromStorage() {
    syncStatusFormFromLastOrder();
  }

  function syncStatusFormFromLastOrder() {
    const order = readLastOrder();
    if (!order) {
      return;
    }

    setFieldValue(checkoutForm, "email", order.email);
    setFieldValue(checkoutForm, "provider", order.provider);
    setFieldValue(orderStatusForm, "email", order.email);
    setFieldValue(orderStatusForm, "provider", order.provider);
    if (order.order_id) {
      setFieldValue(orderStatusForm, "order_id", order.order_id);
      setOrderLabel(order.order_id);
    }
  }

  function setFieldValue(form, fieldName, value) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (!field) {
      return;
    }
    field.value = value;
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let parsed = {};
    try {
      parsed = await response.json();
    } catch (_error) {
      parsed = {};
    }

    return {
      ok: response.ok,
      status: response.status,
      payload: parsed,
    };
  }
})();
