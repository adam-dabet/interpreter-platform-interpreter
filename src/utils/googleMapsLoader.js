/**
 * Centralized Google Maps API Loader
 * Prevents multiple loading of the Google Maps API across the application
 */

class GoogleMapsLoader {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.callbacks = [];
  }

  /**
   * Load Google Maps API with specified libraries
   * @param {string[]} libraries - Array of library names to load
   * @returns {Promise} - Promise that resolves when Google Maps is loaded
   */
  async load(libraries = ['places']) {
    // If already loaded, return immediately
    if (this.isLoaded && window.google && window.google.maps) {
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      return this.waitForExistingScript();
    }

    // Start loading
    this.isLoading = true;
    this.loadPromise = this.loadScript(libraries);
    
    return this.loadPromise;
  }

  /**
   * Wait for an existing script to load
   */
  waitForExistingScript() {
    return new Promise((resolve, reject) => {
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          this.isLoaded = true;
          this.isLoading = false;
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }

  /**
   * Load the Google Maps script
   */
  loadScript(libraries) {
    return new Promise((resolve, reject) => {
      const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        const error = new Error('Google Maps API key not configured');
        this.isLoading = false;
        reject(error);
        return;
      }

      const librariesParam = libraries.length > 0 ? `&libraries=${libraries.join(',')}` : '';
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

  /**
   * Check if Google Maps is loaded
   */
  isGoogleMapsLoaded() {
    return this.isLoaded && window.google && window.google.maps;
  }

  /**
   * Wait for Google Maps to be fully loaded with specific libraries
   */
  async waitForLibraries(libraries = []) {
    if (!this.isLoaded) {
      await this.load(libraries);
    }
    
    // Wait for specific libraries to be available
    return new Promise((resolve, reject) => {
      const checkLibraries = () => {
        if (window.google && window.google.maps) {
          // Check if all required libraries are available
          const allLibrariesAvailable = libraries.every(lib => {
            if (lib === 'places') return window.google.maps.places;
            if (lib === 'geometry') return window.google.maps.geometry;
            return true;
          });
          
          if (allLibrariesAvailable) {
            resolve();
          } else {
            setTimeout(checkLibraries, 100);
          }
        } else {
          setTimeout(checkLibraries, 100);
        }
      };
      checkLibraries();
    });
  }

  /**
   * Get Google Maps instance
   */
  getGoogleMaps() {
    if (this.isGoogleMapsLoaded()) {
      return window.google.maps;
    }
    return null;
  }
}

// Create a singleton instance
const googleMapsLoader = new GoogleMapsLoader();

export default googleMapsLoader;