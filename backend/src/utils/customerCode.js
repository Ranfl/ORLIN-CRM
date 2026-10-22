const generateCustomerCode = () => {
  const timestamp = Date.now().toString().slice(-8);

  const random = Math.floor(1000 + Math.random() * 9000);

  return `CUS${timestamp}${random}`;
};

module.exports = generateCustomerCode;
