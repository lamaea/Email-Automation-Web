const APP_CONFIG = {
  emailApiUrl:
    localStorage.getItem("emailApiUrl") ||
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ? "http://127.0.0.1:8001"
      : ""),
};
