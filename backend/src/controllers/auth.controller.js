const bcrypt = require("bcryptjs");

const User = require("../models/User");

const { generateToken } = require("../utils/jwt");

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username dan password wajib diisi",
      });
    }

    const user = await User.findOne({
      where: {
        username,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Akun tidak aktif",
      });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    const token = generateToken(user);

    const cookieName = process.env.AUTH_COOKIE_NAME || "orlin_token";

    res.cookie(cookieName, token, {
      httpOnly: true,

      secure: process.env.COOKIE_SECURE === "true",

      sameSite: "lax",

      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,

      message: "Login berhasil",

      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    success: true,

    data: {
      user: req.user,
    },
  });
};

const logout = async (req, res) => {
  const cookieName = process.env.AUTH_COOKIE_NAME || "orlin_token";

  res.clearCookie(cookieName, {
    httpOnly: true,

    secure: process.env.COOKIE_SECURE === "true",

    sameSite: "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logout berhasil",
  });
};

module.exports = {
  login,
  me,
  logout,
};
