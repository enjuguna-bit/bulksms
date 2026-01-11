package com.bulksms;

import android.content.Context;
import android.util.Log;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;

public class LibCheckerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "LibChecker";
    private final ReactApplicationContext reactContext;

    public LibCheckerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "RNLibChecker";
    }

    @ReactMethod
    public boolean hasLibrary(String libName) {
        try {
            System.loadLibrary(libName);
            return true;
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "Library not found or failed to load: " + libName, e);
            return false;
        }
    }
}
