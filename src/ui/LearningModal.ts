/**
 * Interactive Glassmorphic Learning & Algorithm Complexity Modal.
 * Provides Big-O matrices, heuristic admissibility guidelines, real-world applications,
 * and keyboard shortcuts reference.
 */

export interface LearningModalOptions {
  triggerButtonId?: string;
}

export class LearningModal {
  private container: HTMLElement | null = null;
  private isOpen = false;
  private activeTab: 'matrix' | 'heuristics' | 'applications' | 'shortcuts' = 'matrix';

  constructor(private options: LearningModalOptions = {}) {
    this.init();
  }

  private init(): void {
    if (typeof document === 'undefined') return;

    this.createModalDom();
    this.wireEvents();

    if (this.options.triggerButtonId) {
      const btn = document.getElementById(this.options.triggerButtonId);
      btn?.addEventListener('click', () => this.open());
    }
  }

  private createModalDom(): void {
    // Check if modal already exists
    let existing = document.getElementById('learningModalOverlay');
    if (existing) {
      this.container = existing;
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'learningModalOverlay';
    overlay.className = 'learning-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="learning-modal-card" id="learningModalCard">
        <!-- Header -->
        <div class="learning-modal-header">
          <div class="learning-header-title">
            <span class="learning-header-icon">💡</span>
            <h2>Pathfinding Academy & Complexity Matrix</h2>
          </div>
          <button class="learning-modal-close" id="btnModalClose" title="Close Modal (Esc)">&times;</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="learning-modal-tabs">
          <button class="learning-tab-btn active" data-tab="matrix">📊 Big-O Complexity</button>
          <button class="learning-tab-btn" data-tab="heuristics">📐 Heuristics & Admissibility</button>
          <button class="learning-tab-btn" data-tab="applications">🚀 Real-World Applications</button>
          <button class="learning-tab-btn" data-tab="shortcuts">⌨️ Keyboard Shortcuts</button>
        </div>

        <!-- Body / Content Panels -->
        <div class="learning-modal-body" id="learningModalBody">
          <!-- Panel 1: Big-O Matrix -->
          <div class="learning-tab-panel active" id="tabPanelMatrix">
            <p class="tab-lead-text">
              Comprehensive asymptotic complexity and optimality guarantees for grid search algorithms.
              In a grid graph, <code class="mono-code">V = width × height</code> and <code class="mono-code">E ≤ 4V</code>.
            </p>
            <div class="table-responsive">
              <table class="complexity-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Time Complexity</th>
                    <th>Space</th>
                    <th>Optimal?</th>
                    <th>Weights?</th>
                    <th>Search Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>A* Search</strong></td>
                    <td><code class="tag-time">O((V + E) log V)</code></td>
                    <td><code class="tag-space">O(V)</code></td>
                    <td><span class="badge-success">Yes (Admissible)</span></td>
                    <td><span class="badge-success">Yes</span></td>
                    <td>Guided Best-First (<code class="mono-code">f = g + h</code>)</td>
                  </tr>
                  <tr>
                    <td><strong>Dijkstra's</strong></td>
                    <td><code class="tag-time">O((V + E) log V)</code></td>
                    <td><code class="tag-space">O(V)</code></td>
                    <td><span class="badge-success">Yes (Optimal)</span></td>
                    <td><span class="badge-success">Yes</span></td>
                    <td>Uniform-Cost Expansion (<code class="mono-code">g(n)</code>)</td>
                  </tr>
                  <tr>
                    <td><strong>Jump Point Search (JPS)</strong></td>
                    <td><code class="tag-time">O(V) best / O((V+E)log V)</code></td>
                    <td><code class="tag-space">O(V)</code></td>
                    <td><span class="badge-success">Yes</span></td>
                    <td><span class="badge-warning">No (Uniform)</span></td>
                    <td>Prunes symmetric neighbors via jumping</td>
                  </tr>
                  <tr>
                    <td><strong>Bidirectional Search</strong></td>
                    <td><code class="tag-time">O(b<sup>d/2</sup>)</code></td>
                    <td><code class="tag-space">O(b<sup>d/2</sup>)</code></td>
                    <td><span class="badge-success">Yes</span></td>
                    <td><span class="badge-success">Yes</span></td>
                    <td>Simultaneous start & target frontiers</td>
                  </tr>
                  <tr>
                    <td><strong>Breadth-First Search (BFS)</strong></td>
                    <td><code class="tag-time">O(V + E)</code></td>
                    <td><code class="tag-space">O(V)</code></td>
                    <td><span class="badge-success">Yes (Unweighted)</span></td>
                    <td><span class="badge-danger">No</span></td>
                    <td>Level-order FIFO wave expansion</td>
                  </tr>
                  <tr>
                    <td><strong>Depth-First Search (DFS)</strong></td>
                    <td><code class="tag-time">O(V + E)</code></td>
                    <td><code class="tag-space">O(V)</code></td>
                    <td><span class="badge-danger">No</span></td>
                    <td><span class="badge-danger">No</span></td>
                    <td>LIFO greedy depth probe</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Panel 2: Heuristics & Admissibility -->
          <div class="learning-tab-panel" id="tabPanelHeuristics">
            <div class="heuristic-cards-grid">
              <div class="learning-info-card">
                <div class="info-card-header">
                  <span class="info-card-badge">L1 Norm</span>
                  <h4>Manhattan Distance</h4>
                </div>
                <div class="math-formula">h(n) = |x₁ - x₂| + |y₁ - y₂|</div>
                <p>Calculates the sum of orthogonal axis differences. <strong>Optimal and admissible</strong> for standard 4-directional grid movement where diagonal travel is prohibited.</p>
                <div class="card-footer-tip">💡 Used in city grids, warehouse automated rovers, and puzzle visualizers.</div>
              </div>

              <div class="learning-info-card">
                <div class="info-card-header">
                  <span class="info-card-badge">L2 Norm</span>
                  <h4>Euclidean Distance</h4>
                </div>
                <div class="math-formula">h(n) = √((x₁ - x₂)² + (y₁ - y₂)²)</div>
                <p>Straight-line line-of-sight distance. Always admissible (it never overestimates the actual shortest travel cost). Best when paths can move at arbitrary angles.</p>
                <div class="card-footer-tip">💡 Essential in aerial drones, navigation line-of-sight, and physics engines.</div>
              </div>

              <div class="learning-info-card">
                <div class="info-card-header">
                  <span class="info-card-badge">L∞ Norm</span>
                  <h4>Chebyshev Distance</h4>
                </div>
                <div class="math-formula">h(n) = max(|x₁ - x₂|, |y₁ - y₂|)</div>
                <p>Appropriate for 8-directional movement where diagonal movement cost equals orthogonal cost (same as King's movement on a chessboard).</p>
                <div class="card-footer-tip">💡 Used in grid tile strategies and turn-based tactical gaming.</div>
              </div>

              <div class="learning-info-card">
                <div class="info-card-header">
                  <span class="info-card-badge">Octile Norm</span>
                  <h4>Octile Distance</h4>
                </div>
                <div class="math-formula">h(n) = max(dx, dy) + (√2 - 1) · min(dx, dy)</div>
                <p>Standard 8-directional heuristic where orthogonal steps cost 1.0 and diagonal steps cost √2 ≈ 1.414. Guarantees optimal admissible search on 8-way grids.</p>
                <div class="card-footer-tip">💡 Standard in RTS games like StarCraft and Warcraft III engine pathfinding.</div>
              </div>
            </div>

            <div class="admissibility-banner">
              <h5>⚖️ The Admissibility & Consistency Theorem</h5>
              <p>For A* to guarantee finding the mathematically shortest path, the heuristic must be <strong>admissible</strong> (it must never overestimate the true remaining cost: <code class="mono-code">h(n) ≤ h*(n)</code>). Furthermore, if <code class="mono-code">h(n) ≤ c(n, n') + h(n')</code> (the triangle inequality), the heuristic is <strong>consistent</strong> (monotonic), guaranteeing that no node needs to be reopened once closed.</p>
            </div>
          </div>

          <!-- Panel 3: Real-World Applications -->
          <div class="learning-tab-panel" id="tabPanelApplications">
            <div class="applications-grid">
              <div class="app-card">
                <div class="app-icon">🛰️</div>
                <div class="app-content">
                  <h4>GPS & Turn-by-Turn Navigation</h4>
                  <p>Platforms like Google Maps and Apple Maps use hierarchical variants of <strong>A* (Contraction Hierarchies)</strong> and <strong>Bidirectional Dijkstra</strong> to compute cross-continental driving routes across millions of road segments in single-digit milliseconds.</p>
                </div>
              </div>

              <div class="app-card">
                <div class="app-icon">🎮</div>
                <div class="app-content">
                  <h4>Game AI & Navigation Meshes (NavMesh)</h4>
                  <p>In AAA titles, hundreds of autonomous agents calculate steering paths using <strong>Jump Point Search (JPS)</strong> and hierarchical <strong>A* on NavMeshes</strong>, bypassing empty uniform zones to maintain smooth 60–120 FPS simulation budgets.</p>
                </div>
              </div>

              <div class="app-card">
                <div class="app-icon">🤖</div>
                <div class="app-content">
                  <h4>Robotics & Autonomous Warehouse Fleets</h4>
                  <p>Automated fulfillment centers (e.g., Amazon Kiva systems) coordinate thousands of mobile transport robots using <strong>Space-Time A*</strong> and <strong>Conflict-Based Search</strong>, dynamically avoiding static pillars and transient robot collisions.</p>
                </div>
              </div>

              <div class="app-card">
                <div class="app-icon">🧬</div>
                <div class="app-content">
                  <h4>VLSI Chip Layout & Network Routing</h4>
                  <p>Microchip interconnect design routes billions of transistors on nanometer silicon using maze-routing algorithms (Lee algorithm, an unweighted BFS variant) and A* wire routing to minimize capacitance and signal latency.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Panel 4: Keyboard Shortcuts -->
          <div class="learning-tab-panel" id="tabPanelShortcuts">
            <div class="shortcuts-container">
              <div class="shortcut-group">
                <h4 class="shortcut-group-title">Simulation & Scrubbing</h4>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>Space</kbd></span>
                  <span class="shortcut-desc">Start / Pause / Resume Visualization</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>S</kbd> or <kbd>→</kbd></span>
                  <span class="shortcut-desc">Step Forward 1 Tick</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>A</kbd> or <kbd>←</kbd></span>
                  <span class="shortcut-desc">Step Backward 1 Tick</span>
                </div>
              </div>

              <div class="shortcut-group">
                <h4 class="shortcut-group-title">Interactive Drawing Brushes</h4>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>W</kbd></span>
                  <span class="shortcut-desc">Select Wall Brush (Blocks passage)</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>E</kbd></span>
                  <span class="shortcut-desc">Select Weight Brush (5x traversal cost)</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>X</kbd></span>
                  <span class="shortcut-desc">Select Eraser Tool (Clears cells)</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>C</kbd></span>
                  <span class="shortcut-desc">Clear Entire Map</span>
                </div>
              </div>

              <div class="shortcut-group">
                <h4 class="shortcut-group-title">Viewport & Pan-Zoom</h4>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>Wheel</kbd></span>
                  <span class="shortcut-desc">Smooth Zoom in / out centered on cursor</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>Middle-Click Drag</kbd></span>
                  <span class="shortcut-desc">Pan viewport across infinite grid canvas</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>?</kbd> or <kbd>H</kbd></span>
                  <span class="shortcut-desc">Open / Close this Learning Modal</span>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-keys"><kbd>Esc</kbd></span>
                  <span class="shortcut-desc">Dismiss open modal dialog</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="learning-modal-footer">
          <span class="footer-tip">💡 Pro Tip: Select a <strong>Challenge Puzzle</strong> in the toolbar to test algorithms against tricky heuristics traps!</span>
          <button class="btn btn-primary" id="btnModalAcknowledge">Got it!</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.container = overlay;
  }

  private wireEvents(): void {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('#btnModalClose');
    closeBtn?.addEventListener('click', () => this.close());

    // Acknowledge button
    const ackBtn = this.container.querySelector('#btnModalAcknowledge');
    ackBtn?.addEventListener('click', () => this.close());

    // Backdrop click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    // Tab buttons
    const tabBtns = this.container.querySelectorAll<HTMLButtonElement>('.learning-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab as 'matrix' | 'heuristics' | 'applications' | 'shortcuts';
        if (tab) this.switchTab(tab);
      });
    });

    // Keyboard global listener for Esc and ?
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      } else if ((e.key === '?' || e.key.toLowerCase() === 'h') && !this.isOpen) {
        e.preventDefault();
        this.open();
      }
    });
  }

  public switchTab(tab: 'matrix' | 'heuristics' | 'applications' | 'shortcuts'): void {
    this.activeTab = tab;
    if (!this.container) return;

    const tabBtns = this.container.querySelectorAll<HTMLButtonElement>('.learning-tab-btn');
    tabBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const panels: Record<string, string> = {
      matrix: 'tabPanelMatrix',
      heuristics: 'tabPanelHeuristics',
      applications: 'tabPanelApplications',
      shortcuts: 'tabPanelShortcuts',
    };

    const targetPanelId = panels[tab];
    const allPanels = this.container.querySelectorAll<HTMLElement>('.learning-tab-panel');
    allPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === targetPanelId);
    });
  }

  public open(): void {
    if (!this.container) this.createModalDom();
    if (!this.container) return;

    this.container.classList.add('visible');
    this.container.setAttribute('aria-hidden', 'false');
    this.isOpen = true;
  }

  public close(): void {
    if (!this.container) return;

    this.container.classList.remove('visible');
    this.container.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public get visible(): boolean {
    return this.isOpen;
  }
}
