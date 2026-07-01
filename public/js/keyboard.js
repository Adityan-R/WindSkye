/* keyboard.js — Global keyboard shortcut handler */

export class KeyboardManager {
  constructor(app) {
    this.app = app;
    this.enabled = true;
    this._handler = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._handler);
  }

  _isInputFocused() {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
  }

  _onKeyDown(e) {
    if (!this.enabled) return;

    // Allow Escape always
    if (e.key === 'Escape') {
      e.preventDefault();
      if (this._isInputFocused()) {
        document.activeElement.blur();
      } else {
        this.app.closeDetail();
      }
      return;
    }

    // When input is focused, only handle Enter/Escape
    if (this._isInputFocused()) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.app.submitSearch();
      }
      return;
    }

    switch (e.key) {
      case '/':
        e.preventDefault();
        this.app.focusSearch();
        break;
      case 'd':
        e.preventDefault();
        this.app.downloadSelected();
        break;
      case 'p':
        e.preventDefault();
        this.app.pauseSelected();
        break;
      case 'c':
        e.preventDefault();
        this.app.cancelSelected();
        break;
      case 'Tab':
        e.preventDefault();
        this.app.switchPane();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.app.navigateList(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.app.navigateList(1);
        break;
      case 'Enter':
        e.preventDefault();
        this.app.selectCurrent();
        break;
      case '?':
        e.preventDefault();
        this.app.showHelp();
        break;
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._handler);
  }
}
