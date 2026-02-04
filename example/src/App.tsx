import { useEffect, useMemo, useState } from 'react'
import {
    Alert,
    Platform,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

import {
    addUpdateDownloadedListener,
    checkForUpdate,
    completeFlexibleUpdate,
    startUpdate,
    type VersionCheckResult,
} from '@kallinen/react-native-in-app-update'

type UiState =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'result'; result: VersionCheckResult }
    | { status: 'starting'; mode: 'flexible' | 'immediate' }
    | { status: 'downloaded' }
    | { status: 'error'; message: string }

const Button = ({
    title,
    onPress,
    disabled,
}: {
    title: string
    onPress: () => void
    disabled?: boolean
}) => (
    <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 10,
            opacity: disabled ? 0.5 : 1,
            borderWidth: 1,
        }}
    >
        <Text style={{ fontSize: 16 }}>{title}</Text>
    </TouchableOpacity>
)

export default function App() {
    const [ui, setUi] = useState<UiState>({ status: 'idle' })

    useEffect(() => {
        if (Platform.OS !== 'android') return

        const unsub = addUpdateDownloadedListener(() => {
            setUi({ status: 'downloaded' })
            Alert.alert(
                'Update downloaded',
                'Restart the app to finish updating?',
                [
                    { text: 'Later', style: 'cancel' },
                    {
                        text: 'Restart now',
                        onPress: () => {
                            completeFlexibleUpdate().catch((e) =>
                                Alert.alert(
                                    'Failed to complete update',
                                    String(e?.message ?? e),
                                ),
                            )
                        },
                    },
                ],
                { cancelable: true },
            )
        })

        return unsub
    }, [])

    const allowed = useMemo(() => {
        if (ui.status !== 'result') return []
        return ui.result.status === 'update_available'
            ? ui.result.updateTypeAllowed
            : []
    }, [ui])

    const onCheck = async () => {
        try {
            setUi({ status: 'checking' })
            const res = await checkForUpdate({ prefer: 'flexible' })
            setUi({ status: 'result', result: res })
        } catch (e: any) {
            setUi({ status: 'error', message: String(e?.message ?? e) })
        }
    }

    const onStart = async (mode: 'flexible' | 'immediate') => {
        try {
            setUi({ status: 'starting', mode })
            await startUpdate(mode)
        } catch (e: any) {
            setUi({ status: 'error', message: String(e?.message ?? e) })
        }
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={{ padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: '600' }}>
                    In-App Update demo
                </Text>

                <Text style={{ fontSize: 14, opacity: 0.8 }}>
                    Note: In-app updates only work when installed from Google
                    Play (internal testing / closed / production). APK installs
                    won’t show updates.
                </Text>

                <View style={{ gap: 10, marginTop: 8 }}>
                    <Button
                        title="Check for update"
                        onPress={onCheck}
                        disabled={ui.status === 'checking'}
                    />

                    <Button
                        title="Start FLEXIBLE update"
                        onPress={() => onStart('flexible')}
                        disabled={
                            Platform.OS !== 'android' ||
                            !allowed.includes('flexible')
                        }
                    />

                    <Button
                        title="Start IMMEDIATE update"
                        onPress={() => onStart('immediate')}
                        disabled={
                            Platform.OS !== 'android' ||
                            !allowed.includes('immediate')
                        }
                    />
                </View>

                <View
                    style={{
                        marginTop: 16,
                        padding: 12,
                        borderWidth: 1,
                        borderRadius: 10,
                    }}
                >
                    <Text style={{ fontWeight: '600' }}>State</Text>
                    <Text style={{ marginTop: 6 }}>
                        {ui.status === 'idle' && 'Idle'}
                        {ui.status === 'checking' && 'Checking…'}
                        {ui.status === 'starting' &&
                            `Starting ${ui.mode} flow…`}
                        {ui.status === 'downloaded' &&
                            'Downloaded (waiting for completeUpdate)'}
                        {ui.status === 'error' && `Error: ${ui.message}`}
                        {ui.status === 'result' &&
                            JSON.stringify(ui.result, null, 2)}
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    )
}
