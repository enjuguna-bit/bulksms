import React from 'react';
import { View } from 'react-native';

const LinearGradient = (props: any) => {
    const { children, ...otherProps } = props;
    return <View {...otherProps}>{children}</View>;
};

export default LinearGradient;
