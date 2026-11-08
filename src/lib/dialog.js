// A themed replacement for the plain Android alert. `Alert.alert(title, message, buttons)` works exactly like the React Native one,
// so screens only change their import. <DialogHost /> (mounted once in Main.js) draws the popup.
import { useEffect, useState } from 'react';
let show = null; const queue = [];
export const Alert = {
  alert(title, message, buttons, options) {
    const d = { title: title || '', message: message || '', buttons: Array.isArray(buttons) && buttons.length ? buttons : [{ text: 'OK' }], cancelable: options?.cancelable !== false };
    if (show) show(d); else queue.push(d);
  },
};
export const confirm = (title, message, okText = 'OK', danger = false) => new Promise((res) => Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel', onPress: () => res(false) }, { text: okText, style: danger ? 'destructive' : 'default', onPress: () => res(true) }], { cancelable: true }));
export function useDialogState() {
  const [cur, setCur] = useState(null); const [list, setList] = useState([]);
  useEffect(() => { show = (d) => setList((l) => [...l, d]); while (queue.length) { const d = queue.shift(); setList((l) => [...l, d]); } return () => { show = null; }; }, []);
  useEffect(() => { if (!cur && list.length) { setCur(list[0]); setList((l) => l.slice(1)); } }, [cur, list]);
  return [cur, () => setCur(null)];
}
