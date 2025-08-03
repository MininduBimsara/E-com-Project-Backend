import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { googleAuth, clearError } from "./GoogleAuthSlice";
import GoogleAuthService from "./GoogleAuthService";

const GoogleAuthComponent = ({
  onSuccess,
  onError,
  buttonText = "Sign in with Google",
}) => {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.googleAuth
  );
  const buttonRef = useRef(null);

  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        await GoogleAuthService.initializeSignInButton(
          "google-signin-button",
          handleGoogleSuccess,
          handleGoogleError
        );
      } catch (error) {
        console.error("Failed to initialize Google auth:", error);
        if (onError) onError(error);
      }
    };

    initializeGoogleAuth();
  }, []);

  const handleGoogleSuccess = async (credential) => {
    try {
      const result = await dispatch(googleAuth(credential)).unwrap();

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error("Google auth error:", error);
      if (onError) onError(error);
    }
  };

  const handleGoogleError = (error) => {
    console.error("Google auth error:", error);
    if (onError) onError(error);
  };

  const handleManualSignIn = async () => {
    try {
      const credential = await GoogleAuthService.signIn();
      await handleGoogleSuccess(credential);
    } catch (error) {
      console.error("Manual sign in error:", error);
      if (onError) onError(error);
    }
  };

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  return (
    <div className="google-auth-container">
      {/* Google Sign-In Button */}
      <div id="google-signin-button" ref={buttonRef}></div>

      {/* Manual Sign-In Button (fallback) */}
      <button
        onClick={handleManualSignIn}
        disabled={loading}
        className="google-manual-signin-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 20px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#fff",
          color: "#333",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        {loading ? (
          <span>Signing in...</span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {buttonText}
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div
          className="error-message"
          style={{ color: "red", marginTop: "10px" }}
        >
          {error}
        </div>
      )}

      {/* Success Message */}
      {isAuthenticated && (
        <div
          className="success-message"
          style={{ color: "green", marginTop: "10px" }}
        >
          Successfully signed in with Google!
        </div>
      )}
    </div>
  );
};

export default GoogleAuthComponent;
