package com.symempire.symloanadmin;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity implements View.OnTouchListener, Runnable {

    public static final String ADMIN_URL = "https://symloan.best-travel.ltd/admin";
    public static final int PERMISSION_REQUEST_CODE = 1001;
    public static final int FILE_CHOOSER_REQUEST_CODE = 2001;

    public WebView mWebView;
    public ProgressBar mProgressBar;
    public ProgressBar mPullRefreshSpinner;
    public ValueCallback<Uri[]> mFilePathCallback;
    public String mCameraPhotoPath;

    private float mTouchStartY = 0f;
    private boolean mIsPullRefreshing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(0xFF06090F);
        rootLayout.setFitsSystemWindows(true);

        int statusBarHeight = 0;
        int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resId > 0) {
            statusBarHeight = getResources().getDimensionPixelSize(resId);
        }
        if (statusBarHeight > 0) {
            rootLayout.setPadding(0, statusBarHeight, 0, 0);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(0xFF06090F);
        }

        mWebView = new WebView(this);
        mWebView.setBackgroundColor(0xFF06090F);
        rootLayout.addView(mWebView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        // Horizontal top loading bar
        mProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        mProgressBar.setMax(100);
        mProgressBar.setProgress(0);
        mProgressBar.setVisibility(View.GONE);
        FrameLayout.LayoutParams pbParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                8
        );
        rootLayout.addView(mProgressBar, pbParams);

        // Circular pull-to-refresh spinner
        mPullRefreshSpinner = new ProgressBar(this);
        mPullRefreshSpinner.setIndeterminate(true);
        mPullRefreshSpinner.setVisibility(View.GONE);
        FrameLayout.LayoutParams spinnerParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        );
        spinnerParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        spinnerParams.topMargin = 50;
        rootLayout.addView(mPullRefreshSpinner, spinnerParams);

        setContentView(rootLayout);

        setupWebView();
        mWebView.setOnTouchListener(this);
        checkAndRequestPermissions();

        if (savedInstanceState == null) {
            mWebView.loadUrl(ADMIN_URL);
        } else {
            mWebView.restoreState(savedInstanceState);
        }
    }

    private void setupWebView() {
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " SYM-Admin-Native-Android-App/2.6.0 (Android; S.E.P.) Mobile");

        mWebView.setWebViewClient(new AdminWebViewClient(this));
        mWebView.setWebChromeClient(new AdminWebChromeClient(this));
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        switch (event.getAction()) {
            case MotionEvent.ACTION_DOWN:
                mTouchStartY = event.getY();
                mIsPullRefreshing = false;
                break;
            case MotionEvent.ACTION_MOVE:
                if (mWebView != null && mWebView.getScrollY() == 0) {
                    float deltaY = event.getY() - mTouchStartY;
                    if (deltaY > 200 && !mIsPullRefreshing) {
                        mIsPullRefreshing = true;
                        triggerAdminRefresh();
                    }
                }
                break;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                mIsPullRefreshing = false;
                break;
        }
        return false;
    }

    public void triggerAdminRefresh() {
        if (mPullRefreshSpinner != null) {
            mPullRefreshSpinner.setVisibility(View.VISIBLE);
        }
        if (mWebView != null) {
            mWebView.evaluateJavascript(
                    "if (typeof window.refreshAdminDashboard === 'function') { window.refreshAdminDashboard(); } else { window.location.reload(); }",
                    null
            );
            mWebView.postDelayed(this, 1500);
        }
    }

    @Override
    public void run() {
        if (mPullRefreshSpinner != null) {
            mPullRefreshSpinner.setVisibility(View.GONE);
        }
    }

    public static class AdminWebViewClient extends WebViewClient {
        private final MainActivity mActivity;

        public AdminWebViewClient(MainActivity activity) {
            this.mActivity = activity;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            if (url == null) return false;

            if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") ||
                url.startsWith("tg:") || url.startsWith("whatsapp:") ||
                url.contains("t.me") || url.contains("telegram.me")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    mActivity.startActivity(intent);
                    return true;
                } catch (Exception e) {
                    Toast.makeText(mActivity, "Cannot open external application.", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }

            if (url.endsWith(".apk")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    mActivity.startActivity(intent);
                    return true;
                } catch (Exception ignored) {}
            }

            return false;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            if (mActivity.mProgressBar != null) {
                mActivity.mProgressBar.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (mActivity.mProgressBar != null) {
                mActivity.mProgressBar.setVisibility(View.GONE);
            }
            if (mActivity.mPullRefreshSpinner != null) {
                mActivity.mPullRefreshSpinner.setVisibility(View.GONE);
            }
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request != null && request.isForMainFrame()) {
                String errorHtml = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><style>body{background:#06090F;color:#F8FAFC;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;box-sizing:border-box;text-align:center}.card{background:#0E1726;padding:28px;border-radius:18px;border:1px solid #F59E0B;max-width:380px}h2{color:#F59E0B;margin-top:0}button{background:#F59E0B;color:#000;border:none;padding:12px 24px;border-radius:10px;font-weight:bold;font-size:14px;cursor:pointer;margin-top:16px}</style></head><body><div class=\"card\"><h2>Connection Failed</h2><p>Unable to connect to SYM EMPIRE Admin Engine. Please check your internet connection and retry.</p><button onclick=\"location.reload()\">Retry Connection</button></div></body></html>";
                view.loadDataWithBaseURL(null, errorHtml, "text/html", "utf-8", null);
            }
        }
    }

    public static class AdminWebChromeClient extends WebChromeClient {
        private final MainActivity mActivity;

        public AdminWebChromeClient(MainActivity activity) {
            this.mActivity = activity;
        }

        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            if (mActivity.mProgressBar != null) {
                mActivity.mProgressBar.setProgress(newProgress);
                if (newProgress >= 100) {
                    mActivity.mProgressBar.setVisibility(View.GONE);
                }
            }
        }

        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            if (request != null) {
                request.grant(request.getResources());
            }
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                         FileChooserParams fileChooserParams) {
            if (mActivity.mFilePathCallback != null) {
                mActivity.mFilePathCallback.onReceiveValue(null);
            }
            mActivity.mFilePathCallback = filePathCallback;

            Intent takePictureIntent = null;
            File photoFile = null;
            try {
                photoFile = mActivity.createImageFile();
                if (photoFile != null) {
                    mActivity.mCameraPhotoPath = "file:" + photoFile.getAbsolutePath();
                    takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, Uri.fromFile(photoFile));
                }
            } catch (Exception ex) {
                mActivity.mCameraPhotoPath = null;
            }

            Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
            contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
            contentSelectionIntent.setType("image/*");

            Intent[] intentArray;
            if (takePictureIntent != null) {
                intentArray = new Intent[]{takePictureIntent};
            } else {
                intentArray = new Intent[0];
            }

            Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
            chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
            chooserIntent.putExtra(Intent.EXTRA_TITLE, "Select Document or Capture Photo");
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);

            mActivity.startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST_CODE);
            return true;
        }
    }

    public File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "SYM_ADMIN_CAPTURE_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (storageDir == null) {
            storageDir = getFilesDir();
        }
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (mFilePathCallback == null) return;

            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK) {
                if (data == null || data.getData() == null) {
                    if (mCameraPhotoPath != null) {
                        results = new Uri[]{Uri.parse(mCameraPhotoPath)};
                    }
                } else {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    } else if (data.getClipData() != null) {
                        ClipData clipData = data.getClipData();
                        results = new Uri[clipData.getItemCount()];
                        for (int i = 0; i < clipData.getItemCount(); i++) {
                            results[i] = clipData.getItemAt(i).getUri();
                        }
                    }
                }
            }

            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    private void checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> needed = new ArrayList<String>();
            if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.CAMERA);
            }
            if (Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission(Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.READ_MEDIA_IMAGES);
                }
            } else {
                if (checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                }
            }
            if (!needed.isEmpty()) {
                requestPermissions(needed.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && mWebView != null && mWebView.canGoBack()) {
            mWebView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}
