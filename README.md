# 🎥 VideoMerger

A powerful web application that allows users to merge multiple videos with background music seamlessly. Built with modern web technologies and optimized for performance.

## ✨ Features

- **Multiple Video Upload**: Upload and merge up to 20 videos simultaneously
- **Background Music**: Add background music to your merged video
- **Real-time Progress**: Track the merging progress in real-time
- **High-Quality Output**: Maintains video quality while ensuring compatibility
- **Modern UI**: Clean, responsive interface with drag-and-drop support
- **Video Previews**: See thumbnails and durations before merging
- **Cross-Platform**: Works on all modern browsers

## 🛠️ Technology Stack

### Frontend
- **React**: Modern UI library for building interactive interfaces
- **TypeScript**: Type-safe JavaScript for better development experience
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Framer Motion**: Smooth animations and transitions
- **React Dropzone**: Drag-and-drop file upload functionality

### Backend
- **Node.js**: JavaScript runtime for server-side processing
- **Express**: Web framework for handling HTTP requests
- **FFmpeg**: Powerful video processing library
- **Multer**: File upload handling
- **CORS**: Cross-origin resource sharing support

## 🚀 Key Features Implementation

### Video Processing
- **FFmpeg Integration**: Uses FFmpeg for high-quality video processing
- **Codec Support**: Handles multiple video codecs (H.264, HEVC, VP8, VP9)
- **Resolution Handling**: Supports up to 4K resolution
- **Audio Processing**: AAC audio encoding with configurable bitrate

### File Management
- **Temporary Storage**: Efficient handling of temporary files
- **Automatic Cleanup**: Removes temporary files after processing
- **File Validation**: Checks for supported formats and codecs

### User Interface
- **Drag & Drop**: Intuitive file upload interface
- **Progress Tracking**: Real-time progress updates
- **Error Handling**: Clear error messages and validation
- **Responsive Design**: Works on all screen sizes

## 🏗️ Project Structure

```
VideoMerger/
├── backend/
│   ├── src/
│   │   ├── index.js      # Main server file
│   │   └── media.js      # Video processing logic
│   └── package.json
├── video_merger_frontend/
│   ├── src/
│   │   ├── App.tsx       # Main application component
│   │   └── components/   # React components
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- FFmpeg installed on your system

### Installation

1. Clone the repository:
```bash
git clone https://github.com/leefarhadaman/video_merger.git
cd video_merger
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../video_merger_frontend
npm install
```

4. Start the backend server:
```bash
cd ../backend
npm start
```

5. Start the frontend development server:
```bash
cd ../video_merger_frontend
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔧 Configuration

### Backend Configuration
- Port: 4000 (configurable in `backend/src/index.js`)
- File size limit: 100MB per file
- Maximum videos: 20
- Supported video codecs: H.264, HEVC, VP8, VP9
- Supported audio codecs: AAC, MP3, Opus, Vorbis

### Frontend Configuration
- Development server: Vite
- Port: 5173
- API endpoint: `http://localhost:4000`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Farhad Ali**
- Portfolio: [devfaru.netlify.app](https://devfaru.netlify.app)
- GitHub: [@leefarhadaman](https://github.com/leefarhadaman)

## 🙏 Acknowledgments

- FFmpeg team for the powerful video processing library
- React and Vite teams for the amazing frontend tools
- All contributors and users of this project 
