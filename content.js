// Wait for YouTube player to be ready
function waitForPlayer() {
  console.log('Waiting for YouTube player...');
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 40; // 20 seconds max
    
    const checkPlayer = setInterval(() => {
      attempts++;
      const player = document.getElementById('movie_player');
      const video = document.querySelector('video');
      
      console.log(`Attempt ${attempts}: player=${!!player}, video=${!!video}, duration=${video?.duration}`);
      
      // Check if video element exists and has loaded metadata
      if (video && !isNaN(video.duration) && video.duration > 0) {
        console.log('Player ready (via video element)!');
        clearInterval(checkPlayer);
        resolve(player || video);
      } else if (player && typeof player.seekTo === 'function') {
        console.log('Player ready (via movie_player)!');
        clearInterval(checkPlayer);
        resolve(player);
      } else if (attempts >= maxAttempts) {
        console.warn('Player took too long to load, proceeding anyway...');
        clearInterval(checkPlayer);
        // Just resolve with whatever we have
        resolve(player || video || document.getElementById('movie_player'));
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
    // Load songs from songs.json in extension directory
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
    console.log('Initializing shuffler...');
    const songsData = await loadSongs();
    console.log('Songs data loaded:', songsData);
    console.log('Current video ID:', this.videoId);
    
    // Get songs for current video
    if (songsData[this.videoId]) {
      this.currentSongs = songsData[this.videoId].songs || [];
      console.log('Songs found for this video:', this.currentSongs.length);
    } else {
      console.log('No songs configured for video ID:', this.videoId);
    }
    
    this.injectUI();
    this.attachListeners();
  }
  
  injectUI() {
    console.log('Attempting to inject UI...');
    
    // Create shuffle control panel
    const shufflePanel = document.createElement('div');
    shufflePanel.id = 'yt-shuffle-panel';
    shufflePanel.innerHTML = `
      <div class="shuffle-header">
        <span class="shuffle-title"> Song Shuffler</span>
        <button id="shuffle-toggle" class="shuffle-btn">▼</button>
      </div>
      <div class="shuffle-content" style="display: none;">
        <div class="shuffle-info">
          <span id="song-count">${this.currentSongs.length} songs loaded</span>
          <span id="current-song">No song playing</span>
        </div>
        <div class="shuffle-controls">
          <button id="shuffle-play" class="control-btn"> Shuffle</button>
          <button id="prev-song" class="control-btn">⏮ Previous</button>
          <button id="next-song" class="control-btn">⏭ Next</button>
          
        </div>
        <div class="shuffle-playlist">
          <div id="song-list"></div>
        </div>
      </div>
    `;
    
    // Try different injection points
    const belowPlayer = document.querySelector('#below');
    const playerContainer = document.querySelector('#movie_player');
    
    console.log('Below player element:', belowPlayer);
    console.log('Player container found:', playerContainer);
    
    if (belowPlayer) {
      // Insert at the top of the #below section
      belowPlayer.insertBefore(shufflePanel, belowPlayer.firstChild);
      console.log('UI injected into #below successfully');
    } else if (playerContainer && playerContainer.parentNode) {
      playerContainer.parentNode.insertBefore(shufflePanel, playerContainer.nextSibling);
      console.log('UI injected after player successfully');
    } else {
      console.error('Could not find suitable location to inject UI');
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
    
    // Previous button
    document.getElementById('prev-song')?.addEventListener('click', () => {
      this.playPrevious();
    });

    // Next button
    document.getElementById('next-song')?.addEventListener('click', () => {
      this.playNext();
    });
    
    // Listen for video end to auto-play next song
    setInterval(() => {
      if (this.isShuffling) {
        let currentTime;
        
        // Try to get time from player API
        if (this.player && typeof this.player.getCurrentTime === 'function') {
          currentTime = this.player.getCurrentTime();
        } else {
          // Fallback to video element
          const video = document.querySelector('video');
          if (video) {
            currentTime = video.currentTime;
          }
        }
        
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
    
    if (!this.isShuffling) {
      this.currentIndex = (this.currentIndex + 1) % this.currentSongs.length;
      this.playSong(this.currentIndex);
    } else {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * this.currentSongs.length);
      } while (nextIndex === this.currentIndex && this.currentSongs.length > 1);    
      this.currentIndex = nextIndex;
      this.playSong(this.currentIndex);
    }
  }
  


  playPrevious() {
    if (this.currentSongs.length === 0) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.currentSongs.length) % this.currentSongs.length;
    this.playSong(this.currentIndex);
  }
  
  playSong(index) {
    const song = this.currentSongs[index];
    if (!song) return;
    
    console.log('Playing song:', song.title, 'at', song.startTime);
    
    // Try to use the YouTube player API first
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(song.startTime, true);
      if (typeof this.player.playVideo === 'function') {
        this.player.playVideo();
      }
    } else {
      // Fallback to direct video control
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = song.startTime;
        video.play();
      }
    }
    
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
        isShuffling = false; // Stop shuffling when user selects a song
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
  console.log('YouTube Song Shuffler: Script loaded');
  console.log('Current URL:', window.location.href);
  console.log('Video ID:', getVideoId());
  
  const player = await waitForPlayer();
  console.log('Player found:', player);
  
  new YouTubeSongShuffler(player);
  
  // Re-initialize on navigation (YouTube is a SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('Navigation detected, reinitializing...');
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