// edge_snapper.js - Edge-snapping and multi-monitor position memory for LiveScore HUD

export class EdgeSnapper {
  constructor(element, onPositionChanged) {
    this.element = element;
    this.onPositionChanged = onPositionChanged;
    this.snapThreshold = 24;
    this.margin = 16;
    this.menuBarSafeHeight = 32;
    this.dockSafeHeight = 64;
  }

  /**
   * Calculates snapped coordinates given raw window (x, y) coordinates and screen bounds.
   */
  calculateSnap(x, y, windowWidth, windowHeight, screenBounds) {
    const screenX = screenBounds.x || 0;
    const screenY = screenBounds.y || 0;
    const screenWidth = screenBounds.width || window.screen.availWidth || 1440;
    const screenHeight = screenBounds.height || window.screen.availHeight || 900;

    let targetX = x;
    let targetY = y;
    let horizontalAnchor = 'custom';
    let verticalAnchor = 'custom';

    // Left Edge Snapping
    if (x - screenX <= this.snapThreshold) {
      targetX = screenX + this.margin;
      horizontalAnchor = 'left';
    } 
    // Right Edge Snapping
    else if ((screenX + screenWidth) - (x + windowWidth) <= this.snapThreshold) {
      targetX = screenX + screenWidth - windowWidth - this.margin;
      horizontalAnchor = 'right';
    }

    // Top Edge Snapping (respects macOS Menu Bar)
    if (y - screenY <= this.snapThreshold + this.menuBarSafeHeight) {
      targetY = screenY + this.menuBarSafeHeight + this.margin;
      verticalAnchor = 'top';
    } 
    // Bottom Edge Snapping (respects macOS Dock)
    else if ((screenY + screenHeight) - (y + windowHeight) <= this.snapThreshold + this.dockSafeHeight) {
      targetY = screenY + screenHeight - windowHeight - this.dockSafeHeight - this.margin;
      verticalAnchor = 'bottom';
    }

    const anchor = `${verticalAnchor}-${horizontalAnchor}`;

    return {
      x: Math.round(targetX),
      y: Math.round(targetY),
      anchor,
      isSnapped: horizontalAnchor !== 'custom' || verticalAnchor !== 'custom'
    };
  }

  /**
   * Restores position on primary screen if the previous display was disconnected.
   */
  getSafeRestoredPosition(savedPosition, primaryScreen) {
    const screenWidth = primaryScreen?.width || 1440;
    const screenHeight = primaryScreen?.height || 900;
    const windowWidth = 320;
    const windowHeight = 92;

    if (!savedPosition) {
      // Default fallback: Top-Right
      return {
        x: screenWidth - windowWidth - this.margin,
        y: this.menuBarSafeHeight + this.margin,
        anchor: 'top-right'
      };
    }

    switch (savedPosition.anchor) {
      case 'top-left':
        return { x: this.margin, y: this.menuBarSafeHeight + this.margin, anchor: 'top-left' };
      case 'bottom-left':
        return { x: this.margin, y: screenHeight - windowHeight - this.dockSafeHeight - this.margin, anchor: 'bottom-left' };
      case 'bottom-right':
        return { x: screenWidth - windowWidth - this.margin, y: screenHeight - windowHeight - this.dockSafeHeight - this.margin, anchor: 'bottom-right' };
      case 'top-right':
      default:
        return { x: screenWidth - windowWidth - this.margin, y: this.menuBarSafeHeight + this.margin, anchor: 'top-right' };
    }
  }
}
