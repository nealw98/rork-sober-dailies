package com.nealwagner.soberdailies

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    override fun getMainComponentName(): String = "main"

    override fun onCreate(savedInstanceState: Bundle?) {
        if (Build.VERSION.SDK_INT >= 34) {
            // See https://reactnative.dev/docs/statusbar#android
            setTurnScreenOn(true)
        }
        
        try {
            super.onCreate(null)
        } catch (e: UnsatisfiedLinkError) {
            // Handle missing native libraries gracefully
            if (e.message?.contains("libreact_featureflagsjni.so") == true) {
                // Log the error but don't crash
                android.util.Log.w("MainActivity", "Feature flags library not available, continuing without it", e)
                // Call onCreate without the null parameter to use default behavior
                super.onCreate(savedInstanceState)
            } else {
                throw e
            }
        }
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
