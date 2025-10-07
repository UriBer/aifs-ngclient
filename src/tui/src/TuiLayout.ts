import blessed from 'blessed';

export class TuiLayout {
  private screen: blessed.Widgets.Screen;
  private leftPane: blessed.Widgets.BoxElement;
  private rightPane: blessed.Widgets.BoxElement;
  private jobPanel: blessed.Widgets.BoxElement;
  private statusBar: blessed.Widgets.BoxElement;
  private showJobPanel: boolean = false;

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
    this.createLayout();
  }

  private createLayout(): void {
    // Create main container
    const mainContainer = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-1',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'white'
        }
      }
    });

    // Create left pane
    this.leftPane = blessed.box({
      parent: mainContainer,
      top: 0,
      left: 0,
      width: '50%',
      height: this.showJobPanel ? '70%' : '100%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      }
    });

    // Create right pane
    this.rightPane = blessed.box({
      parent: mainContainer,
      top: 0,
      left: '50%',
      width: '50%',
      height: this.showJobPanel ? '70%' : '100%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      }
    });

    // Create job panel (initially hidden)
    this.jobPanel = blessed.box({
      parent: mainContainer,
      top: '70%',
      left: 0,
      width: '100%',
      height: '30%',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'yellow'
        }
      },
      hidden: true
    });

    // Create status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      top: '100%-1',
      left: 0,
      width: '100%',
      height: 1,
      content: 'AIFS Commander TUI - Press F1 for help, F10 to quit',
      style: {
        bg: 'blue',
        fg: 'white'
      }
    });
  }

  public getLeftPane(): blessed.Widgets.BoxElement {
    return this.leftPane;
  }

  public getRightPane(): blessed.Widgets.BoxElement {
    return this.rightPane;
  }

  public getJobPanel(): blessed.Widgets.BoxElement {
    return this.jobPanel;
  }

  public getStatusBar(): blessed.Widgets.BoxElement {
    return this.statusBar;
  }

  public toggleJobPanel(): void {
    this.showJobPanel = !this.showJobPanel;
    
    if (this.showJobPanel) {
      this.leftPane.height = '70%';
      this.rightPane.height = '70%';
      this.jobPanel.hidden = false;
    } else {
      this.leftPane.height = '100%';
      this.rightPane.height = '100%';
      this.jobPanel.hidden = true;
    }
  }

  public resize(): void {
    // Handle terminal resize
    const { width, height } = this.screen;
    
    if (width < 80 || height < 20) {
      // Terminal too small, show error
      this.statusBar.content = 'Terminal too small. Please resize to at least 80x20';
      this.statusBar.style.bg = 'red';
    } else {
      this.statusBar.content = 'AIFS Commander TUI - Press F1 for help, F10 to quit';
      this.statusBar.style.bg = 'blue';
    }
  }

  public updateStatusBar(content: string): void {
    this.statusBar.content = content;
    this.screen.render();
  }
}
