import React from 'react';
import { View } from 'react-native';

const WebView = React.forwardRef((props, ref) => {
    return <View testID="mock-webview" {...props} />;
});

export { WebView };
export default WebView;
