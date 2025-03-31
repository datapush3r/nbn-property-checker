(function () {
  const PROCESSED_ATTR = "data-nbn-injected";

  function getAddressElements() {
    const url = window.location.href;
    const elements = [];

    if (url.includes("realestate.com.au")) {
      elements.push(
        ...document.querySelectorAll("h1.property-info-address"),
        ...document.querySelectorAll('[data-testid="property-address"]'),
        ...document.querySelectorAll("a.details-link.residential-card__details-link span")
      );
    }

    if (url.includes("domain.com.au")) {
      const all = document.querySelectorAll('[data-testid="address-wrapper"]');
      all.forEach(el => {
        if (el.querySelector('[data-testid="address-line1"]') && el.querySelector('[data-testid="address-line2"]')) {
          elements.push(el);
        }
      });

      elements.push(...document.querySelectorAll("h1")); // fallback
    }

    return [...new Set(elements)];
  }

  function cleanDomainMapAddress(el) {
    const line1 = el.querySelector('[data-testid="address-line1"]')?.textContent || "";
    const line2 = el.querySelector('[data-testid="address-line2"]')?.textContent || "";
    return `${line1.replace(/,|\s+/g, " ").trim()} ${line2.replace(/\s+/g, " ").trim()}`;
  }

  function getAddressText(el) {
    if (window.location.href.includes("domain.com.au") &&
        el.querySelector('[data-testid="address-line1"]')) {
      return cleanDomainMapAddress(el);
    }

    return el.textContent.trim();
  }

  function insertInfoContainer(addressElement) {
    const parent = addressElement.parentNode;
    if (!parent || parent.querySelector(".nbn-info-box")) return;

    const container = document.createElement("div");
    container.className = "nbn-info-box";
    container.style.border = "1px solid #ccc";
    container.style.padding = "5px";
    container.style.margin = "5px";
    container.style.fontSize = "0.9em";
    container.style.display = "inline-block";
    container.style.marginLeft = "10px";
    container.style.verticalAlign = "middle";
    container.textContent = "Loading NBN connection info...";

    parent.insertBefore(container, addressElement.nextSibling);
    return container;
  }

  async function fetchAndDisplayNBN(container, address, markerRect = null) {
    const query = encodeURIComponent(address);
    const lookupUrl = `https://places.nbnco.net.au/places/v1/autocomplete?query=${query}`;

    try {
      const res1 = await fetch(lookupUrl);
      if (!res1.ok) throw new Error("Lookup failed");
      const data1 = await res1.json();
      const locId = data1?.suggestions?.[0]?.id;
      if (!locId) throw new Error("No LOC ID found");

      const res2 = await fetch(`https://places.nbnco.net.au/places/v2/details/${locId}`);
      if (!res2.ok) throw new Error("Details fetch failed");
      const data2 = await res2.json();

      const techType = data2?.addressDetail?.techType;
      const techChangeStatus = data2?.addressDetail?.techChangeStatus;

      const tech = techType?.toLowerCase() || "";
      let color = "";
      if (["fttn", "fttb", "fixed wireless", "satellite", "fttc"].includes(tech)) color = "red";
      else if (tech === "hfc") color = "#cc6600";
      else if (tech === "fttp") color = "green";

      let html = techType
        ? `<span style="color: ${color}; font-weight: bold;">🌐 NBN Tech Type: ${techType}</span>`
        : "";

      if (techChangeStatus) {
        html += `<br><span style="color: green; font-weight: bold;">🔍 Tech Change Status: ${techChangeStatus}</span>`;
      }

      container.innerHTML = html || "NBN information not available.";

      if (markerRect) {
        markerRect.setAttribute("fill", color);
      }
    } catch (e) {
      console.error("[NBN] Fetch error:", e);
      container.textContent = "Error fetching NBN connection info.";
    }
  }

  async function processAddressElement(el) {
    const address = getAddressText(el);
    if (!address) return;

    const container = insertInfoContainer(el);

    // Map marker coloring
    let markerRect = null;
    const svgMarker = el.closest('svg[data-testid="single-marker"]');
    if (svgMarker) {
      markerRect = svgMarker.querySelector('rect[data-testid="marker-body"]');
    }

    if (container) {
      await fetchAndDisplayNBN(container, address, markerRect);
    }
  }

  function processNewAddresses() {
    getAddressElements().forEach(el => {
      if (!el.hasAttribute(PROCESSED_ATTR)) {
        el.setAttribute(PROCESSED_ATTR, "true");
        processAddressElement(el);
      }
    });
  }

  function observeDynamicContent() {
    new MutationObserver(processNewAddresses).observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    console.log("🌐 NBN Property Checker initialized (tech only)");
    processNewAddresses();
    observeDynamicContent();
  }

  document.readyState === "loading"
    ? window.addEventListener("DOMContentLoaded", init)
    : init();
})();