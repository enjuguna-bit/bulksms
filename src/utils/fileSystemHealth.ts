import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Logger from './logger';

export class FileSystemHealth {

    private static TEST_FILE = 'fs_health_check.tmp';

    /**
     * Comprehensive file system health check
     * 1. Check storage permissions (implicitly via write test)
     * 2. Check available space (if possible)
     * 3. Verify working directory
     */
    static async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
        Logger.info('FileSystemHealth', 'Starting health check...');

        try {
            // 1. Verify Storage Access check by writing a small file
            const path = `${RNFS.DocumentDirectoryPath}/${this.TEST_FILE}`;
            const testData = `Health Check ${Date.now()}`;

            await RNFS.writeFile(path, testData, 'utf8');

            // Verify read
            const readData = await RNFS.readFile(path, 'utf8');
            if (readData !== testData) {
                throw new Error('Read/Write integrity check failed');
            }

            // Cleanup
            await RNFS.unlink(path);

            Logger.info('FileSystemHealth', 'Health check passed');
            return { healthy: true };

        } catch (error: any) {
            Logger.error('FileSystemHealth', 'Health check failed', error);

            let userMessage = 'Storage access failed';
            if (error.message.includes('EACCES') || error.message.includes('permission')) {
                userMessage = 'Missing storage permissions';
            } else if (error.message.includes('ENOSPC')) {
                userMessage = 'Device storage full';
            }

            return {
                healthy: false,
                error: `${userMessage}: ${error.message}`
            };
        }
    }

    /**
     * Check if enough disk space is available (approximate)
     * @param minMegabytes Minimum required MB
     */
    static async checkAvailableSpace(minMegabytes: number = 50): Promise<boolean> {
        try {
            const info = await RNFS.getFSInfo();
            const freeMB = info.freeSpace / (1024 * 1024);

            if (freeMB < minMegabytes) {
                Logger.warn('FileSystemHealth', `Low disk space: ${freeMB.toFixed(2)}MB`);
                return false;
            }
            return true;
        } catch (e) {
            Logger.warn('FileSystemHealth', 'Failed to check disk space', e);
            return true; // Assume true if check fails to avoid blocking
        }
    }
}
