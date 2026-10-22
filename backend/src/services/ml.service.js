const axios = require("axios");

const mlClient = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",

  timeout: 120000,

  headers: {
    "Content-Type": "application/json",
  },
});

const checkHealth = async () => {
  const response = await mlClient.get("/health");

  return response.data;
};

const analyzeRfm = async ({ referenceDate, transactions }) => {
  const response = await mlClient.post("/analyze-rfm", {
    reference_date: referenceDate,

    transactions,
  });

  return response.data;
};

module.exports = {
  checkHealth,
  analyzeRfm,
};
