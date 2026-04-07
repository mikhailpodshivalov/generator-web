"use strict";

(function () {
  const CHECKOUT_STORAGE_KEY = "mg_checkout_last_order_v1";
  const DEVICE_STORAGE_KEY = "mg_checkout_device_id_v1";
  const PENDING_RETURN_STORAGE_KEY = "mg_checkout_pending_return_v1";
  const AUTO_CHECK_SESSION_KEY = "mg_checkout_auto_checked_order_v1";
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
  const orderLicenseRow = checkoutSection.querySelector("[data-order-license-row]");
  const orderLicense = checkoutSection.querySelector("[data-order-license]");
  const copyLicenseButton = checkoutSection.querySelector("[data-copy-license]");
  const copyStatus = checkoutSection.querySelector("[data-copy-status]");
  const licenseResultCard = checkoutSection.querySelector("[data-license-result-card]");

  const checkoutSubmitButton = checkoutForm.querySelector("button[type='submit']");
  const statusSubmitButton = orderStatusForm.querySelector("button[type='submit']");

  const apiBase = normalizeApiBase(
    checkoutSection.getAttribute("data-license-api-base") ||
      (typeof window !== "undefined" ? window.MG_LICENSE_API_BASE : "") ||
      DEFAULT_API_BASE
  );

  let currentLicenseKey = "";

  hydrateFormsFromStorage();
  bindCopyLicenseButton();
  initializeAutoOrderStatusCheck();

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
      const createdOrder = {
        email,
        provider: safeString(response.payload.provider) || provider,
        order_id: orderId,
      };

      persistLastOrder(createdOrder);
      persistPendingReturn(createdOrder);
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
    const orderIdInput = readFieldValue(orderStatusForm, "order_id");
    const provider = normalizeProvider(readFieldValue(orderStatusForm, "provider"));
    const { orderId, resolvedProvider } = resolveOrderLookupInput({
      email,
      orderId: orderIdInput,
      provider,
    });

    await executeOrderStatusLookup({
      email,
      orderId,
      provider: resolvedProvider,
      autoTriggered: false,
    });
  });

  async function executeOrderStatusLookup({ email, orderId, provider, autoTriggered }) {
    if (!isValidEmail(email)) {
      setStatus(orderStatus, "Enter the same email used during checkout.", true);
      return;
    }
    if (!orderId) {
      setStatus(
        orderStatus,
        "Order ID is auto-filled after Buy. For restore, open Advanced and paste order ID.",
        true
      );
      return;
    }

    disableButton(statusSubmitButton, true);
    clearLicenseOutput();
    setOrderLabel(orderId);

    if (autoTriggered) {
      hideNode(licenseResultCard, false);
    }
    setStatus(
      orderStatus,
      autoTriggered
        ? "Return detected. Checking order status automatically..."
        : "Checking order status...",
      false
    );

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

      persistLastOrder({ email, provider, order_id: orderId });

      if (!response.payload.found) {
        setStatus(
          orderStatus,
          autoTriggered
            ? "Order is not visible yet. Wait a moment and check again."
            : "Order not found yet. Recheck after payment confirmation.",
          true
        );
        return;
      }

      const statusText = safeString(response.payload.status) || "pending";
      const message = safeString(response.payload.message);

      if (response.payload.licensed && response.payload.license_key) {
        hideNode(licenseResultCard, false);
        setStatus(
          orderStatus,
          message || `Payment confirmed (${statusText}). License key is ready.`,
          false
        );
        setLicenseLabel(safeString(response.payload.license_key));
        clearPendingReturn();
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
  }

  function resolveOrderLookupInput({ email, orderId, provider }) {
    const normalizedProvider = normalizeProvider(provider);
    const directOrderId = safeString(orderId).trim();
    if (directOrderId) {
      return {
        orderId: directOrderId,
        resolvedProvider: normalizedProvider,
      };
    }

    const lastOrder = readLastOrder();
    if (!lastOrder) {
      return { orderId: "", resolvedProvider: normalizedProvider };
    }

    const requestedEmail = safeString(email).trim().toLowerCase();
    const lastOrderEmail = safeString(lastOrder.email).trim().toLowerCase();
    if (!requestedEmail || requestedEmail !== lastOrderEmail) {
      return { orderId: "", resolvedProvider: normalizedProvider };
    }

    const lastOrderId = safeString(lastOrder.order_id).trim();
    if (!lastOrderId) {
      return { orderId: "", resolvedProvider: normalizedProvider };
    }

    setFieldValue(orderStatusForm, "order_id", lastOrderId);
    return {
      orderId: lastOrderId,
      resolvedProvider: normalizeProvider(firstNonEmpty(normalizedProvider, lastOrder.provider)),
    };
  }

  function initializeAutoOrderStatusCheck() {
    const autoOrder = resolveAutoOrderForStatusCheck();
    if (!autoOrder || !autoOrder.email || !autoOrder.order_id) {
      return;
    }

    if (wasAutoCheckedThisSession(autoOrder.order_id)) {
      return;
    }

    markAutoCheckedThisSession(autoOrder.order_id);
    persistLastOrder(autoOrder);
    syncStatusFormFromLastOrder();

    executeOrderStatusLookup({
      email: autoOrder.email,
      orderId: autoOrder.order_id,
      provider: autoOrder.provider,
      autoTriggered: true,
    });
  }

  function resolveAutoOrderForStatusCheck() {
    const queryOrder = readOrderFromQuery();
    const pendingOrder = readPendingReturn();
    const lastOrder = readLastOrder();

    if (!queryOrder && !pendingOrder) {
      return null;
    }

    const orderId = firstNonEmpty(
      queryOrder ? queryOrder.order_id : "",
      pendingOrder ? pendingOrder.order_id : ""
    );
    if (!orderId) {
      return null;
    }

    const email = firstNonEmpty(
      queryOrder ? queryOrder.email : "",
      pendingOrder ? pendingOrder.email : "",
      lastOrder && lastOrder.order_id === orderId ? lastOrder.email : ""
    );
    if (!isValidEmail(email)) {
      return null;
    }

    const provider = normalizeProvider(
      firstNonEmpty(
        queryOrder ? queryOrder.provider : "",
        pendingOrder ? pendingOrder.provider : "",
        lastOrder ? lastOrder.provider : ""
      )
    );

    return {
      email,
      provider,
      order_id: orderId,
    };
  }

  function readOrderFromQuery() {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const hasReturnHint =
      params.has("order_id") ||
      params.has("orderId") ||
      params.has("checkout") ||
      params.has("payment") ||
      params.has("status");

    if (!hasReturnHint) {
      return null;
    }

    return {
      email: safeString(params.get("email")).trim(),
      provider: normalizeProvider(safeString(params.get("provider"))),
      order_id: firstNonEmpty(params.get("order_id"), params.get("orderId")),
    };
  }

  function bindCopyLicenseButton() {
    if (!copyLicenseButton) {
      return;
    }

    copyLicenseButton.addEventListener("click", async () => {
      if (!currentLicenseKey) {
        setCopyStatus("License key is empty.", true);
        return;
      }

      const copied = await copyToClipboard(currentLicenseKey);
      if (!copied) {
        setCopyStatus("Copy failed. Select and copy key manually.", true);
        return;
      }

      setCopyStatus("License key copied.", false);
    });
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
    currentLicenseKey = licenseKey;
    orderLicense.textContent = `License key: ${licenseKey}`;
    hideNode(orderLicenseRow, false);
  }

  function clearLicenseOutput() {
    currentLicenseKey = "";
    if (orderLicense) {
      orderLicense.textContent = "";
    }
    hideNode(orderLicenseRow, true);
    setCopyStatus("", false);
  }

  function setCopyStatus(text, isError) {
    if (!copyStatus) {
      return;
    }
    copyStatus.textContent = text;
    copyStatus.classList.remove("status-ok", "status-error");
    if (text) {
      copyStatus.classList.add(isError ? "status-error" : "status-ok");
    }
  }

  async function copyToClipboard(text) {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_error) {
        // fall through to legacy copy path.
      }
    }

    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "absolute";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const success = document.execCommand("copy");
      document.body.removeChild(area);
      return !!success;
    } catch (_error) {
      return false;
    }
  }

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

  function firstNonEmpty(...values) {
    for (const value of values) {
      const trimmed = safeString(value).trim();
      if (trimmed) {
        return trimmed;
      }
    }
    return "";
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

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_error) {
      // Ignore storage failures.
    }
  }

  function readSessionStorage(key) {
    try {
      return window.sessionStorage.getItem(key) || "";
    } catch (_error) {
      return "";
    }
  }

  function writeSessionStorage(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (_error) {
      // Ignore session storage failures.
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

  function readPendingReturn() {
    const raw = readStorage(PENDING_RETURN_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      const createdAt = Number(parsed.created_at_ms || 0);
      if (!Number.isFinite(createdAt) || createdAt <= 0) {
        return null;
      }

      const maxAgeMs = 24 * 60 * 60 * 1000;
      if (Date.now() - createdAt > maxAgeMs) {
        removeStorage(PENDING_RETURN_STORAGE_KEY);
        return null;
      }

      return {
        email: safeString(parsed.email).trim(),
        provider: normalizeProvider(parsed.provider),
        order_id: safeString(parsed.order_id).trim(),
      };
    } catch (_error) {
      return null;
    }
  }

  function persistPendingReturn(order) {
    writeStorage(
      PENDING_RETURN_STORAGE_KEY,
      JSON.stringify({
        email: safeString(order.email).trim(),
        provider: normalizeProvider(order.provider),
        order_id: safeString(order.order_id).trim(),
        created_at_ms: Date.now(),
      })
    );
  }

  function clearPendingReturn() {
    removeStorage(PENDING_RETURN_STORAGE_KEY);
  }

  function wasAutoCheckedThisSession(orderId) {
    return readSessionStorage(AUTO_CHECK_SESSION_KEY) === orderId;
  }

  function markAutoCheckedThisSession(orderId) {
    writeSessionStorage(AUTO_CHECK_SESSION_KEY, orderId);
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
