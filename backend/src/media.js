import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";

// Ensure required directories exist
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "outputs");
const TEMP_DIR = path.join(process.cwd(), "temp");

async function ensureDirectories() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

/**
 * Get video metadata
 * @param {string} filePath
 * @returns {Promise<Object>}
 */
async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });
}

/**
 * Validate video files
 * @param {string[]} videoPaths
 */
async function validateVideos(files) {
  console.log("🔍 Validating video files...");
  for (const file of files) {
    console.log(`📼 Validating video: ${file.originalname}`);
    try {
      const metadata = await getVideoMetadata(file.path);
      console.log("📊 Video metadata:", {
        duration: metadata.format.duration,
        size: metadata.format.size,
        format: metadata.format.format_name,
        streams: metadata.streams.map(s => ({
          type: s.codec_type,
          codec: s.codec_name,
          width: s.width,
          height: s.height
        }))
      });

      const videoStream = metadata.streams.find(s => s.codec_type === "video");
      if (!videoStream) {
        console.error("❌ No video stream found in file:", file.originalname);
        throw new Error(`No video stream found in ${file.originalname}`);
      }

      const supportedCodecs = ["h264", "hevc", "vp8", "vp9"];
      if (!supportedCodecs.includes(videoStream.codec_name)) {
        console.error("❌ Unsupported video codec:", videoStream.codec_name);
        throw new Error(`Unsupported video codec in ${file.originalname}. Supported codecs: ${supportedCodecs.join(", ")}`);
      }

      if (videoStream.width > 3840 || videoStream.height > 2160) {
        console.error("❌ Video resolution too high:", `${videoStream.width}x${videoStream.height}`);
        throw new Error(`Video resolution too high in ${file.originalname}. Maximum supported: 4K (3840x2160)`);
      }
    } catch (err) {
      console.error("❌ Video validation error:", err);
      throw err;
    }
  }
  console.log("✅ Video validation completed");
}

/**
 * Validate audio file
 * @param {string} musicPath
 */
async function validateMusic(file) {
  console.log("🔍 Validating music file...");
  try {
    const metadata = await getVideoMetadata(file.path);
    console.log("📊 Music metadata:", {
      duration: metadata.format.duration,
      size: metadata.format.size,
      format: metadata.format.format_name,
      streams: metadata.streams.map(s => ({
        type: s.codec_type,
        codec: s.codec_name
      }))
    });

    const audioStream = metadata.streams.find(s => s.codec_type === "audio");
    if (!audioStream) {
      console.error("❌ No audio stream found in file:", file.originalname);
      throw new Error(`No audio stream found in ${file.originalname}`);
    }

    const supportedCodecs = ["aac", "mp3", "opus", "vorbis"];
    if (!supportedCodecs.includes(audioStream.codec_name)) {
      console.error("❌ Unsupported audio codec:", audioStream.codec_name);
      throw new Error(`Unsupported audio codec in ${file.originalname}. Supported codecs: ${supportedCodecs.join(", ")}`);
    }
  } catch (err) {
    console.error("❌ Music validation error:", err);
    throw err;
  }
  console.log("✅ Music validation completed");
}

// Process video to ensure consistent format
async function processVideo(inputPath, outputPath) {
  console.log(`Processing video: ${inputPath} -> ${outputPath}`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",
        "-preset medium",
        "-crf 23",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-r 30",
        "-vsync cfr",
        "-async 1"
      ])
      .output(outputPath)
      .on("progress", (progress) => {
        console.log("Processing:", progress.percent, "% done");
      })
      .on("end", () => {
        console.log("Processing finished successfully");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error during processing:", err);
        reject(err);
      })
      .run();
  });
}

// Merge videos with music
export async function mergeVideosWithMusic(videoFiles, musicFile) {
  try {
    await ensureDirectories();
    console.log("Starting video merge process...");

    // Validate files
    console.log("Validating videos...");
    await validateVideos(videoFiles);
    console.log("Validating music...");
    await validateMusic(musicFile);

    // Process each video to ensure consistent format
    console.log("Processing videos...");
    const processedVideos = [];
    for (let i = 0; i < videoFiles.length; i++) {
      const video = videoFiles[i];
      const processedPath = path.join(TEMP_DIR, `processed_${i}.mp4`);
      console.log(`Processing video ${i + 1}/${videoFiles.length}: ${video.originalname}`);
      await processVideo(video.path, processedPath);
      processedVideos.push(processedPath);
    }

    // Create a file list for concatenation
    const listPath = path.join(TEMP_DIR, "filelist.txt");
    const fileList = processedVideos.map(file => `file '${file}'`).join("\n");
    await fs.writeFile(listPath, fileList);

    // Concatenate videos
    console.log("Concatenating videos...");
    const concatenatedPath = path.join(TEMP_DIR, "concatenated.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-pix_fmt yuv420p",
          "-r 30",
          "-vsync cfr",
          "-async 1",
          "-movflags +faststart"
        ])
        .output(concatenatedPath)
        .on("progress", (progress) => {
          console.log("Concatenating:", progress.percent, "% done");
        })
        .on("end", () => {
          console.log("Concatenation finished successfully");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during concatenation:", err);
          reject(err);
        })
        .run();
    });

    // Add music to the concatenated video
    console.log("Adding music...");
    const outputPath = path.join(OUTPUT_DIR, "merged.mp4");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatenatedPath)
        .input(musicFile.path)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-b:a 192k",
          "-shortest",
          "-map 0:v:0",
          "-map 1:a:0",
          "-movflags +faststart"
        ])
        .output(outputPath)
        .on("progress", (progress) => {
          console.log("Adding music:", progress.percent, "% done");
        })
        .on("end", () => {
          console.log("Music added successfully");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error adding music:", err);
          reject(err);
        })
        .run();
    });

    // Cleanup temporary files
    console.log("Cleaning up temporary files...");
    await Promise.all([
      ...processedVideos.map(file => fs.unlink(file).catch(err => console.error(`Failed to delete ${file}:`, err))),
      fs.unlink(listPath).catch(err => console.error(`Failed to delete ${listPath}:`, err)),
      fs.unlink(concatenatedPath).catch(err => console.error(`Failed to delete ${concatenatedPath}:`, err))
    ]);

    console.log("Merge completed successfully!");
    return outputPath;
  } catch (error) {
    console.error("Error in mergeVideosWithMusic:", error);
    throw new Error(`Video merge failed: ${error.message}`);
  }
}
