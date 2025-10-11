package com.nealwagner.soberdailies

import android.os.Build
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.soloader.SoLoader

class MainActivity : ReactActivity() {
    companion object {
        init {
            // Explicitly load React Native feature flags library
            // This fixes the SoLoaderDSONotFoundError for libreact_featureflagsjni.so
            try {
                System.loadLibrary("react_featureflagsjni")
                Log.d("MainActivity", "Successfully loaded react_featureflagsjni library")
            } catch (e: UnsatisfiedLinkError) {
                Log.e("MainActivity", "Failed to load react_featureflagsjni library", e)
                // Don't crash - React Native will try to load it again through SoLoader
                // This is just a preemptive attempt
            }
        }
    }

    override fun getMainComponentName(): String = "main"

    override fun onCreate(savedInstanceState: Bundle?) {
        if (Build.VERSION.SDK_INT >= 34) {
            // See https://reactnative.dev/docs/statusbar#android
            setTurnScreenOn(true)
        }
        super.onCreate(null)
    }
}
