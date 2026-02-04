import { Platform } from 'react-native'
import NativeInAppUpdate, {
    type CheckOptions,
    type UpdateType,
    type VersionCheckResult,
} from './NativeInAppUpdate'
import { NativeEventEmitter } from 'react-native'

export type { CheckOptions, UpdateType, VersionCheckResult }

export const checkForUpdate = async (
    options: CheckOptions = {},
): Promise<VersionCheckResult> => {
    if (Platform.OS !== 'android') return { status: 'not_available' }
    return NativeInAppUpdate.checkForUpdate(options)
}

export const startUpdate = async (type: UpdateType): Promise<void> => {
    if (Platform.OS !== 'android') return
    return NativeInAppUpdate.startUpdate(type)
}

export const completeFlexibleUpdate = async (): Promise<void> => {
    if (Platform.OS !== 'android') return
    return NativeInAppUpdate.completeFlexibleUpdate()
}

const emitter =
    Platform.OS === 'android' ? new NativeEventEmitter(NativeInAppUpdate as any) : null

export const addUpdateDownloadedListener = (cb: () => void) => {
    if (!emitter) return () => {}
    const sub = emitter.addListener('in_app_update_downloaded', cb)
    return () => sub.remove()
}
