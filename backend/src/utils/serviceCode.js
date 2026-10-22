const generateServiceCode = () => {
  const timestamp = Date.now().toString().slice(-7);

  const random = Math.floor(100 + Math.random() * 900);

  return `SRV${timestamp}${random}`;
};

module.exports = generateServiceCode;
