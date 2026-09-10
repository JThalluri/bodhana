import './home.css';

export function mount(container) {
  container.innerHTML = `
    <div class="home-view">
      <div class="home-hero">
        <h1 class="home-title">Bodhana</h1>
        <p class="home-subtitle">Learning tools for curious minds</p>
      </div>

      <div class="tools-grid">
        <a href="#/math" class="tool-card">
          <div class="tool-icon math-icon">
            <i class="fas fa-calculator"></i>
          </div>
          <div class="tool-info">
            <h2 class="tool-name">Math Test Generator</h2>
            <p class="tool-desc">
              Create printable math worksheets with addition, subtraction,
              multiplication, and division. Customize number ranges, mix
              operations, and generate multiple variations.
            </p>
            <div class="tool-tags">
              <span class="tag">Addition</span>
              <span class="tag">Subtraction</span>
              <span class="tag">Multiplication</span>
              <span class="tag">Division</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>

        <a href="#/word-puzzles" class="tool-card">
          <div class="tool-icon puzzle-icon">
            <i class="fas fa-puzzle-piece"></i>
          </div>
          <div class="tool-info">
            <h2 class="tool-name">Word Puzzle Generator</h2>
            <p class="tool-desc">
              Build word search and criss-cross puzzles from your own word
              list. Adjust grid size, difficulty, font, and print multiple
              puzzles at once.
            </p>
            <div class="tool-tags">
              <span class="tag">Word Search</span>
              <span class="tag">Criss Cross</span>
              <span class="tag">Printable</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>

        <a href="#/math-puzzles" class="tool-card">
          <div class="tool-icon mathpuzzle-icon">
            <i class="fas fa-hashtag"></i>
          </div>
          <div class="tool-info">
            <h2 class="tool-name">Math Puzzle Grid</h2>
            <p class="tool-desc">
              Crossword-style math puzzles where equations intersect at shared
              values. Supports all four operations with customizable number
              ranges. Easy, medium, and hard difficulty levels.
            </p>
            <div class="tool-tags">
              <span class="tag">Crossword</span>
              <span class="tag">All Operations</span>
              <span class="tag">Printable</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>

        <a href="#/sudoku" class="tool-card">
          <div class="tool-icon sudoku-icon">
            <i class="fas fa-th"></i>
          </div>
          <div class="tool-info">
            <h2 class="tool-name">Sudoku Generator</h2>
            <p class="tool-desc">
              Generate uniquely-solvable 9&times;9 Sudoku puzzles with three
              difficulty levels. Customize font, cell size, and padding.
              Print multiple puzzles &mdash; each on its own page.
            </p>
            <div class="tool-tags">
              <span class="tag">Easy</span>
              <span class="tag">Medium</span>
              <span class="tag">Hard</span>
              <span class="tag">Printable</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>
      </div>
    </div>
  `;
}
