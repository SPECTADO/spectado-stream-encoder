import logger from "/src/logger.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import { SessionStatus } from "/src/sessionManager.ts";
import dayjs from "dayjs";
import chalk from "chalk";

export class StreamEncoderTUI {
  private updateInterval?: number;
  private running = false;
  private lastTerminalSize = { width: 0, height: 0 };

  constructor() {
    // Hide cursor and clear screen
    this.setupTerminal();
  }

  private setupTerminal() {
    // Clear screen and hide cursor
    console.log("\x1B[2J\x1B[H\x1B[?25l");

    // Set up cleanup on exit
    const cleanup = () => {
      this.close();
      Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", cleanup);
    Deno.addSignalListener("SIGTERM", cleanup);

    // Handle terminal resize
    Deno.addSignalListener("SIGWINCH", () => {
      // Terminal resize signal - force immediate re-render
      this.render();
    });
  }

  private getTerminalSize() {
    try {
      const size = Deno.consoleSize();
      const newSize = { width: size.columns, height: size.rows };

      // Check if size changed significantly
      if (
        newSize.width !== this.lastTerminalSize.width ||
        newSize.height !== this.lastTerminalSize.height
      ) {
        this.lastTerminalSize = newSize;
      }

      return newSize;
    } catch {
      // Progressive fallback based on environment
      const fallbackWidth = parseInt(Deno.env.get("COLUMNS") || "80");
      const fallbackHeight = parseInt(Deno.env.get("LINES") || "24");
      return { width: fallbackWidth, height: fallbackHeight };
    }
  }

  private drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    borderColor: string = "white"
  ) {
    const { width: termWidth } = this.getTerminalSize();

    if (width > termWidth) width = termWidth;
    if (x + width > termWidth) x = termWidth - width;

    // Move cursor to position and draw top border
    console.log(
      `\x1B[${y};${x}H${chalk.hex(borderColor)(
        "┌" + "─".repeat(Math.max(0, width - 2)) + "┐"
      )}`
    );

    // Draw title if provided
    if (title) {
      const titleX = x + Math.max(0, Math.floor((width - title.length) / 2));
      console.log(`\x1B[${y};${titleX}H${chalk.hex(borderColor)(title)}`);
    }

    // Draw side borders
    for (let i = 1; i < height - 1; i++) {
      console.log(`\x1B[${y + i};${x}H${chalk.hex(borderColor)("│")}`);
      console.log(
        `\x1B[${y + i};${x + width - 1}H${chalk.hex(borderColor)("│")}`
      );
    }

    // Draw bottom border
    console.log(
      `\x1B[${y + height - 1};${x}H${chalk.hex(borderColor)(
        "└" + "─".repeat(Math.max(0, width - 2)) + "┘"
      )}`
    );

    return {
      contentX: x + 1,
      contentY: y + 1,
      contentWidth: width - 2,
      contentHeight: height - 2,
    };
  }

  private clearArea(x: number, y: number, width: number, height: number) {
    for (let i = 0; i < height; i++) {
      console.log(`\x1B[${y + i};${x}H${" ".repeat(width)}`);
    }
  }

  private updateLogs(
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number
  ) {
    // Clear content area
    this.clearArea(contentX, contentY, contentWidth, contentHeight);

    // Dynamic log count based on available height
    const maxLogs = Math.min(
      Math.max(1, contentHeight),
      logger.logBuffer.length
    );
    const logs = logger.logBuffer.slice(-maxLogs);

    logs.forEach((logEntry, index) => {
      if (index >= contentHeight) return;

      const timestamp = dayjs().format("HH:mm:ss");
      let prefix = "";
      let color = chalk.white;

      switch (logEntry.type) {
        case 1: // ERROR
          prefix = "❌";
          color = chalk.red;
          break;
        case 2: // WARNING
          prefix = "⚠️ ";
          color = chalk.yellow;
          break;
        case 3: // INFO
          prefix = "ℹ️ ";
          color = chalk.blue;
          break;
        case 4: // DEBUG
          prefix = "🐛";
          color = chalk.gray;
          break;
        case 5: // FFDEBUG
          prefix = "🔧";
          color = chalk.magenta;
          break;
        default:
          prefix = "📝";
          color = chalk.white;
      }

      const logText = `${timestamp} ${prefix} ${logEntry.line}`;
      const truncatedText =
        logText.length > contentWidth
          ? logText.substring(0, contentWidth - 3) + "..."
          : logText;

      console.log(
        `\x1B[${contentY + index};${contentX}H${color(truncatedText)}`
      );
    });
  }

  private updateEncoderStatus(
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number
  ) {
    // Clear content area
    this.clearArea(contentX, contentY, contentWidth, contentHeight);

    let currentLine = 0;

    if (!globalThis.streams || globalThis.streams.length === 0) {
      console.log(
        `\x1B[${contentY};${contentX}H${chalk.gray("No encoders configured")}`
      );
      return;
    }

    // Header row - adaptive column widths
    let idColWidth, statusColWidth, sourceColWidth, targetColWidth;

    if (contentWidth >= 80) {
      // Wide terminal - full layout
      idColWidth = 12;
      statusColWidth = 12;
      sourceColWidth = 20;
      targetColWidth = Math.max(20, contentWidth - 44);
    } else if (contentWidth >= 60) {
      // Medium terminal - compact layout
      idColWidth = 10;
      statusColWidth = 10;
      sourceColWidth = 15;
      targetColWidth = Math.max(15, contentWidth - 35);
    } else {
      // Narrow terminal - minimal layout
      idColWidth = 8;
      statusColWidth = 8;
      sourceColWidth = 12;
      targetColWidth = Math.max(12, contentWidth - 28);
    }

    const idCol = "ID".padEnd(idColWidth);
    const statusCol = "Status".padEnd(statusColWidth);
    const sourceCol = "Source".padEnd(sourceColWidth);
    const targetCol = "Target".padEnd(targetColWidth);

    const header = `${idCol}${statusCol}${sourceCol}${targetCol}`;
    const truncatedHeader =
      header.length > contentWidth ? header.substring(0, contentWidth) : header;

    console.log(
      `\x1B[${contentY + currentLine};${contentX}H${chalk.bold.white(
        truncatedHeader
      )}`
    );
    currentLine++;

    // Separator line
    if (currentLine < contentHeight) {
      console.log(
        `\x1B[${contentY + currentLine};${contentX}H${chalk.gray(
          "─".repeat(Math.min(contentWidth, header.length))
        )}`
      );
      currentLine++;
    }

    // Data rows
    globalThis.streams.forEach((stream: SessionManagerItem) => {
      if (currentLine >= contentHeight - 2) return; // Leave space for summary

      // Status emoji and color
      let statusText = "";
      let statusColor = chalk.white;
      switch (stream.status) {
        case SessionStatus.live:
          statusText = "🟢 Live";
          statusColor = chalk.green;
          break;
        case SessionStatus.connecting:
          statusText = "🟡 Connecting";
          statusColor = chalk.yellow;
          break;
        case SessionStatus.error:
          statusText = "🔴 Error";
          statusColor = chalk.red;
          break;
        case SessionStatus.stopped:
          statusText = "⚪ Stopped";
          statusColor = chalk.gray;
          break;
      }

      const id = stream.id.padEnd(idColWidth);
      const status = statusText.padEnd(statusColWidth);
      const source = (stream.encoder.captureAudioCard || "N/A").padEnd(
        sourceColWidth
      );
      const target = `${stream.encoder.icecast?.server || "N/A"}:${
        stream.encoder.icecast?.mount || ""
      }`.padEnd(targetColWidth);

      const row = `${chalk.white(id)}${statusColor(status)}${chalk.cyan(
        source
      )}${chalk.magenta(target)}`;
      const truncatedRow =
        row.length > contentWidth ? row.substring(0, contentWidth) : row;

      console.log(`\x1B[${contentY + currentLine};${contentX}H${truncatedRow}`);
      currentLine++;
    });

    // Summary row
    if (currentLine < contentHeight - 1) {
      const liveCount = globalThis.streams.filter(
        (s) => s.status === SessionStatus.live
      ).length;
      const errorCount = globalThis.streams.filter(
        (s) => s.status === SessionStatus.error
      ).length;
      const stoppedCount = globalThis.streams.filter(
        (s) =>
          s.status === SessionStatus.stopped ||
          s.status === SessionStatus.connecting
      ).length;

      const summaryText = `✅ Active: ${liveCount} | ⚠️ Error: ${errorCount} | ❌ Stopped: ${stoppedCount}`;

      console.log(
        `\x1B[${contentY + currentLine + 1};${contentX}H${chalk.gray(
          "─".repeat(Math.min(contentWidth, summaryText.length))
        )}`
      );
      console.log(
        `\x1B[${contentY + currentLine + 2};${contentX}H${chalk.bold.white(
          summaryText
        )}`
      );
    }
  }

  private updateErrorList(
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number
  ) {
    // Clear content area
    this.clearArea(contentX, contentY, contentWidth, contentHeight);

    // Get encoders in error state
    const errorEncoders =
      globalThis.streams?.filter(
        (s: SessionManagerItem) => s.status === SessionStatus.error
      ) || [];

    if (errorEncoders.length === 0) {
      console.log(
        `\x1B[${contentY};${contentX}H${chalk.green("🎉 No errors detected")}`
      );
    } else {
      const errorIds = errorEncoders.map((e) => e.id).join(", ");
      const errorText = `Error Encoders: ${errorIds}`;
      const truncatedText =
        errorText.length > contentWidth
          ? errorText.substring(0, contentWidth - 3) + "..."
          : errorText;

      console.log(`\x1B[${contentY};${contentX}H${chalk.red(truncatedText)}`);
    }
  }

  render() {
    const { width, height } = this.getTerminalSize();

    // Clear screen
    console.log("\x1B[2J\x1B[H");

    // Minimum size constraints
    if (height < 10 || width < 40) {
      console.log(
        `\x1B[1;1H${chalk.red(
          "Terminal too small! Min: 40x10, Current: ${width}x${height}"
        )}`
      );
      console.log(
        `\x1B[2;1H${chalk.yellow(
          "Please resize your terminal or use --no-tui for console mode"
        )}`
      );
      console.log(
        `\x1B[3;1H${chalk.gray("TUI will resume when terminal is resized...")}`
      );
      return;
    }

    // Adaptive layout based on terminal height
    let logHeight, statusHeight, errorHeight;

    if (height >= 30) {
      // Large terminal - use percentage-based layout
      logHeight = Math.floor(height * 0.3);
      statusHeight = Math.floor(height * 0.6);
      errorHeight = height - logHeight - statusHeight;
    } else if (height >= 20) {
      // Medium terminal - reduce log area
      logHeight = Math.max(5, Math.floor(height * 0.25));
      statusHeight = Math.floor(height * 0.65);
      errorHeight = height - logHeight - statusHeight;
    } else {
      // Small terminal - minimal layout
      logHeight = Math.max(3, Math.floor(height * 0.2));
      statusHeight = height - logHeight - 3; // Reserve 3 lines for error
      errorHeight = 3;
    }

    // Ensure minimum heights
    logHeight = Math.max(3, logHeight);
    statusHeight = Math.max(5, statusHeight);
    errorHeight = Math.max(2, errorHeight);

    // Draw log window (top)
    const logBox = this.drawBox(
      1,
      1,
      width - 1,
      logHeight,
      " 📋 Logs ",
      "blue"
    );
    this.updateLogs(
      logBox.contentX,
      logBox.contentY,
      logBox.contentWidth,
      logBox.contentHeight
    );

    // Draw status grid window (middle)
    const statusBox = this.drawBox(
      1,
      1 + logHeight,
      width - 1,
      statusHeight,
      " 📊 Encoder Status ",
      "green"
    );
    this.updateEncoderStatus(
      statusBox.contentX,
      statusBox.contentY,
      statusBox.contentWidth,
      statusBox.contentHeight
    );

    // Draw error window (bottom)
    const errorBox = this.drawBox(
      1,
      1 + logHeight + statusHeight,
      width - 1,
      errorHeight,
      " ❌ Errors ",
      "red"
    );
    this.updateErrorList(
      errorBox.contentX,
      errorBox.contentY,
      errorBox.contentWidth,
      errorBox.contentHeight
    );
  }

  async run() {
    this.running = true;

    // Initial render
    this.render();

    // Set up periodic updates with size check
    this.updateInterval = setInterval(() => {
      if (this.running) {
        const currentSize = this.getTerminalSize();
        // Force re-render if size changed or regular update interval
        if (
          currentSize.width !== this.lastTerminalSize.width ||
          currentSize.height !== this.lastTerminalSize.height
        ) {
          this.render();
        } else {
          this.render();
        }
      }
    }, 1000);

    // Keep the process running
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  close() {
    this.running = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Clear screen and show cursor
    console.log("\x1B[2J\x1B[H\x1B[?25h");
  }
}
