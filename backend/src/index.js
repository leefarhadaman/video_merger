import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";
import { mergeVideosWithMusic } from "./media.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
const outputsDir = path.join(__dirname, "../outputs");

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(outputsDir, { recursive: true });
    console.log("✅ Directories created successfully");
  } catch (error) {
    console.error("❌ Error creating directories:", error);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit per file
  },
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Merge endpoint
app.post("/merge", upload.fields([
  { name: "videos", maxCount: 20 },
  { name: "music", maxCount: 1 }
]), async (req, res) => {
  console.log("📥 Received merge request");
  
  try {
    if (!req.files) {
      console.error("❌ No files uploaded");
      return res.status(400).json({ error: "No files uploaded" });
    }

    const videoFiles = req.files["videos"];
    const musicFile = req.files["music"]?.[0];

    if (!videoFiles || videoFiles.length === 0) {
      console.error("❌ No video files uploaded");
      return res.status(400).json({ error: "No video files uploaded" });
    }

    if (!musicFile) {
      console.error("❌ No music file uploaded");
      return res.status(400).json({ error: "No music file uploaded" });
    }

    console.log(`📊 Processing ${videoFiles.length} videos and 1 music file`);

    // Log file details
    videoFiles.forEach((file, index) => {
      console.log(`Video ${index + 1}:`, {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path
      });
    });

    console.log("Music file:", {
      name: musicFile.originalname,
      size: musicFile.size,
      mimetype: musicFile.mimetype,
      path: musicFile.path
    });

    // Merge videos with music
    console.log("🔄 Starting merge process...");
    const outputPath = await mergeVideosWithMusic(videoFiles, musicFile);
    console.log("✅ Merge completed successfully");

    // Send the merged file
    console.log("📤 Sending merged file to client");
    res.download(outputPath, "merged.mp4", (err) => {
      if (err) {
        console.error("❌ Error sending file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error sending merged file" });
        }
      }
      // Cleanup
      console.log("🧹 Cleaning up uploaded files");
      videoFiles.forEach(file => {
        fs.unlink(file.path).catch(err => console.error("Error deleting video:", err));
      });
      fs.unlink(musicFile.path).catch(err => console.error("Error deleting music:", err));
    });

  } catch (error) {
    console.error("❌ Merge error:", error);
    res.status(500).json({ 
      error: "Merge failed",
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    details: err.message 
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
