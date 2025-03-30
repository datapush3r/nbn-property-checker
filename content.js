(function () {
    console.log("content.js loaded");
  
    // Utility: wait a bit
    function wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  
    // Try to extract address from JSON-LD <script> tag
    function getAddressFromStructuredData() {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const json = JSON.parse(script.textContent);
          const addr = json?.address;
          if (addr?.streetAddress) {
            return [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(" ");
          }
        } catch (e) { }
      }
      return null;
    }
  
    // Fallback: get visible address from known DOM selectors
    function getAddressElementAndText() {
      const url = window.location.href;
  
      // Realestate.com.au
      if (url.includes("realestate.com.au")) {
        let el =
          document.querySelector("h1.property-info-address") ||
          document.querySelector('[data-testid="property-address"]') ||
          document.querySelector("a.details-link.residential-card__details-link span");
        if (el && el.textContent.trim()) return { el, text: el.textContent.trim() };
      }
  
      // Domain.com.au
      if (url.includes("domain.com.au")) {
        let el =
          document.querySelector("h1") ||
          document.querySelector('[data-testid="address-wrapper"]');
        if (el && el.textContent.trim()) return { el, text: el.textContent.trim() };
      }
  
      return { el: null, text: null };
    }
  
    // Main address getter: structured first, fallback second
    function getSmartAddress() {
      const structured = getAddressFromStructuredData();
      if (structured) {
        console.log("Using structured address:", structured);
        return { el: null, text: structured };
      }
      const fallback = getAddressElementAndText();
      if (fallback.text) {
        console.log("Using fallback DOM address:", fallback.text);
      }
      return fallback;
    }
  
    // Insert a container next to or below the address
    function insertInfoContainer(addressElement) {
        const container = document.createElement("div");
        container.style.border = "1px solid #ccc";
        container.style.padding = "5px";
        container.style.marginTop = "10px";
        container.style.fontSize = "0.9em";
        container.textContent = "Loading NBN connection info...";
      
        const isRealestate = window.location.href.includes("realestate.com.au");
      
        if (isRealestate && window.location.href.includes("/property-")) {
          const featureSection = document.querySelector(".property-info__property-attributes");
          if (featureSection && featureSection.parentNode) {
            featureSection.parentNode.insertBefore(container, featureSection.nextSibling);
            console.log("Inserted container below Realestate feature section");
            return container;
          }
        }
      
        // Fallback
        if (addressElement) {
          container.style.display = "inline-block";
          container.style.marginLeft = "10px";
          container.style.verticalAlign = "middle";
          addressElement.parentNode.insertBefore(container, addressElement.nextSibling);
        } else {
          document.body.appendChild(container);
        }
      
        return container;
      }
  
    // Fetch NBN info and display
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
  
    async function init() {
      console.log("Initializing...");
      const { el: addressElement, text: address } = getSmartAddress();
      if (!address) {
        console.warn("No valid address found.");
        return;
      }
  
      const container = insertInfoContainer(addressElement);
      await fetchAndDisplayNBN(container, address);
    }
  
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();