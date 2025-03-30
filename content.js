(function () {
  const PROCESSED_ATTR = "data-nbn-injected";

  function getAddressFromStructuredData() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const json = JSON.parse(script.textContent);
        const addr = json?.address;
        if (addr?.streetAddress) {
          return [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode]
            .filter(Boolean).join(" ");
        }
      } catch (_) {}
    }
    return null;
  }

  function cleanDomainMapAddress(el) {
    const line1 = el.querySelector('[data-testid="address-line1"]')?.textContent || "";
    const line2 = el.querySelector('[data-testid="address-line2"]')?.textContent || "";
    return `${line1.replace(/,|\s+/g, " ").trim()} ${line2.replace(/\s+/g, " ").trim()}`;
  }

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

      // Detail page fallback
      elements.push(...document.querySelectorAll("h1"));
    }

    return [...new Set(elements)];
  }

  function getAddressText(el) {
    if (window.location.href.includes("domain.com.au") &&
        el.querySelector('[data-testid="address-line1"]')) {
      return cleanDomainMapAddress(el);
    }

    return el.textContent.trim();
  }

  function insertInfoContainer(addressElement) {
    if (!addressElement || !addressElement.parentNode) return;

    const parent = addressElement.parentNode;

    // Prevent duplicates anywhere in the parent
    if (parent.querySelector(".nbn-info-box")) {
      return parent.querySelector(".nbn-info-box");
    }

    const container = document.createElement("div");
    container.classList.add("nbn-info-box");
    container.style.border = "1px solid #ccc";
    container.style.padding = "5px";
    container.style.margin = "5px";
    container.style.fontSize = "0.9em";
    container.textContent = "Loading NBN connection info...";

    const isRealestate = window.location.href.includes("realestate.com.au");

    if (isRealestate && window.location.href.includes("/property-")) {
      const featureSection = document.querySelector(".property-info__property-attributes");
      if (featureSection && !featureSection.nextSibling?.classList?.contains("nbn-info-box")) {
        featureSection.parentNode.insertBefore(container, featureSection.nextSibling);
        return container;
      }
    }

    container.style.display = "inline-block";
    container.style.marginLeft = "10px";
    container.style.verticalAlign = "middle";
    parent.insertBefore(container, addressElement.nextSibling);

    return container;
  }

  async function fetchAndDisplayNBN(container, address) {
    const query = encodeURIComponent(address);
    const lookupUrl = `https://places.nbnco.net.au/places/v1/autocomplete?query=${query}`;

    try {
      const res1 = await fetch(lookupUrl);
      if (!res1.ok) throw new Error("Autocomplete failed");
      const data1 = await res1.json();
      const locId = data1?.suggestions?.[0]?.id;
      if (!locId) throw new Error("No LOC ID found");

      const detailsUrl = `https://places.nbnco.net.au/places/v2/details/${locId}`;
      const res2 = await fetch(detailsUrl);
      if (!res2.ok) throw new Error("Details fetch failed");
      const data2 = await res2.json();

      const techType = data2?.addressDetail?.techType;
      const techChangeStatus = data2?.addressDetail?.techChangeStatus;

      if (!techType) {
        container.textContent = "NBN connection type not available.";
        return;
      }

      const tech = techType.toLowerCase();
      let color = "";
      if (["fttn", "fttb", "fixed wireless", "satellite", "fttc"].includes(tech)) {
        color = "red";
      } else if (tech === "hfc") {
        color = "#cc6600";
      } else if (tech === "fttp") {
        color = "green";
      }

      let html = `<span style="color: ${color}; font-weight: bold;">NBN Tech Type: ${techType}</span>`;
      if (techChangeStatus) {
        html += `<br><span style="color: green; font-weight: bold;">Tech Change Status: ${techChangeStatus}</span>`;
      }
      container.innerHTML = html;
    } catch (err) {
      console.error("Error fetching NBN info:", err);
      container.textContent = "Error fetching NBN connection info.";
    }
  }

  async function processAddressElement(el) {
    const address = getAddressText(el);
    if (!address) return;
    const container = insertInfoContainer(el);
    if (container) {
      await fetchAndDisplayNBN(container, address);
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
    const observer = new MutationObserver(() => processNewAddresses());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    console.log("NBN Property Checker initializing...");
    processNewAddresses();
    observeDynamicContent();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();