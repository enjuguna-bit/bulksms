import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getCarrier } from 'react-native-device-info';

export interface NetworkStatus {
    status: 'Excellent' | 'Good' | 'Poor' | 'None';
    type: string;
    operator: string;
    isConnected: boolean;
}

export function useNetworkStatus() {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        status: 'None',
        type: 'None',
        operator: 'Unknown',
        isConnected: false,
    });

    useEffect(() => {
        let mounted = true;

        async function fetchCarrier() {
            try {
                const carrier = await getCarrier();
                if (mounted) {
                    setNetworkStatus(prev => ({ ...prev, operator: carrier || 'Unknown' }));
                }
            } catch (e) {
                // Ignore
            }
        }

        fetchCarrier();

        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            if (!mounted) return;

            let status: NetworkStatus['status'] = 'None';

            if (state.isConnected) {
                if (state.type === 'wifi') {
                    // WiFi is usually excellent or good
                    status = (state.details as any)?.strength && (state.details as any).strength < 50 ? 'Good' : 'Excellent';
                } else if (state.type === 'cellular') {
                    const generation = (state.details as any)?.cellularGeneration;
                    if (generation === '4g' || generation === '5g') {
                        status = 'Excellent';
                    } else if (generation === '3g') {
                        status = 'Good';
                    } else {
                        status = 'Poor'; // 2G or unknown
                    }
                } else {
                    status = 'Good'; // Wired or other
                }
            }

            setNetworkStatus(prev => ({
                ...prev,
                status,
                type: state.type === 'cellular' ? (state.details as any)?.cellularGeneration?.toUpperCase() || 'Mobile' : state.type.toUpperCase(),
                isConnected: !!state.isConnected,
            }));
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    return networkStatus;
}
