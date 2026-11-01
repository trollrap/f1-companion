// Global UI switches set from Settings (see PrefsProvider). Read at render time by animations and lists.
export const ui = { reduceMotion: false, photos: true, clock24: true, lang: 'en' };
export const setUi = (o) => Object.assign(ui, o);
