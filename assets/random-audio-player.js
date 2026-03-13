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

  const tracks = [
    "assets/audio/3435345.mp3",
    "assets/audio/6876786.mp3",
    "assets/audio/7987987987.mp3",
    "assets/audio/87667565.mp3",
    "assets/audio/876876876.mp3",
    "assets/audio/898989898.mp3",
    "assets/audio/untitled-masterpiece-pattern-01.mp3",
    "assets/audio/untitled-masterpiece-pattern-02.mp3",
    "assets/audio/untitled-masterpiece-pattern-03.mp3",
    "assets/audio/123231231.mp3",
  ];

  let queue = [];
  let currentTrackIndex = -1;

  function setStatus(text) {
    status.textContent = text;
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
    const index = nextTrackIndex();
    await playTrack(index);
  }

  function stopPlayback() {
    audio.pause();
    audio.currentTime = 0;
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
})();
