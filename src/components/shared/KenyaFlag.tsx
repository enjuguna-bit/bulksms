import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';

export const KenyaFlag = ({ width = 24, height = 16, style }: { width?: number, height?: number, style?: any }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 24 16" style={style}>
            {/* Black Stripe */}
            <Rect x="0" y="0" width="24" height="4" fill="#000000" />
            {/* White Fimbriation */}
            <Rect x="0" y="4" width="24" height="1" fill="#FFFFFF" />
            {/* Red Stripe */}
            <Rect x="0" y="5" width="24" height="6" fill="#BB0000" />
            {/* White Fimbriation */}
            <Rect x="0" y="11" width="24" height="1" fill="#FFFFFF" />
            {/* Green Stripe */}
            <Rect x="0" y="12" width="24" height="4" fill="#006600" />

            {/* Shield and Spears (Simplified) */}
            <Path d="M12 2C10 2 8 4 8 8V11C8 13 10 14 12 14C14 14 16 13 16 11V8C16 4 14 2 12 2Z" fill="#BB0000" />
        </Svg>
    );
};
