/**
 * Centralized Google Maps API Loader
 * Prevents multiple loading of the Google Maps API across the application
 * and ensures requested libraries (e.g. places) are available even when
 * Maps was first loaded without them.
 */

class GoogleMapsLoader {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }

  normalizeLibraries(libraries) {
    if (Array.isArray(libraries)) return libraries.filter(Boolean);
    if (libraries) return [libraries];
    return ['places'];
  }

  isLibraryAvailable(lib) {
    if (!window.google?.maps) return false;
    if (lib === 'places') return Boolean(window.google.maps.places);
    if (lib === 'geometry') return Boolean(window.google.maps.geometry);
    if (lib === 'drawing') return Boolean(window.google.maps.drawing);
    if (lib === 'visualization') return Boolean(window.google.maps.visualization);
    // Core features (e.g. directions) live on maps itself
    return true;
  }

  /**
   * Dynamically load any missing libraries after the Maps core script is ready.
   * Uses google.maps.importLibrary when available (required when Maps was
   * bootstrapped without the library in the script URL).
   */
  async ensureLibraries(libraries = []) {
    const librariesArray = this.normalizeLibraries(libraries);
    const missing = librariesArray.filter((lib) => !this.isLibraryAvailable(lib));
    if (missing.length === 0) return;

    if (window.google?.maps?.importLibrary) {
      await Promise.all(missing.map((lib) => window.google.maps.importLibrary(lib)));
      const stillMissing = missing.filter((lib) => !this.isLibraryAvailable(lib));
      if (stillMissing.length > 0) {
        throw new Error(`Failed to load Google Maps libraries: ${stillMissing.join(', ')}`);
      }
      return;
    }

    // Legacy fallback: poll briefly (only works if library was in the bootstrap URL)
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (librariesArray.every((lib) => this.isLibraryAvailable(lib))) {
          resolve();
          return;
        }
        if (Date.now() - started > 10000) {
          reject(new Error(`Timed out waiting for Google Maps libraries: ${missing.join(', ')}`));
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  /**
   * Load Google Maps API with specified libraries
   * @param {string[]} libraries - Array of library names to load
   * @returns {Promise} - Promise that resolves when Google Maps + libraries are ready
   */
  async load(libraries = ['places']) {
    const librariesArray = this.normalizeLibraries(libraries);

    // Already bootstrapped — still ensure requested libraries exist
    if (this.isLoaded && window.google && window.google.maps) {
      await this.ensureLibraries(librariesArray);
      return;
    }

    // Another load in flight — wait, then ensure our libraries
    if (this.isLoading && this.loadPromise) {
      await this.loadPromise;
      await this.ensureLibraries(librariesArray);
      return;
    }

    // Script already in DOM (e.g. from another page/component)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      await this.waitForExistingScript();
      await this.ensureLibraries(librariesArray);
      return;
    }

    this.isLoading = true;
    this.loadPromise = this.loadScript(librariesArray);

    try {
      await this.loadPromise;
      await this.ensureLibraries(librariesArray);
    } finally {
      this.loadPromise = null;
    }
  }

  waitForExistingScript() {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          this.isLoaded = true;
          this.isLoading = false;
          resolve();
          return;
        }
        if (Date.now() - started > 15000) {
          this.isLoading = false;
          reject(new Error('Timed out waiting for existing Google Maps script'));
          return;
        }
        setTimeout(checkLoaded, 100);
      };
      checkLoaded();
    });
  }

  loadScript(libraries) {
    return new Promise((resolve, reject) => {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        this.isLoading = false;
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      const librariesArray = this.normalizeLibraries(libraries);
      const librariesParam =
        librariesArray.length > 0 ? `&libraries=${librariesArray.join(',')}` : '';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${librariesParam}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        this.isLoading = false;
        resolve();
      };

      script.onerror = () => {
        this.isLoading = false;
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  isGoogleMapsLoaded() {
    return this.isLoaded && window.google && window.google.maps;
  }

  async waitForLibraries(libraries = []) {
    await this.load(libraries);
  }

  getGoogleMaps() {
    if (this.isGoogleMapsLoaded()) {
      return window.google.maps;
    }
    return null;
  }
}

const googleMapsLoader = new GoogleMapsLoader();

export default googleMapsLoader;
