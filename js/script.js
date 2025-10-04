// Zoom In/Out
let fontSize = 16;

document.getElementById("zoom-in").addEventListener("click", () => {
  fontSize += 1;
  document.body.style.fontSize = `${fontSize}px`;
});

document.getElementById("zoom-out").addEventListener("click", () => {
  fontSize = Math.max(12, fontSize - 1);
  document.body.style.fontSize = `${fontSize}px`;
});

// Dark/Light Mode
document.getElementById("toggle-mode").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  document.body.classList.toggle("dark-mode");
});

// Carrossel simples
let currentIndex = 0;
const images = document.querySelectorAll(".carousel-img");

setInterval(() => {
  images[currentIndex].classList.remove("active");
  currentIndex = (currentIndex + 1) % images.length;
  images[currentIndex].classList.add("active");
}, 3000); // muda a imagem a cada 3 segundos
