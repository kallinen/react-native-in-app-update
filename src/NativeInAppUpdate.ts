import { TurboModuleRegistry, type TurboModule } from 'react-native'

export type UpdateType = 'flexible' | 'immediate'

export type VersionCheckResult =
    | { status: 'no_update' }
    | { status: 'not_available' }
    | { status: 'update_available'; updateTypeAllowed: UpdateType[] }

export type CheckOptions = {
    prefer?: UpdateType
}

export interface Spec extends TurboModule {
    checkForUpdate(options: CheckOptions): Promise<VersionCheckResult>
    startUpdate(type: UpdateType): Promise<void>
    completeFlexibleUpdate(): Promise<void>
}

export default TurboModuleRegistry.getEnforcing<Spec>('InAppUpdate')
