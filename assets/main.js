/* Busca e filtro por categoria da página inicial (hub de jogos) */

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const searchInput = document.getElementById("search-input");
  const grid = document.getElementById("game-grid");
  const emptyState = document.getElementById("empty-state");
  const gameCountEl = document.getElementById("game-count");
  const chips = document.querySelectorAll(".chip:not(.disabled)");

  const realCards = () => Array.from(grid.querySelectorAll(".game-card[data-name]"));
  const placeholderCards = () => Array.from(grid.querySelectorAll(".game-card.placeholder"));

  const totalGames = realCards().length;
  if (gameCountEl) {
    gameCountEl.textContent = `${totalGames} jogo${totalGames === 1 ? "" : "s"} disponível${totalGames === 1 ? "" : "eis"}`;
  }

  let activeCategory = "logica";

  function applyFilters() {
    const query = (searchInput?.value || "").trim().toLowerCase();
    let visibleCount = 0;

    realCards().forEach((card) => {
      const matchesQuery = !query || card.dataset.name.includes(query);
      const matchesCategory = !activeCategory || card.dataset.category === activeCategory;
      const visible = matchesQuery && matchesCategory;
      card.style.display = visible ? "" : "none";
      if (visible) visibleCount++;
    });

    // Os cards "em breve" só aparecem quando não há busca ativa,
    // pra não confundir quem está procurando um jogo específico.
    placeholderCards().forEach((card) => {
      card.style.display = query ? "none" : "";
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  searchInput?.addEventListener("input", applyFilters);

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.category || null;
      applyFilters();
    });
  });

  applyFilters();
});
