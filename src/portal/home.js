import './home.css';
import { BANNER_URL } from './banner.js';

export function mount(container) {
  container.innerHTML = `
    <div class="home-view">
      <div class="home-hero">
        <div class="home-banner">
          <img src="${BANNER_URL}" alt="Bodhana" class="home-banner-img" />
          <p class="home-subtitle">Learning tools for curious minds</p>
        </div>
      </div>

      <div class="tools-grid">
        <a href="#/math" class="tool-card">
          <div class="tool-icon math-icon">
            <i class="fas fa-pencil-alt"></i>
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
              Build word search, criss-cross puzzles, and word jumbles from 
              your own word list. Adjust grid size, difficulty, font, and 
              print multiple puzzles at once.
            </p>
            <div class="tool-tags">
              <span class="tag">Word Search</span>
              <span class="tag">Criss Cross</span>
              <span class="tag">Word Jumble</span>
              <span class="tag">Printable</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>

        <a href="#/math-puzzles" class="tool-card">
          <div class="tool-icon mathpuzzle-icon">
            <i class="fas fa-superscript"></i>
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
            <i class="fas fa-border-all"></i>
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

        <a href="#/dict-builder" class="tool-card">
          <div class="tool-icon dictbuilder-icon">
            <i class="fas fa-book-open"></i>
          </div>
          <div class="tool-info">
            <h2 class="tool-name">Dictionary Builder</h2>
            <p class="tool-desc">
              Extract vocabulary from stories, fables, and documents to build
              a custom word list. Upload PDF, DOCX, ODT, TXT, or CSV files,
              filter by word length, and download a ready-to-use puzzle dictionary.
            </p>
            <div class="tool-tags">
              <span class="tag">PDF</span>
              <span class="tag">DOCX</span>
              <span class="tag">TXT</span>
              <span class="tag">ODT</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>

        <a href="#/worksheets" class="tool-card">
          <div class="tool-icon worksheets-icon">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="tool-info">
            <h2 class="tool-name">Worksheet Generator</h2>
            <p class="tool-desc">
              Create printable Seyès (French ruled) handwriting practice sheets.
              Type a sentence, set font size and margins, and print a grid
              where each character sits in its own 8&thinsp;mm cell with
              blank rows below for learners to copy.
            </p>
            <div class="tool-tags">
              <span class="tag">Seyès</span>
              <span class="tag">Handwriting</span>
              <span class="tag">French Ruled</span>
              <span class="tag">Printable</span>
            </div>
          </div>
          <div class="tool-arrow"><i class="fas fa-arrow-right"></i></div>
        </a>
      </div>
    </div>
  `;
}
