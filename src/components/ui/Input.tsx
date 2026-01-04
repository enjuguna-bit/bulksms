import React from 'react';
import { TextInput, TextInputProps, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useThemeSettings } from '@/theme/ThemeProvider';

export interface InputProps extends TextInputProps {
    style?: StyleProp<TextStyle>;
}

export const Input: React.FC<InputProps> = ({ style, ...props }) => {
    const { colors } = useThemeSettings();

    return (
        <TextInput
            placeholderTextColor={colors.subText}
            style={[
                styles.input,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    color: colors.text,
                },
                style,
            ]}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
});
