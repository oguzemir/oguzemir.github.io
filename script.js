const items = document.querySelectorAll('.gallery-item');
const lightbox = document.getElementById('lightbox');
const lightboxVideo = document.getElementById('lightbox-video');
const closeBtn = document.querySelector('.lightbox-close');
items.forEach(item => {
  item.addEventListener('click', () => {
    const videoId = item.getAttribute('data-video');
    lightbox.classList.add('active');
    lightboxVideo.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  });
});
closeBtn.addEventListener('click', () => {
  lightbox.classList.remove('active');
  lightboxVideo.src = "";
});
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove('active');
    lightboxVideo.src = "";
  }
});