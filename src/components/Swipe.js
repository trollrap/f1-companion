import React, { useRef } from 'react';
import { View, PanResponder } from 'react-native';
// Swipe sideways to move to the next or previous item of a list of tabs. Child scroll views keep their own horizontal gestures.
export default function Swipe({ index, count, onIndex, children, style }) {
  const st = useRef({ index, count, onIndex }); st.current = { index, count, onIndex };
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 2.2,
    onPanResponderRelease: (_, g) => {
      const { index: i, count: n, onIndex: go } = st.current;
      if (g.dx < -60 && i < n - 1) go(i + 1); else if (g.dx > 60 && i > 0) go(i - 1);
    },
  })).current;
  return <View {...pan.panHandlers} style={[{ flex: 1 }, style]}>{children}</View>;
}
