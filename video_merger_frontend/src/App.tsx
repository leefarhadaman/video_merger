import React, { useState, useCallback, useEffect, FormEvent } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------
   1. POINT AXIOS AT YOUR BACKEND
   ------------------------------------------------------------------ */
// If your React dev server (Vite/CRA) runs on :5173 and the Node
// backend on :4000, requests to "/merge" will 404 or hit CORS errors.
// EITHER: (recommended) create a Vite proxy, OR set a baseURL here:
axios.defaults.baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

interface VideoFile {
  file: File;
  preview: string;
  duration: number;
  thumbnail: string;
}

interface MusicFile {
  file: File;
  preview: string;
  duration: number;
}

function App() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [music, setMusic] = useState<MusicFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Cleanup function for object URLs
  useEffect(() => {
    return () => {
      videos.forEach(video => {
        URL.revokeObjectURL(video.preview);
        URL.revokeObjectURL(video.thumbnail);
      });
      if (music) {
        URL.revokeObjectURL(music.preview);
      }
    };
  }, [videos, music]);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadeddata = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg");
        window.URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError("");
    const videoFiles = acceptedFiles.filter(file => file.type.startsWith("video/"));
    const audioFiles = acceptedFiles.filter(file => file.type.startsWith("audio/"));

    if (videoFiles.length > 0) {
      const newVideos = await Promise.all(
        videoFiles.map(async (file) => {
          const duration = await getVideoDuration(file);
          const thumbnail = await generateThumbnail(file);
          return {
            file,
            preview: URL.createObjectURL(file),
            duration,
            thumbnail
          };
        })
      );
      setVideos(prev => [...prev, ...newVideos]);
      setTotalDuration(prev => prev + newVideos.reduce((sum, v) => sum + v.duration, 0));
    }

    if (audioFiles.length > 0) {
      const audioFile = audioFiles[0];
      const duration = await getVideoDuration(audioFile);
      setMusic({
        file: audioFile,
        preview: URL.createObjectURL(audioFile),
        duration
      });
    }
  }, []);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps } = useDropzone({
    onDrop,
    accept: {
      "video/*": []
    }
  });

  const { getRootProps: getMusicRootProps, getInputProps: getMusicInputProps } = useDropzone({
    onDrop,
    accept: {
      "audio/*": []
    }
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("🚀 Starting merge process...");
    console.log("📊 Current state:", {
      videoCount: videos.length,
      hasMusic: !!music,
      totalDuration
    });

    if (videos.length === 0 || !music) {
      setError("Please select at least one video and one music file");
      return;
    }

    setIsLoading(true);
    setError("");
    setProgress(0);

    const formData = new FormData();
    videos.forEach((file, index) => {
      console.log(`📁 Adding video ${index + 1}:`, {
        name: file.file.name,
        size: file.file.size,
        type: file.file.type
      });
      formData.append("videos", file.file);
    });
    
    console.log("🎵 Adding music file:", {
      name: music.file.name,
      size: music.file.size,
      type: music.file.type
    });
    formData.append("music", music.file);

    try {
      console.log("📤 Sending request to server...");
      const response = await axios.post("http://localhost:4000/merge", formData, {
        responseType: "blob",
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📈 Upload progress: ${percentCompleted}%`);
            setProgress(percentCompleted);
          }
        },
      });

      console.log("📥 Received response from server:", {
        status: response.status,
        type: response.data.type,
        size: response.data.size
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "merged.mp4");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log("✅ Merge completed successfully!");

      // Reset form
      setVideos([]);
      setMusic(null);
      setTotalDuration(0);
    } catch (err: any) {
      console.error("❌ Merge error:", err);
      let errorMessage = "Merge failed – please try again or check your file formats.";
      
      if (err.response) {
        console.log("📥 Received error response:", {
          status: err.response.status,
          statusText: err.response.statusText
        });
        try {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              console.log("📄 Error details:", errorData);
              setError(errorData.error || errorMessage);
            } catch (e) {
              console.error("❌ Failed to parse error response:", e);
              setError(errorMessage);
            }
          };
          reader.readAsText(err.response.data);
        } catch (e) {
          console.error("❌ Failed to read error response:", e);
          setError(errorMessage);
        }
      } else if (err.request) {
        console.error("❌ No response received from server");
        setError("No response from server. Please check if the server is running.");
      } else {
        console.error("❌ Request error:", err.message);
        setError(err.message || errorMessage);
      }
    } finally {
      setIsLoading(false);
      console.log("🏁 Merge process completed");
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Video Merger</h1>
              <p className="text-gray-600 mt-1">Merge multiple videos with background music</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Developed by{" "}
                <a
                  href="https://devfaru.netlify.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Farhad Ali
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Video Upload */}
          <div className="col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Videos</h2>
                {totalDuration > 0 && (
                  <span className="text-sm text-gray-600">
                    Total Duration: {formatDuration(totalDuration)}
                  </span>
                )}
              </div>

              <div
                {...getVideoRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
              >
                <input {...getVideoInputProps()} />
                <div className="text-gray-600">
                  <p className="text-lg mb-2">Drop video files here</p>
                  <p className="text-sm">or click to select files</p>
                </div>
              </div>

              {videos.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {videos.map((video, index) => (
                    <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                      <img
                        src={video.thumbnail}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-32 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{video.file.name}</p>
                        <p className="text-xs text-gray-500">{formatDuration(video.duration)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Music Upload and Controls */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Background Music</h2>
              
              <div
                {...getMusicRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
              >
                <input {...getMusicInputProps()} />
                <div className="text-gray-600">
                  <p className="text-lg mb-2">Drop music file here</p>
                  <p className="text-sm">or click to select file</p>
                </div>
              </div>

              {music && (
                <div className="mt-6">
                  <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{music.file.name}</p>
                      <p className="text-xs text-gray-500">{formatDuration(music.duration)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || videos.length === 0 || !music}
                  className={`w-full px-6 py-3 rounded-lg font-semibold text-lg transition-all ${
                    isLoading || videos.length === 0 || !music
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing... {progress}%</span>
                    </div>
                  ) : (
                    "Merge Videos"
                  )}
                </button>

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-red-600 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
