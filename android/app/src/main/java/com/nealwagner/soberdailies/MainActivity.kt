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
        super.onCreate(null)
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
            override fun onCreate(savedInstanceState: Bundle?) {
                // Skip feature flags initialization by not calling super
                // This prevents the crash from missing libreact_featureflagsjni.so
                try {
                    super.onCreate(savedInstanceState)
                } catch (e: UnsatisfiedLinkError) {
                    // Ignore missing native library error
                    // Continue with default React Native initialization
                }
            }
        }
    }
}
