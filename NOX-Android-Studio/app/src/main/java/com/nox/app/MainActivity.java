package com.nox.app;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Window;
import android.graphics.Color;
import android.util.Log;
import android.widget.Toast;
import android.util.Base64;
import android.os.Handler;
import android.os.Looper;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int CAMERA_REQUEST = 42;
    private static final int FILE_CHOOSER_REQUEST = 43;
    private static final String TAG = "NOX";
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setStatusBarColor(Color.rgb(7, 9, 15));
        getWindow().setNavigationBarColor(Color.rgb(7, 9, 15));

        webView = new WebView(this);
        setContentView(webView);
        configureWebView();
        webView.loadUrl("file:///android_asset/web/index.html");

        if (android.os.Build.VERSION.SDK_INT >= 23 &&
                checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
        }
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            s.setSafeBrowsingEnabled(false);
        }
        s.setUserAgentString(s.getUserAgentString() + " NOX-Android/1.0");

        webView.setBackgroundColor(Color.rgb(7, 9, 15));
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    Log.e(TAG, "WebView main frame error: " + error.getDescription());
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                try {
                    if (url != null && url.startsWith("data:")) {
                        saveDataUrl(url);
                        return;
                    }
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimeType);
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    request.allowScanningByMediaScanner();
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    dm.enqueue(request);
                    Toast.makeText(MainActivity.this, "Download gestartet", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "Download failed", e);
                    Toast.makeText(MainActivity.this, "Download fehlgeschlagen", Toast.LENGTH_SHORT).show();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (android.os.Build.VERSION.SDK_INT >= 21) {
                        request.grant(request.getResources());
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams
            ) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                String[] accept = fileChooserParams != null ? fileChooserParams.getAcceptTypes() : null;
                boolean wantsImage = false;
                boolean wantsJson = false;
                if (accept != null) {
                    for (String a : accept) {
                        if (a == null) continue;
                        String x = a.toLowerCase();
                        if (x.contains("image") || x.equals("*/*")) wantsImage = true;
                        if (x.contains("json") || x.contains("text") || x.equals("*/*")) wantsJson = true;
                    }
                }
                if (!wantsImage && !wantsJson) {
                    wantsImage = true;
                    wantsJson = true;
                }

                Intent chooser;
                if (wantsImage && !wantsJson) {
                    Intent takePicture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    Intent pickGallery = new Intent(Intent.ACTION_GET_CONTENT);
                    pickGallery.addCategory(Intent.CATEGORY_OPENABLE);
                    pickGallery.setType("image/*");
                    chooser = Intent.createChooser(pickGallery, "Foto wählen");
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePicture});
                } else if (wantsJson && !wantsImage) {
                    Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                    pick.addCategory(Intent.CATEGORY_OPENABLE);
                    pick.setType("application/json");
                    pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "*/*"});
                    chooser = Intent.createChooser(pick, "Backup-Datei wählen");
                } else {
                    Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                    pick.addCategory(Intent.CATEGORY_OPENABLE);
                    pick.setType("*/*");
                    Intent takePicture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    chooser = Intent.createChooser(pick, "Datei wählen");
                    chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePicture});
                }

                try {
                    startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    Log.e(TAG, "File chooser failed", e);
                    return false;
                }
                return true;
            }
        });
    }

    private void saveDataUrl(String url) {
        try {
            int comma = url.indexOf(',');
            if (comma < 0) return;
            String meta = url.substring(5, comma);
            String data = url.substring(comma + 1);
            byte[] bytes;
            if (meta.contains(";base64")) {
                bytes = Base64.decode(data, Base64.DEFAULT);
            } else {
                bytes = Uri.decode(data).getBytes("UTF-8");
            }
            String name = "nox-backup-" + System.currentTimeMillis() + ".json";
            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (dir != null && !dir.exists()) dir.mkdirs();
            File out = new File(dir, name);
            FileOutputStream fos = new FileOutputStream(out);
            fos.write(bytes);
            fos.close();
            Intent scan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
            scan.setData(Uri.fromFile(out));
            sendBroadcast(scan);
            new Handler(Looper.getMainLooper()).post(() ->
                    Toast.makeText(MainActivity.this, "Gespeichert: Downloads/" + name, Toast.LENGTH_LONG).show()
            );
        } catch (Exception e) {
            Log.e(TAG, "saveDataUrl failed", e);
            new Handler(Looper.getMainLooper()).post(() ->
                    Toast.makeText(MainActivity.this, "Speichern fehlgeschlagen", Toast.LENGTH_SHORT).show()
            );
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }
        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK) {
            if (data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            } else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                results = new Uri[]{data.getClipData().getItemAt(0).getUri()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
