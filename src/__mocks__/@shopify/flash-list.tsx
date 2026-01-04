import React from 'react';
import { View } from 'react-native';

const FlashList = React.forwardRef((props: any, ref) => {
    const { data, renderItem, ListEmptyComponent, ListHeaderComponent } = props;

    if (!data || data.length === 0) {
        if (ListEmptyComponent) {
            return (
                <View>
                    {React.isValidElement(ListEmptyComponent)
                        ? ListEmptyComponent
                        : <ListEmptyComponent />}
                </View>
            );
        }
        return null;
    }

    return (
        <View testID="flash-list-mock">
            {ListHeaderComponent && (
                React.isValidElement(ListHeaderComponent)
                    ? ListHeaderComponent
                    : <ListHeaderComponent />
            )}
            {data.map((item: any, index: any) => (
                <View key={props.keyExtractor ? props.keyExtractor(item, index) : index}>
                    {renderItem({ item, index })}
                </View>
            ))}
        </View>
    );
});

export { FlashList };
