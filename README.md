# YouTube Song Shuffler

A browser extension that lets you shuffle through songs in long YouTube videos.

## Setup

### Chrome/Edge
1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `youtube-shuffler` folder
5. Navigate to any YouTube video

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the `manifest.json` file
4. Navigate to any YouTube video

## Usage

### Adding Songs to a Video

Edit `songs.json` to add your video's songs:

```json
{
  "YOUR_VIDEO_ID": {
    "title": "Video Title",
    "songs": [
      {
        "title": "Song Name",
        "startTime": 0,
        "endTime": 180
      }
    ]
  }
}
```

**To find the video ID:** 
- URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Video ID: `dQw4w9WgXcQ` (everything after `v=`)

**To find timestamps:**
- Play the video and note when each song starts/ends
- Times are in seconds (so 1:30 = 90 seconds)

### Using the Shuffler

1. Navigate to a YouTube video that has songs configured
2. The shuffle panel will appear below the video player
3. Click the title to expand/collapse the panel
4. Click "🔀 Shuffle" to start shuffling
5. Use "⏭ Next" and "⏮ Previous" to navigate
6. Click any song in the list to jump directly to it

## Features

- Random shuffle through songs
- Auto-advance to next song when current song ends
- Click any song to play it immediately
- Persistent across page navigation
- Works with YouTube's player controls

## Next Steps

You can extend this by:
- Adding a popup UI to manage songs without editing JSON
- Importing/exporting song lists
- Sharing song data between users
- Auto-detecting song boundaries (advanced)
- Adding keyboard shortcuts
- Creating playlists across multiple videos

## Troubleshooting

**Panel doesn't appear:**
- Make sure the video ID is in `songs.json`
- Check the browser console for errors
- Refresh the page after loading the extension

**Songs don't play:**
- Verify timestamps are in seconds, not minutes
- Make sure endTime is greater than startTime
- Check that the player has loaded (wait a few seconds)
