import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Database Setup
const db = new Database("database.sqlite");
db.pragma("journal_mode = WAL");

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS dresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    sizes_json TEXT NOT NULL, -- JSON array of { range, price, bodyLong, pantLong }
    image_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

// Seed Admin User if not exists
const seedAdmin = () => {
  const username = process.env.ADMIN_USERNAME || "yukii22";
  const password = process.env.ADMIN_PASSWORD || "yuki@88";
  
  console.log(`Checking for admin user: ${username}`);
  const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
    console.log(`Admin user '${username}' seeded successfully.`);
  } else {
    console.log(`Admin user '${username}' already exists.`);
  }
};
seedAdmin();

// Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Multer Configuration for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// --- API ROUTES ---
const apiRouter = express.Router();

// Public: Get all dresses
apiRouter.get("/dresses", (req, res) => {
  try {
    const { category, search } = req.query;
    let query = "SELECT * FROM dresses";
    const params: any[] = [];
    const conditions = [];

    if (category && category !== "All") {
      conditions.push("category = ?");
      params.push(category);
    }
    if (search) {
      conditions.push("(name LIKE ? OR code LIKE ? OR category LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";
    const dresses = db.prepare(query).all(...params);
    res.json(dresses.map((d: any) => ({ ...d, sizes: JSON.parse(d.sizes_json) })));
  } catch (error: any) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Public: Get categories
apiRouter.get("/categories", (req, res) => {
  try {
    const categories = db.prepare("SELECT DISTINCT category FROM dresses").all();
    res.json(["All", ...categories.map((c: any) => c.category)]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Admin: Login
apiRouter.post("/admin/login", (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);
    
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (user) {
      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (isMatch) {
        console.log("Login successful");
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
        return res.json({ token });
      } else {
        console.log("Login failed: Password mismatch");
      }
    } else {
      console.log("Login failed: User not found");
    }
    
    res.status(401).json({ error: "Invalid username or password" });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Admin: Create Dress
apiRouter.post("/admin/dresses", authenticateToken, upload.single("image"), (req, res) => {
  try {
    const { code, name, category, note, sizes } = req.body;
    const imageUrl = `/uploads/${req.file?.filename}`;

    const info = db.prepare(`
      INSERT INTO dresses (code, name, category, note, sizes_json, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(code, name, category, note, sizes, imageUrl);

    res.json({ id: info.lastInsertRowid, imageUrl });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Update Dress
apiRouter.put("/admin/dresses/:id", authenticateToken, upload.single("image"), (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, category, note, sizes } = req.body;
    
    let query = "UPDATE dresses SET code = ?, name = ?, category = ?, note = ?, sizes_json = ?";
    const params = [code, name, category, note, sizes];

    if (req.file) {
      query += ", image_url = ?";
      params.push(`/uploads/${req.file.filename}`);
    }

    query += " WHERE id = ?";
    params.push(id);

    db.prepare(query).run(...params);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Admin: Delete Dress
apiRouter.delete("/admin/dresses/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const dress: any = db.prepare("SELECT image_url FROM dresses WHERE id = ?").get(id);
    
    if (dress) {
      const filePath = path.join(process.cwd(), dress.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      db.prepare("DELETE FROM dresses WHERE id = ?").run(id);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Dress not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mount API routes
app.use("/api", apiRouter);

// API 404 Handler - Prevents falling through to SPA middleware for missing API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: {
          usePolling: false,
          ignored: ['**']
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
