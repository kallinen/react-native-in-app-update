package com.inappupdate

import android.app.Activity
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability


class InAppUpdateModule(private val reactContext: ReactApplicationContext) :
  NativeInAppUpdateSpec(reactContext) {

  companion object {
    const val NAME = NativeInAppUpdateSpec.NAME
  }

  private val appUpdateManager: AppUpdateManager by lazy {
    AppUpdateManagerFactory.create(reactContext)
  }

  private var lastInfo: AppUpdateInfo? = null

  private var listener: InstallStateUpdatedListener? = null

  private fun emit(event: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, null)
  }

  @ReactMethod
  override fun checkForUpdate(options: ReadableMap, promise: Promise) {
    appUpdateManager.appUpdateInfo
      .addOnSuccessListener { info ->
        lastInfo = info

        val availability = info.updateAvailability()
        if (availability != UpdateAvailability.UPDATE_AVAILABLE) {
          promise.resolve(Arguments.createMap().apply { putString("status", "no_update") })
          return@addOnSuccessListener
        }

        val allowed =
          Arguments.createArray().apply {
            if (info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) pushString("flexible")
            if (info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE))
              pushString("immediate")
          }

        promise.resolve(
          Arguments.createMap().apply {
            putString("status", "update_available")
            putArray("updateTypeAllowed", allowed)
          }
        )
      }
      .addOnFailureListener {
        // Often means not Play-installed / Play services missing / etc.
        promise.resolve(Arguments.createMap().apply { putString("status", "not_available") })
      }
  }

  @ReactMethod
  override fun startUpdate(type: String, promise: Promise) {
    val activity: Activity =
      reactApplicationContext.getCurrentActivity()
        ?: run {
          promise.reject("NO_ACTIVITY", "No current Activity")
          return
        }

    val info = lastInfo
    if (info == null) {
      promise.reject("NO_INFO", "Call checkForUpdate() first")
      return
    }

    val updateType =
      when (type) {
        "immediate" -> AppUpdateType.IMMEDIATE
        else -> AppUpdateType.FLEXIBLE
      }

    if (!info.isUpdateTypeAllowed(updateType)) {
      promise.reject("NOT_ALLOWED", "Update type not allowed")
      return
    }

    if (updateType == AppUpdateType.FLEXIBLE) {
      // Register listener to notify JS when downloaded
      if (listener == null) {
        listener = InstallStateUpdatedListener { state ->
          if (state.installStatus() == InstallStatus.DOWNLOADED) {
            emit("in_app_update_downloaded")
          }
        }
        appUpdateManager.registerListener(listener!!)
      }
    }

    try {
      val options = AppUpdateOptions.newBuilder(updateType).build()

      appUpdateManager.startUpdateFlowForResult(info, activity, options, 10001)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  override fun completeFlexibleUpdate(promise: Promise) {
    try {
      appUpdateManager.completeUpdate()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("COMPLETE_FAILED", e.message, e)
    }
  }

  override fun invalidate() {
    listener?.let { appUpdateManager.unregisterListener(it) }
    listener = null
    super.invalidate()
  }
}
