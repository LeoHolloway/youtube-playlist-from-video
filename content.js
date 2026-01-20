// Wait for YouTube player to be ready
function waitForPlayer() {
  return new Promise((resolve) => {
    const checkPlayer = setInterval(() => {
      const player = document.getElementById('movie_player');
      if (player && typeof player.seekTo === 'function') {
        clearInterval(checkPlayer);
        resolve(player);
      }
    }, 500);
  });
}

// Get current video ID from URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Load songs data
async function loadSongs() {
  try {
    // First try to load from chrome.storage (user's custom data)
    const result = await chrome.storage.local.get(['songsData']);
    if (result.songsData) {
      return result.songsData;
    }
    
    // Fallback to default songs.json
    const response = await fetch(chrome.runtime.getURL('songs.json'));
    return await response.json();
  } catch (error) {
    console.error('Error loading songs:', error);
    return {};
  }
}

// Main shuffle class
class YouTubeSongShuffler {
  constructor(player) {
    this.player = player;
    this.currentSongs = [];
    this.currentIndex = -1;
    this.videoId = getVideoId();
    this.isShuffling = false;
    
    this.init();
  }
  
  async init() {
    const songsData = await loadSongs();
    
    // Get songs for current video
    if (songsData[this.videoId]) {
      this.currentSongs = songsData[this.videoId].songs || [];
    }
    
    this.injectUI();
    this.attachListeners();
  }
  
  injectUI() {
    // Create shuffle control panel
    const shufflePanel = document.createElement('div');
    shufflePanel.id = 'yt-shuffle-panel';
    shufflePanel.innerHTML = `
      <div class="shuffle-header">
        <span class="shuffle-title">🎵 Song Shuffler</span>
        <button id="shuffle-toggle" class="shuffle-btn">▼</button>
      </div>
      <div class="shuffle-content" style="display: none;">
        <div class="shuffle-info">
          <span id="song-count">${this.currentSongs.length} songs loaded</span>
          <span id="current-song">No song playing</span>
        </div>
        <div class="shuffle-controls">
          <button id="shuffle-play" class="control-btn">🔀 Shuffle</button>
          <button id="next-song" class="control-btn">⏭ Next</button>
          <button id="prev-song" class="control-btn">⏮ Previous</button>
        </div>
        <div class="shuffle-playlist">
          <div id="song-list"></div>
        </div>
      </div>
    `;
    
    // Insert after YouTube's player controls
    const playerContainer = document.querySelector('#movie_player');
    if (playerContainer) {
      playerContainer.parentNode.insertBefore(shufflePanel, playerContainer.nextSibling);
    }
    
    this.updateSongList();
  }
  
  attachListeners() {
    // Toggle panel
    document.getElementById('shuffle-toggle')?.addEventListener('click', () => {
      const content = document.querySelector('.shuffle-content');
      const toggle = document.getElementById('shuffle-toggle');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
      } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
      }
    });
    
    // Shuffle button
    document.getElementById('shuffle-play')?.addEventListener('click', () => {
      this.shuffleAndPlay();
    });
    
    // Next button
    document.getElementById('next-song')?.addEventListener('click', () => {
      this.playNext();
    });
    
    // Previous button
    document.getElementById('prev-song')?.addEventListener('click', () => {
      this.playPrevious();
    });
    
    // Listen for video end to auto-play next song
    setInterval(() => {
      if (this.isShuffling && this.player) {
        const currentTime = this.player.getCurrentTime();
        const currentSong = this.currentSongs[this.currentIndex];
        
        if (currentSong && currentTime >= currentSong.endTime) {
          this.playNext();
        }
      }
    }, 1000);
  }
  
  shuffleAndPlay() {
    if (this.currentSongs.length === 0) {
      alert('No songs loaded for this video!');
      return;
    }
    
    this.isShuffling = true;
    this.currentIndex = Math.floor(Math.random() * this.currentSongs.length);
    this.playSong(this.currentIndex);
  }
  
  playNext() {
    if (this.currentSongs.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.currentSongs.length;
    this.playSong(this.currentIndex);
  }
  
  playPrevious() {
    if (this.currentSongs.length === 0) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.currentSongs.length) % this.currentSongs.length;
    this.playSong(this.currentIndex);
  }
  
  playSong(index) {
    const song = this.currentSongs[index];
    if (!song) return;
    
    this.player.seekTo(song.startTime, true);
    this.player.playVideo();
    
    // Update UI
    const currentSongEl = document.getElementById('current-song');
    if (currentSongEl) {
      currentSongEl.textContent = `Now playing: ${song.title}`;
    }
    
    this.updateSongList();
  }
  
  updateSongList() {
    const listEl = document.getElementById('song-list');
    if (!listEl) return;
    
    listEl.innerHTML = this.currentSongs.map((song, index) => `
      <div class="song-item ${index === this.currentIndex ? 'active' : ''}" data-index="${index}">
        <span class="song-title">${song.title}</span>
        <span class="song-time">${this.formatTime(song.startTime)} - ${this.formatTime(song.endTime)}</span>
      </div>
    `).join('');
    
    // Add click listeners to song items
    listEl.querySelectorAll('.song-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.currentIndex = index;
        this.playSong(index);
      });
    });
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize when page loads
(async () => {
  const player = await waitForPlayer();
  new YouTubeSongShuffler(player);
  
  // Re-initialize on navigation (YouTube is a SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      // Remove old panel
      document.getElementById('yt-shuffle-panel')?.remove();
      // Reinitialize
      setTimeout(async () => {
        const player = await waitForPlayer();
        new YouTubeSongShuffler(player);
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
})();
