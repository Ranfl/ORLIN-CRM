require("dotenv").config();

const bcrypt = require("bcryptjs");

const sequelize = require("../src/config/database");

const User = require("../src/models/User");

const createOwner = async () => {
  try {
    await sequelize.authenticate();

    const username = "owner";

    const existingUser = await User.findOne({
      where: {
        username,
      },
    });

    if (existingUser) {
      console.log("Owner sudah tersedia.");

      process.exit(0);
    }

    const password = "Orlin123!";

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: "Owner ORLIN",

      username,

      email: null,

      passwordHash,

      role: "owner",

      isActive: true,
    });

    console.log("✅ Owner berhasil dibuat.");

    console.log(`Username : ${user.username}`);

    console.log(`Password : ${password}`);

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
};

createOwner();
