use std::sync::{Arc, Mutex};
use std::thread;

// OAuth callback server state
static OAUTH_CALLBACK_PORT: u16 = 37812;

// Tauri command to get the OAuth callback URL
#[tauri::command]
fn get_oauth_callback_url() -> String {
    format!("http://localhost:{}/oauth-callback", OAUTH_CALLBACK_PORT)
}

// Start OAuth callback HTTP server
fn start_oauth_server(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let server = tiny_http::Server::http(format!("127.0.0.1:{}", OAUTH_CALLBACK_PORT)).unwrap();
        println!("OAuth callback server started on port {}", OAUTH_CALLBACK_PORT);

        for request in server.incoming_requests() {
            let url = request.url().to_string();
            println!("OAuth callback request: {}", url);

            // Serve a simple HTML page that copies token to clipboard
            let html = r#"
<!DOCTYPE html>
<html>
<head>
    <title>Dropbox Connected!</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            text-align: center;
        }
        .success-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #333; margin: 0 0 10px 0; }
        p { color: #666; line-height: 1.6; margin: 10px 0; }
        .highlight {
            background: #f0f0f0;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 600;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1 id="status">Successfully Connected!</h1>
        <p id="message">Token copied to clipboard!</p>
        <div class="highlight">Switch back to Calendarly to finish connecting</div>
        <p style="font-size: 14px; color: #999;">You can close this tab after switching back</p>
    </div>
    <script>
        // Extract full URL with token
        const fullUrl = window.location.href;
        const hash = window.location.hash;

        if (hash && hash.includes('access_token')) {
            // Copy full URL to clipboard
            navigator.clipboard.writeText(fullUrl).then(() => {
                console.log('Token URL copied to clipboard');
            }).catch((err) => {
                console.error('Failed to copy to clipboard:', err);
                document.getElementById('message').textContent = 'Could not copy automatically. Please switch back to Calendarly.';
            });
        } else {
            document.querySelector('.success-icon').textContent = '❌';
            document.getElementById('status').textContent = 'Connection Failed';
            document.getElementById('message').textContent = 'No access token found. Please try again.';
            document.querySelector('.highlight').style.display = 'none';
        }
    </script>
</body>
</html>
            "#;

            let response = tiny_http::Response::from_string(html)
                .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());

            let _ = request.respond(response);
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--flag1", "--flag2"])))
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![get_oauth_callback_url])
    .setup(|app| {
      // Start OAuth callback server
      start_oauth_server(app.handle().clone());

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
