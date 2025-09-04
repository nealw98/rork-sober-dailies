package com.recoverytools.aasoberdailies

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
    override fun getMainComponentName(): String = "main"

    override fun onCreate(savedInstanceState: Bundle?) {
        if (Build.VERSION.SDK_INT >= 34) {
            // See https://reactnative.dev/docs/statusbar#android
            setTurnScreenOn(true)
        }
        super.onCreate(null)
    }
}
