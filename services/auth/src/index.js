const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || "nishlen_secret"; // Env fallback

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
          user: "admin",
          host: "localhost",
          database: "nishlen_db",
          password: "secret",
          port: 5432,
      };
const pool = new Pool(poolConfig);

// Local strategy для login по phone
passport.use(
    new LocalStrategy(async (username, password, done) => {
        try {
            const res = await pool.query(
                "SELECT * FROM auth.users WHERE phone = $1",
                [username]
            );
            const user = res.rows[0];
            if (
                !user ||
                !(await bcrypt.compare(password, user.password_hash))
            ) {
                return done(null, false, {
                    message: "Неверный телефон или пароль",
                });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Регистрация по phone
app.post("/api/auth/register", async (req, res) => {
    const { phone, password, full_name, role = "client" } = req.body;
    if (password.length < 6) {
        return res
            .status(400)
            .json({ error: "Пароль слишком короткий (мин. 6 символов)" });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
        await pool.query(
            "INSERT INTO auth.users (phone, password_hash, full_name, role) VALUES ($1, $2, $3, $4)",
            [phone, hash, full_name, role]
        );
        res.status(201).json({ message: "User created" });
    } catch (err) {
        if (err.code === "23505") {
            res.status(400).json({ error: "Телефон уже зарегистрирован" });
        } else {
            res.status(500).json({ error: "Server error" });
        }
    }
});

// Логин по phone
app.post(
    "/api/auth/login",
    passport.authenticate("local", { session: false }),
    (req, res) => {
        const user = req.user;
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET
        );
        res.json({
            token,
            user: {
                id: user.id,
                phone: user.phone,
                full_name: user.full_name,
                role: user.role,
            },
        });
    }
);

// JWT middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ error: "Access denied. No token provided." });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { userId, role }
        next();
    } catch (err) {
        res.status(403).json({ error: "Invalid token." });
    }
};

// Защищённый /me
app.get("/api/auth/me", authenticateJWT, async (req, res) => {
    try {
        const userRes = await pool.query(
            "SELECT id, phone, full_name, role, city FROM auth.users WHERE id = $1",
            [req.user.userId]
        );
        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(PORT, () => console.log(`Auth on ${PORT}`));
