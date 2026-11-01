import React from 'react';
import { View, Pressable, Linking, StyleSheet } from 'react-native';
import { Text } from '../components/Text';
import Screen, { Card, Eyebrow } from '../components/Screen';
import { colors } from '../theme';

const Link = ({ url, children }) => <Pressable onPress={() => Linking.openURL(url)}><Text style={s.link}>{children}</Text></Pressable>;
export default function LegalScreen() {
  return (
    <Screen header={false}>
      <Card>
        <Eyebrow>Unofficial fan app</Eyebrow>
        <Text style={s.p}>F1 Companion is not affiliated with, endorsed by or connected to Formula One group companies, the FIA or any team or driver. FORMULA ONE, F1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing BV. Team and driver names are used only to identify them.</Text>
      </Card>
      <Card>
        <Eyebrow>Your data</Eyebrow>
        <Text style={s.p}>There is no account, no advertising, no analytics and no session recording in this app. Your favourites, notification choices, cached race data and, if you create one, your profile (display name, colour and favourite team) are stored only on this device. Removing the app removes them, and Settings has a button that clears the cached data.</Text>
        <Text style={s.p}>A profile is optional. To create one the app asks for your date of birth to check that you are old enough. The date is not saved: only the result of the check is kept on this device. You can delete your profile at any time from the Profile screen.</Text>
        <Text style={s.p}>To load race data the app requests it from OpenF1 and Jolpica. Like any internet request, these services can see your IP address.</Text>
      </Card>
      <Card>
        <Eyebrow>Data and fonts</Eyebrow>
        <View style={{ gap: 4 }}>
          <Text style={s.p}>Race data: OpenF1 (openf1.org) and Jolpica-F1 (jolpi.ca), which continues the Ergast database.</Text>
          <Text style={s.p}>Fonts Rajdhani, Chakra Petch and Exo 2 are bundled inside the app under the SIL Open Font License. They are not downloaded from the internet.</Text>
        </View>
        <Link url="https://openf1.org">openf1.org</Link><Link url="https://github.com/jolpica/jolpica-f1">Jolpica-F1 on GitHub</Link>
      </Card>
    </Screen>
  );
}
const s = StyleSheet.create({ p: { color: '#CDD0D8', fontSize: 16, marginTop: 10 }, link: { color: colors.accent, fontSize: 16, fontWeight: '600', marginTop: 10 } });
