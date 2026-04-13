<div align="center">
<img width="1200" height="475" alt="GUESS THE MUSIC Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GUESS THE MUSIC 🎵

A high-energy, social music guessing game where players compete to identify tracks from their favorite Spotify and Apple Music playlists at record speed.

## ✨ Features

- **Multiplayer Hub**: Create private rooms and invite friends using unique session codes.
- **Playlist Integration**: Search for any public Spotify playlist or paste a direct link from Apple Music.
- **Tactical Power-ups**:
  - **Reveal**: Get a hint about the current track.
  - **50/50**: Eliminate two incorrect choices in choice-based modes.
  - **Freeze**: Pause the timer globally for 5 seconds to give yourself a moment to think.
- **Dynamic Game Modes**: Choose between manual typing for a challenge or multiple-choice for faster rounds.
- **Real-time Scoring**: Time-decay scoring system with streak multipliers for accurate, fast guesses.
- **Linguistic Filtering**: Automatically analyze playlists to filter by language (Thai, Japanese, Korean, etc.).

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sippawith/guess-the-music.git
   cd guess-the-music
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   # Spotify API Credentials (Required for playlist features)
   SPOTIFY_CLIENT_ID=your_id_here
   SPOTIFY_CLIENT_SECRET=your_secret_here
   
   APP_URL=http://localhost:3000
   ```

4. **Run the application:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Motion.
- **Backend**: Express, Socket.io, Axios.
- **State Management**: Zustand.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
