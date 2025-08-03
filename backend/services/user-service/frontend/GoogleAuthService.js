// Google Authentication Service for Frontend
class GoogleAuthService {
  constructor() {
    this.googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    this.isInitialized = false;
  }

  // Initialize Google OAuth
  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Load Google OAuth script
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isInitialized = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error("Failed to load Google OAuth script"));
      };

      document.head.appendChild(script);
    });
  }

  // Initialize Google Sign-In button
  async initializeSignInButton(elementId, onSuccess, onError) {
    await this.initialize();

    if (typeof google === "undefined") {
      throw new Error("Google OAuth not loaded");
    }

    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: async (response) => {
        try {
          const result = await onSuccess(response.credential);
          return result;
        } catch (error) {
          onError(error);
        }
      },
    });

    google.accounts.id.renderButton(document.getElementById(elementId), {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
    });
  }

  // Sign in with Google
  async signIn() {
    await this.initialize();

    if (typeof google === "undefined") {
      throw new Error("Google OAuth not loaded");
    }

    return new Promise((resolve, reject) => {
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          reject(new Error("Google Sign-In prompt was not displayed"));
        }
      });

      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response) => {
          resolve(response.credential);
        },
      });
    });
  }

  // Sign out from Google
  signOut() {
    if (typeof google !== "undefined" && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
  }

  // Get user info from Google token
  async getUserInfo(token) {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get user info from Google");
      }

      return await response.json();
    } catch (error) {
      throw new Error("Failed to get user info from Google");
    }
  }
}

export default new GoogleAuthService();
