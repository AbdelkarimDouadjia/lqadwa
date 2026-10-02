package dz.lqidwa.pilot;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.provider.Settings;
import java.util.Locale;

/** Native launch screen followed by native application views. */
public final class LaunchActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable openApp = () -> {
        if (isFinishing()) return;
        startActivity(new Intent(this, MainActivity.class));
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    };
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        // Android 12+ supplies the branded system animation: avoid a second splash.
        if (android.os.Build.VERSION.SDK_INT >= 31) { openApp.run(); return; }
        getWindow().setStatusBarColor(Color.rgb(18, 51, 68));
        getWindow().setNavigationBarColor(Color.rgb(18, 51, 68));
        LinearLayout screen = new LinearLayout(this);
        screen.setOrientation(LinearLayout.VERTICAL); screen.setGravity(Gravity.CENTER);
        screen.setBackgroundColor(Color.rgb(18, 51, 68)); screen.setPadding(dp(32), dp(32), dp(32), dp(32));
        ImageView logo = new ImageView(this); logo.setImageResource(R.drawable.luqya); logo.setContentDescription("LQADWA");
        android.graphics.drawable.GradientDrawable frame = new android.graphics.drawable.GradientDrawable(); frame.setColor(Color.rgb(18, 51, 68)); frame.setCornerRadius(dp(28)); logo.setBackground(frame); logo.setClipToOutline(true);
        screen.addView(logo, new LinearLayout.LayoutParams(dp(112), dp(112)));
        TextView title = new TextView(this); title.setText("LQADWA"); title.setTextColor(Color.WHITE); title.setTextSize(30); title.setLetterSpacing(.12f); title.setGravity(Gravity.CENTER); title.setPadding(0, dp(24), 0, dp(10)); screen.addView(title);
        String lang = getSharedPreferences("MainActivity", 0).getString("language", Locale.getDefault().getLanguage());
        TextView message = new TextView(this); message.setText(lang.equals("ar") ? "دواؤك أقرب إليك" : lang.equals("fr") ? "Votre médicament, plus près de vous" : lang.equals("kab") ? "Ddwa-inek aqreb ɣur-k." : "Your medicine, closer to you"); message.setTextColor(Color.rgb(167, 220, 208)); message.setTextSize(16); message.setGravity(Gravity.CENTER); screen.addView(message);
        ProgressBar progress = new ProgressBar(this); progress.setIndeterminateTintList(android.content.res.ColorStateList.valueOf(Color.rgb(87, 228, 190))); LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(28), dp(28)); params.topMargin = dp(36); screen.addView(progress, params);
        setContentView(screen);
        boolean animate = Settings.Global.getFloat(getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) != 0f;
        if (animate) { logo.setAlpha(0f); logo.setScaleX(.88f); logo.setScaleY(.88f); logo.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(350).start(); }
        handler.postDelayed(openApp, animate ? 650 : 0);
    }
    @Override protected void onDestroy() { handler.removeCallbacks(openApp); super.onDestroy(); }
}
