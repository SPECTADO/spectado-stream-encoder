import { SessionStatus } from "/src/sessionManager.ts";
import { SessionManagerItem } from "/src/types/sessionManager.d.ts";
import logger from "/src/logger.ts";

let server: Deno.HttpServer | null = null;

export function startWebServer(port: number = 8080): void {
  if (server) {
    logger.debug("Web server already running");
    return;
  }

  const handler = (request: Request): Response => {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/status") {
      return new Response(generateStatusHTML(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    if (url.pathname === "/api/status") {
      return new Response(
        JSON.stringify({
          streams: globalThis.streams || [],
          timestamp: new Date().toISOString(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    return new Response("Not Found", { status: 404 });
  };

  server = Deno.serve({ port }, handler);
  logger.log(`Web UI started on http://localhost:${port}`);
}

export function stopWebServer(): void {
  if (server) {
    server.shutdown();
    server = null;
    logger.log("Web server stopped");
  }
}

function generateStatusHTML(): string {
  const streams = globalThis.streams || [];
  const now = new Date().toLocaleString();

  const getStatusIcon = (status: SessionStatus): string => {
    switch (status) {
      case SessionStatus.live:
        return "✅";
      case SessionStatus.connecting:
        return "🔄";
      case SessionStatus.error:
        return "❌";
      case SessionStatus.stopped:
        return "⏹️";
      default:
        return "❓";
    }
  };

  const getStatusText = (status: SessionStatus): string => {
    switch (status) {
      case SessionStatus.live:
        return "Live";
      case SessionStatus.connecting:
        return "Connecting";
      case SessionStatus.error:
        return "Error";
      case SessionStatus.stopped:
        return "Stopped";
      default:
        return "Unknown";
    }
  };

  const getStatusClass = (status: SessionStatus): string => {
    switch (status) {
      case SessionStatus.live:
        return "status-live";
      case SessionStatus.connecting:
        return "status-connecting";
      case SessionStatus.error:
        return "status-error";
      case SessionStatus.stopped:
        return "status-stopped";
      default:
        return "status-unknown";
    }
  };

  // Sort streams: error/connecting first, then stopped, then live
  const sortedStreams = streams.sort((a, b) => {
    const getStatusPriority = (status: SessionStatus): number => {
      switch (status) {
        case SessionStatus.error:
          return 0; // Highest priority - show first
        case SessionStatus.connecting:
          return 1; // Second priority
        case SessionStatus.stopped:
          return 2; // Third priority
        case SessionStatus.live:
          return 3; // Lowest priority - show last
        default:
          return 4; // Unknown status last
      }
    };

    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);

    // If same priority, sort by stream ID alphabetically
    if (priorityA === priorityB) {
      return a.id.localeCompare(b.id);
    }

    return priorityA - priorityB;
  });

  const streamsRows = sortedStreams
    .map(
      (stream: SessionManagerItem) => `
    <tr class="${getStatusClass(stream.status)}">
      <td>${stream.id}</td>
      <td>
        <span class="status-icon">${getStatusIcon(stream.status)}</span>
        ${getStatusText(stream.status)}
      </td>
      <td>${stream.encoder.bitrate || "N/A"} kbps</td>
      <td>${stream.encoder.format || "N/A"}</td>
      <td>${stream.encoder.icecast.mount}</td>
      <td>${stream.encoder.icecast.server}</td>
    </tr>
  `
    )
    .join("");

  const liveCount = streams.filter(
    (s) => s.status === SessionStatus.live
  ).length;
  const errorCount = streams.filter(
    (s) => s.status === SessionStatus.error
  ).length;
  const stoppedCount = streams.filter(
    (s) =>
      s.status === SessionStatus.stopped ||
      s.status === SessionStatus.connecting
  ).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPECTADO Stream Encoder Status</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        
        .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .summary-card {
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            min-width: 120px;
        }
        
        .summary-card h3 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
        }
        
        .summary-card .number {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        
        .live { color: #28a745; }
        .error { color: #dc3545; }
        .stopped { color: #6c757d; }
        
        .config-section {
            margin-bottom: 20px;
        }
        
        .config-header {
            background: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-bottom: 2px solid #f8f9fa;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            transition: background-color 0.2s ease;
        }
        
        .config-header:hover {
            background-color: #f8f9fa;
        }
        
        .config-header h2 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        
        .config-toggle {
            font-size: 14px;
            color: #6c757d;
            transition: transform 0.3s ease;
        }
        
        .config-section.collapsed .config-toggle {
            transform: rotate(-90deg);
        }
        
        .config-section.collapsed .config-header {
            border-radius: 8px;
            border-bottom: none;
        }
        
        .config-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 15px;
            background: white;
            padding: 20px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: max-height 0.3s ease, padding 0.3s ease;
            overflow: hidden;
            max-height: 1000px;
        }
        
        .config-section.collapsed .config-cards {
            max-height: 0;
            padding: 0 20px;
        }
        
        .config-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 15px;
        }
        
        .config-card h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #495057;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 8px;
        }
        
        .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 4px 0;
        }
        
        .config-item:last-child {
            margin-bottom: 0;
        }
        
        .config-label {
            font-weight: 500;
            color: #6c757d;
            font-size: 14px;
        }
        
        .config-value {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 13px;
            color: #495057;
            max-width: 60%;
            word-break: break-all;
            text-align: right;
        }
        
        .table-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #555;
        }
        
        tr:hover {
            background-color: #f8f9fa;
        }
        
        .status-icon {
            margin-right: 5px;
        }
        
        .status-live {
            background-color: #d4edda;
        }
        
        .status-error {
            background-color: #f8d7da;
        }
        
        .status-connecting {
            background-color: #fff3cd;
        }
        
        .status-stopped {
            background-color: #e2e3e5;
        }
        
        .last-updated {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
        
        .auto-refresh {
            color: #007bff;
            cursor: pointer;
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .summary {
                justify-content: center;
            }
            
            .summary-card {
                flex: 1;
                min-width: 100px;
            }
            
            .config-cards {
                grid-template-columns: 1fr;
                padding: 15px;
            }
            
            .config-card {
                padding: 12px;
            }
            
            .config-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
            
            .config-value {
                max-width: 100%;
                text-align: left;
            }
            
            table {
                font-size: 14px;
            }
            
            th, td {
                padding: 8px 10px;
            }
        }
    </style>
    <script>
        let refreshInterval;
        
        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                window.location.reload();
            }, 5000);
        }
        
        function stopAutoRefresh() {
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
            }
        }
        
        function toggleAutoRefresh() {
            const refreshElement = document.querySelector('.auto-refresh');
            if (refreshElement.textContent.includes('Disable')) {
                refreshElement.textContent = 'Enable Auto-refresh';
                stopAutoRefresh();
            } else {
                refreshElement.textContent = 'Disable Auto-refresh (5s)';
                startAutoRefresh();
            }
        }
        
        function toggleConfigSection() {
            const configSection = document.querySelector('.config-section');
            if (configSection) {
                configSection.classList.toggle('collapsed');
                
                // Save the collapsed state in localStorage
                const isCollapsed = configSection.classList.contains('collapsed');
                localStorage.setItem('configSectionCollapsed', isCollapsed.toString());
            }
        }
        
        window.addEventListener('load', () => {
            // Auto-start refresh on page load
            startAutoRefresh();
            document.querySelector('.auto-refresh').addEventListener('click', toggleAutoRefresh);
            
            // Restore configuration section collapsed state
            const configSection = document.querySelector('.config-section');
            const isCollapsed = localStorage.getItem('configSectionCollapsed') === 'true';
            if (isCollapsed && configSection) {
                configSection.classList.add('collapsed');
            }
        });
    </script>
</head>
<body>
    <div class="header">
        <h1>SPECTADO Stream Encoder Status</h1>
        <p>Real-time monitoring of audio stream encoders</p>
    </div>
    
    <div class="summary">
        <div class="summary-card">
            <h3>Live Streams</h3>
            <p class="number live">${liveCount}</p>
        </div>
        <div class="summary-card">
            <h3>Errors</h3>
            <p class="number error">${errorCount}</p>
        </div>
        <div class="summary-card">
            <h3>Stopped</h3>
            <p class="number stopped">${stoppedCount}</p>
        </div>
        <div class="summary-card">
            <h3>Total</h3>
            <p class="number">${streams.length}</p>
        </div>
    </div>
    
    <div class="config-section">
        <div class="config-header" onclick="toggleConfigSection()">
            <h2>Configuration</h2>
            <span class="config-toggle">▼</span>
        </div>
        <div class="config-cards" id="config-content">
            ${
              globalThis.config
                ? globalThis.config.encoders
                    .map(
                      (encoder) => `
            <div class="config-card">
                <h3>${encoder.id}</h3>
                <div class="config-item">
                    <span class="config-label">Audio Card:</span>
                    <span class="config-value">${
                      encoder.captureAudioCard
                    }</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Format:</span>
                    <span class="config-value">${encoder.format || "mp3"}</span>
                </div>
                <div class="config-item">
                    <span class="config-label">Bitrate:</span>
                    <span class="config-value">${
                      encoder.bitrate || 128
                    } kbps</span>
                </div>
                ${
                  encoder.audioFilter
                    ? `
                <div class="config-item">
                    <span class="config-label">Audio Filter:</span>
                    <span class="config-value">${encoder.audioFilter}</span>
                </div>
                `
                    : ""
                }
            </div>
            `
                    )
                    .join("")
                : "<p>Configuration not loaded</p>"
            }
        </div>
    </div>
    
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Stream ID</th>
                    <th>Status</th>
                    <th>Bitrate</th>
                    <th>Format</th>
                    <th>Mount</th>
                    <th>Server</th>
                </tr>
            </thead>
            <tbody>
                ${
                  streamsRows ||
                  '<tr><td colspan="6" style="text-align: center; color: #666; padding: 40px;">No streams configured</td></tr>'
                }
            </tbody>
        </table>
    </div>
    
    <div class="last-updated">
        Last updated: ${now} | <span class="auto-refresh">Disable Auto-refresh (5s)</span>
    </div>
</body>
</html>`;
}
