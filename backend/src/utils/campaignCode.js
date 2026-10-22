const generateCampaignCode = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const timestamp = Date.now().toString().slice(-7);

  return `CMP${year}${month}${timestamp}`;
};

module.exports = generateCampaignCode;
