(() => {
  const root = document.querySelector("[data-audio-random-player]");
  if (!root) {
    return;
  }

  const audio = root.querySelector("[data-audio-element]");
  const status = root.querySelector("[data-audio-status]");
  const playButton = root.querySelector("[data-audio-action='play']");
  const nextButton = root.querySelector("[data-audio-action='next']");
  const stopButton = root.querySelector("[data-audio-action='stop']");

  if (!audio || !status || !playButton || !nextButton || !stopButton) {
    return;
  }

  const AUDIO_MANIFEST_PATH = "assets/audio-manifest.json";
  const tracks = [];

  let queue = [];
  let currentTrackIndex = -1;

  function setStatus(text) {
    status.textContent = text;
  }

  async function loadTracksFromManifest() {
    setStatus("Loading demos...");
    playButton.disabled = true;
    nextButton.disabled = true;
    stopButton.disabled = true;

    try {
      const response = await fetch(AUDIO_MANIFEST_PATH, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`manifest request failed: HTTP ${response.status}`);
      }

      const payload = await response.json();
      const manifestTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
      const normalized = manifestTracks
        .filter((track) => typeof track === "string")
        .map((track) => track.trim())
        .filter((track) => track.length > 0);

      if (normalized.length === 0) {
        throw new Error("manifest has no tracks");
      }

      tracks.splice(0, tracks.length, ...normalized);
      setStatus(`Ready: ${tracks.length} demos loaded`);
      playButton.disabled = false;
      nextButton.disabled = false;
    } catch (_error) {
      setStatus("No audio demos found. Rebuild audio manifest.");
    }
  }

  function shuffledTrackIndexes() {
    const indexes = tracks.map((_, index) => index);
    for (let i = indexes.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    if (indexes.length > 1 && currentTrackIndex >= 0 && indexes[indexes.length - 1] === currentTrackIndex) {
      [indexes[0], indexes[indexes.length - 1]] = [indexes[indexes.length - 1], indexes[0]];
    }
    return indexes;
  }

  function nextTrackIndex() {
    if (queue.length === 0) {
      queue = shuffledTrackIndexes();
    }
    return queue.pop();
  }

  async function playTrack(index) {
    currentTrackIndex = index;
    audio.src = tracks[index];
    setStatus("Now playing demo");
    try {
      await audio.play();
    } catch (_error) {
      setStatus("Playback was blocked by browser policy. Press play again.");
    }
  }

  async function playRandom() {
    if (tracks.length === 0) {
      setStatus("No audio demos available");
      return;
    }

    const index = nextTrackIndex();
    stopButton.disabled = false;
    await playTrack(index);
  }

  function stopPlayback() {
    audio.pause();
    audio.currentTime = 0;
    stopButton.disabled = true;
    setStatus("Playback stopped");
  }

  playButton.addEventListener("click", () => {
    void playRandom();
  });

  nextButton.addEventListener("click", () => {
    void playRandom();
  });

  stopButton.addEventListener("click", () => {
    stopPlayback();
  });

  audio.addEventListener("ended", () => {
    void playRandom();
  });

  audio.addEventListener("error", () => {
    setStatus("Playback error. Use next random.");
  });

  void loadTracksFromManifest();
})();
