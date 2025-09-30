// Normal linki (YouTube/Vimeo) embed URL'ye çevirir
function getEmbedUrl(url) {
  // --- YouTube ---
  if (url.includes("youtube.com/watch?v=") || url.includes("youtu.be")) {
    let videoId = "";
    if (url.includes("watch?v=")) {
      videoId = url.split("watch?v=")[1].split("&")[0];
    } else if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1].split("?")[0];
    }
    // Autoplay + loop + mute; grid’de UI kapalı
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0`;
  }

  // --- Vimeo ---
  if (url.includes("vimeo.com")) {
    const videoId = url.split("vimeo.com/")[1].split("?")[0];
    // Autoplay YOK; loop açık; sessiz başlasın (kullanıcı play'e basacak)
    return `https://player.vimeo.com/video/${videoId}?loop=1&muted=1&title=0&byline=0&portrait=0`;
  }

  return "";
}

// .video div'lerini iframe'e dönüştür
document.querySelectorAll(".video").forEach(div => {
  const link = div.getAttribute("data-link") || "";
  const embedUrl = getEmbedUrl(link);
  if (!embedUrl) return;

  div.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
});

// Lightbox
const items = document.querySelectorAll('.gallery-item');
const lightbox = document.getElementById('lightbox');
const lightboxVideo = document.getElementById('lightbox-video');
const closeBtn = document.querySelector('.lightbox-close');

items.forEach(item => {
  item.addEventListener('click', () => {
    const link = item.getAttribute('data-link');
    if (!link) return;
    // Lightbox'ta kontroller açık oynatalım
    let url = getEmbedUrl(link);
    url = url.replace("controls=0", "controls=1"); // YT için
    lightbox.classList.add('active');
    lightboxVideo.src = url;
  });
});

function closeLightbox() {
  lightbox.classList.remove('active');
  lightboxVideo.src = "";
}

closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
