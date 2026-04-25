import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Linking, Alert, Platform, Animated,
} from 'react-native';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/AppContext';
import { PressBtn } from '../components/PressBtn';

interface EmergencyContact {
  id: string; name: string; phone: string; relation: string;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[s.sectionCard, {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      shadowColor: isDark ? '#000' : '#6070a0',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.3 : 0.09,
      shadowRadius: 14,
      elevation: isDark ? 5 : 4,
    }]}>
      {children}
    </View>
  );
}

function SectionTitle({ text, color }: { text: string; color?: string }) {
  const { colors } = useTheme();
  return <Text style={[s.sectionTitle, { color: color ?? colors.textMuted }]}>{text}</Text>;
}

function Divider() {
  return <View style={s.divider} />;
}

const EMERGENCY_MAP: Record<string, string> = {
  US: '911', CA: '911', MX: '911',
  AU: '000', NZ: '111',
  GB: '999', IE: '999',
  IN: '112', JP: '119', CN: '120', KR: '119',
};

function getLocaleEmergencyNumber(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split('-').pop()?.toUpperCase() ?? '';
    return EMERGENCY_MAP[region] ?? '112';
  } catch {
    return '112';
  }
}

export default function EmergencyScreen() {
  const { colors } = useTheme();

  const [emergencyNumber,  setEmergencyNumber]  = useState(() => getLocaleEmergencyNumber());
  const [locationAddress,  setLocationAddress]  = useState('');
  const [locationLoading,  setLocationLoading]  = useState(true);

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationAddress('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        const countryCode = place.isoCountryCode?.toUpperCase() ?? '';
        setEmergencyNumber(EMERGENCY_MAP[countryCode] ?? '112');
        const streetFull = [place.streetNumber, place.street].filter(Boolean).join(' ');
        const raw = [streetFull, place.city, place.region, place.country].filter(Boolean);
        const deduped = raw.filter((v, i) => v !== raw[i - 1]);
        setLocationAddress(deduped.join(', '));
      }
    } catch {}
    setLocationLoading(false);
  };

  useEffect(() => { fetchLocation(); }, []);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const [contacts,      setContacts]      = useState<EmergencyContact[]>([
    { id: '1', name: 'Mom',         phone: '+40700000001', relation: 'Parent' },
    { id: '2', name: 'Dr. Ionescu', phone: '+40700000002', relation: 'Doctor' },
  ]);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [newName,       setNewName]       = useState('');
  const [newPhone,      setNewPhone]      = useState('');
  const [newRelation,   setNewRelation]   = useState('');
  const [nameFocus,     setNameFocus]     = useState(false);
  const [phoneFocus,    setPhoneFocus]    = useState(false);
  const [relationFocus, setRelationFocus] = useState(false);
  const [hypoOpen,      setHypoOpen]      = useState(false);
  const [hyperOpen,     setHyperOpen]     = useState(false);
  const [dosOpen,       setDosOpen]       = useState(false);

  // ── Phone contacts picker ──────────────────────────────────────────────────
  const [phoneContacts,     setPhoneContacts]     = useState<Contacts.Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch,     setContactSearch]     = useState('');

  const openContactPicker = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Contacts access was denied. You can still add contacts manually.');
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      sort: Contacts.SortTypes.FirstName,
    });
    const withPhone = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
    setPhoneContacts(withPhone);
    setContactSearch('');
    setShowContactPicker(true);
  };

  const pickContact = (contact: Contacts.Contact) => {
    const phone = contact.phoneNumbers?.[0]?.number ?? '';
    const name  = contact.name ?? '';
    // If contact has multiple numbers, pick the first but let user review
    setNewName(name);
    setNewPhone(phone);
    setShowContactPicker(false);
    setShowAddForm(true);
  };

  const filteredPhoneContacts = phoneContacts.filter(c =>
    (c.name ?? '').toLowerCase().includes(contactSearch.toLowerCase())
  );

  // ── Regular handlers ────────────────────────────────────────────────────────
  const callEmergency = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${emergencyNumber}`);
  };

  const callContact = (phone: string, name: string) => {
    Alert.alert(`Call ${name}?`, phone, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${phone}`) },
    ]);
  };

  const deleteContact = (id: string) => {
    Alert.alert('Delete contact?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () =>
          setContacts((prev) => prev.filter((c) => c.id !== id)) },
    ]);
  };

  const handleAddContact = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Missing info', 'Please enter at least a name and phone number.');
      return;
    }
    setContacts((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newName.trim(), phone: newPhone.trim(), relation: newRelation.trim() },
    ]);
    setNewName(''); setNewPhone(''); setNewRelation('');
    setShowAddForm(false);
  };

  const searchHospitals = () => {
    const query = locationAddress ? `hospitals near ${encodeURIComponent(locationAddress)}` : 'hospitals nearby';
    Linking.openURL(`https://www.google.com/maps/search/${query}`);
  };

  const HYPO_SYMPTOMS = [
    { icon: '🫨', text: 'Shakiness or trembling' }, { icon: '💧', text: 'Sweating' },
    { icon: '💓', text: 'Rapid heartbeat' }, { icon: '😵', text: 'Dizziness or lightheadedness' },
    { icon: '🍽️', text: 'Hunger' }, { icon: '😰', text: 'Irritability or anxiety' },
    { icon: '👁️', text: 'Blurry or double vision' }, { icon: '🌀', text: 'Confusion or difficulty concentrating' },
    { icon: '🫥', text: 'Pale skin' }, { icon: '😮‍💨', text: 'Weakness or fatigue' },
    { icon: '🤕', text: 'Headache' }, { icon: '😶', text: 'Tingling lips' },
  ];

  const HYPER_SYMPTOMS = [
    { icon: '🥤', text: 'Excessive thirst' }, { icon: '🚽', text: 'Frequent urination' },
    { icon: '😴', text: 'Fatigue' }, { icon: '👁️', text: 'Blurred vision' },
    { icon: '🤕', text: 'Headache' }, { icon: '🏜️', text: 'Dry mouth and skin' },
    { icon: '🤢', text: 'Nausea or vomiting' }, { icon: '🌀', text: 'Difficulty concentrating' },
    { icon: '🍬', text: 'Fruity-smelling breath (possible DKA)' }, { icon: '🩹', text: 'Slow-healing wounds' },
    { icon: '🫁', text: 'Breathlessness' }, { icon: '🫃', text: 'Abdominal pain' },
  ];

  const DOS = [
    { do: true,  text: 'Stay calm and sit or lie down safely' },
    { do: true,  text: 'Eat 15–20g fast carbs if low (juice, glucose tabs)' },
    { do: true,  text: 'Recheck blood sugar after 15 minutes' },
    { do: true,  text: 'Tell someone nearby what is happening' },
    { do: true,  text: 'Use glucagon kit if unconscious and one is available' },
    { do: true,  text: `Call ${emergencyNumber} if you feel it is a genuine emergency` },
    { do: false, text: 'Do NOT drive if blood sugar is low' },
    { do: false, text: 'Do NOT take insulin if already hypoglycemic' },
    { do: false, text: 'Do NOT eat large meals to treat a low — use fast carbs only' },
    { do: false, text: 'Do NOT ignore symptoms hoping they will pass on their own' },
    { do: false, text: 'Do NOT double-dose insulin without medical advice' },
    { do: false, text: 'Do NOT leave a hypoglycemic person alone if they are confused' },
  ];

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[s.title, { color: colors.text }]}>SOS & Emergency</Text>

      {/* ── Phone Contacts Picker Modal ── */}
      {showContactPicker && (
        <View style={[s.pickerOverlay, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={s.pickerHeader}>
            <Text style={[s.pickerTitle, { color: colors.text }]}>Choose a Contact</Text>
            <TouchableOpacity onPress={() => setShowContactPicker(false)} activeOpacity={0.7}>
              <Text style={[s.pickerClose, { color: colors.red }]}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[s.pickerSearch, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
            placeholder="Search contacts…" placeholderTextColor="#aaa"
            value={contactSearch} onChangeText={setContactSearch}
          />
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {filteredPhoneContacts.length === 0 ? (
              <Text style={[s.pickerEmpty, { color: colors.textMuted }]}>No contacts found.</Text>
            ) : (
              filteredPhoneContacts.map((c, i) => (
                <TouchableOpacity
                  key={c.name ?? String(i)}
                  style={[s.pickerRow, { borderBottomColor: colors.border }]}
                  onPress={() => pickContact(c)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.pickerName, { color: colors.text }]}>{c.name}</Text>
                  <Text style={[s.pickerPhone, { color: colors.textMuted }]}>
                    {c.phoneNumbers?.[0]?.number ?? ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* ── 1. EMERGENCY CALL ── */}
      <View style={[s.emergencyCallCard, { backgroundColor: colors.lowBg, borderColor: colors.red }]}>
        <Text style={[s.emergencyCallTitle, { color: colors.red }]}>Need immediate help?</Text>
        <Text style={[s.emergencyCallSub, { color: colors.textMuted }]}>
          If your condition is life-threatening or you cannot treat yourself, call emergency services now.
        </Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%', alignItems: 'center' }}>
          <PressBtn
            style={[s.callBtn, { backgroundColor: colors.red }, s.callBtnShadow]}
            onPress={callEmergency}
          >
            <Text style={s.callBtnIcon}>📞</Text>
            <Text style={s.callBtnText}>Call {emergencyNumber} — Emergency Services</Text>
          </PressBtn>
        </Animated.View>
        {(locationLoading || locationAddress !== '') && (
          <View style={s.locationBlock}>
            <Text style={[s.locationLabel, { color: colors.textMuted }]}>Your address is</Text>
            <Text style={[s.locationLine, { color: colors.text }]}>
              {locationLoading ? '📍 Detecting your location…' : `📍 ${locationAddress}`}
            </Text>
            {!locationLoading && (
              <TouchableOpacity onPress={fetchLocation} activeOpacity={0.7} style={s.refreshBtn}>
                <Text style={[s.refreshBtnText, { color: colors.textMuted }]}>🔄 Refresh location</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {!locationLoading && (
          <TouchableOpacity
            style={[s.hospitalBtn, { borderColor: colors.red }]}
            onPress={searchHospitals}
            activeOpacity={0.75}
          >
            <Text style={[s.hospitalBtnText, { color: colors.red }]}>🏥 Find a Nearby Hospital</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. EMERGENCY CONTACTS ── */}
      <SectionCard>
        <View style={s.rowBetween}>
          <SectionTitle text="Emergency Contacts" />
          {!showAddForm && (
            <View style={s.addBtnRow}>
              <PressBtn
                style={[s.addFromPhoneBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
                onPress={openContactPicker} activeOpacity={0.75}
              >
                <Text style={[s.addFromPhoneBtnText, { color: colors.red }]}>📱 From Contacts</Text>
              </PressBtn>
              <TouchableOpacity onPress={() => setShowAddForm(true)} activeOpacity={0.75}>
                <Text style={[s.addContactLink, { color: colors.red }]}>+ Manual</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {contacts.length === 0 && !showAddForm && (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No contacts saved yet.</Text>
        )}

        {contacts.map((c, idx) => (
          <View key={c.id} style={[s.contactRow, idx > 0 && s.contactRowBorder]}>
            <View style={s.contactInfo}>
              <Text style={[s.contactName, { color: colors.text }]}>{c.name}</Text>
              <Text style={[s.contactMeta, { color: colors.textMuted }]}>{c.relation ? `${c.relation} · ` : ''}{c.phone}</Text>
            </View>
            <View style={s.contactActions}>
              <PressBtn
                style={[s.contactCallBtn, { borderColor: colors.red, backgroundColor: 'transparent' }]}
                onPress={() => callContact(c.phone, c.name)} activeOpacity={0.75}
              >
                <Text style={s.contactCallBtnText}>📞</Text>
              </PressBtn>
              <PressBtn onPress={() => deleteContact(c.id)} activeOpacity={0.75}>
                <Text style={[s.contactDeleteBtn, { color: colors.red }]}>Delete</Text>
              </PressBtn>
            </View>
          </View>
        ))}

        {showAddForm && (
          <View style={s.addForm}>
            <Divider />
            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Name</Text>
            <TextInput style={[s.input, { borderColor: nameFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="e.g. Mom" placeholderTextColor="#aaa" value={newName} onChangeText={setNewName}
              onFocus={() => setNameFocus(true)} onBlur={() => setNameFocus(false)} returnKeyType="next" />
            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Phone number</Text>
            <TextInput style={[s.input, { borderColor: phoneFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="e.g. +40700000000" placeholderTextColor="#aaa" value={newPhone} onChangeText={setNewPhone}
              onFocus={() => setPhoneFocus(true)} onBlur={() => setPhoneFocus(false)} keyboardType="phone-pad" returnKeyType="next" />
            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Relation (optional)</Text>
            <TextInput style={[s.input, { borderColor: relationFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="e.g. Parent, Doctor" placeholderTextColor="#aaa" value={newRelation} onChangeText={setNewRelation}
              onFocus={() => setRelationFocus(true)} onBlur={() => setRelationFocus(false)} returnKeyType="done" />
            <View style={s.formBtnRow}>
              <View style={{ flex: 1 }}>
                <PressBtn style={[s.cancelBtn, { backgroundColor: 'transparent' }]}
                  onPress={() => { setShowAddForm(false); setNewName(''); setNewPhone(''); setNewRelation(''); }} activeOpacity={0.75}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </PressBtn>
              </View>
              <View style={{ flex: 1 }}>
                <PressBtn style={[s.saveBtn, { backgroundColor: colors.red }, s.primaryBtnShadow]} onPress={handleAddContact}>
                  <Text style={s.saveBtnText}>Save</Text>
                </PressBtn>
              </View>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ── 4. HYPO SYMPTOMS ── */}
      <SectionCard>
        <TouchableOpacity onPress={() => setHypoOpen(v => !v)} activeOpacity={0.8}>
          <View style={s.rowBetween}>
            <View style={s.symptomTitleRow}>
              <View style={[s.symptomDot, { backgroundColor: '#e53935' }]} />
              <SectionTitle text="Hypoglycemia Symptoms" color="#e53935" />
            </View>
            <Text style={s.chevron}>{hypoOpen ? '▲' : '▼'}</Text>
          </View>
          <Text style={[s.symptomThreshold, { color: colors.textMuted }]}>Low blood sugar — below 75 mg/dL / 4.2 mmol/L</Text>
          {!hypoOpen && <Text style={[s.clickForMore, { color: colors.textFaint }]}>Click for more</Text>}
        </TouchableOpacity>
        {hypoOpen && (
          <>
            <View style={s.symptomsGrid}>
              {HYPO_SYMPTOMS.map((sym, i) => (
                <View key={i} style={[s.symptomChip, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[s.symptomChipText, { color: colors.textMuted }]}>{sym.icon} {sym.text}</Text>
                </View>
              ))}
            </View>
            <Divider />
            <Text style={[s.actionTitle, { color: colors.text }]}>What to do:</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>1. Eat 15–20g of fast-acting carbs (juice, glucose tabs, candy)</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>2. Wait 15 minutes and recheck blood sugar</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>3. If still low, repeat step 1</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>4. Once normal, eat a small snack to prevent another dip</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>5. If unconscious or unable to swallow — call {emergencyNumber} immediately</Text>
          </>
        )}
      </SectionCard>

      {/* ── 5. HYPER SYMPTOMS ── */}
      <SectionCard>
        <TouchableOpacity onPress={() => setHyperOpen(v => !v)} activeOpacity={0.8}>
          <View style={s.rowBetween}>
            <View style={s.symptomTitleRow}>
              <View style={[s.symptomDot, { backgroundColor: '#ef6c00' }]} />
              <SectionTitle text="Hyperglycemia Symptoms" color="#ef6c00" />
            </View>
            <Text style={s.chevron}>{hyperOpen ? '▲' : '▼'}</Text>
          </View>
          <Text style={[s.symptomThreshold, { color: colors.textMuted }]}>High blood sugar — above 150 mg/dL / 8.3 mmol/L</Text>
          {!hyperOpen && <Text style={[s.clickForMore, { color: colors.textFaint }]}>Click for more</Text>}
        </TouchableOpacity>
        {hyperOpen && (
          <>
            <View style={s.symptomsGrid}>
              {HYPER_SYMPTOMS.map((sym, i) => (
                <View key={i} style={[s.symptomChip, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[s.symptomChipText, { color: colors.textMuted }]}>{sym.icon} {sym.text}</Text>
                </View>
              ))}
            </View>
            <Divider />
            <Text style={[s.actionTitle, { color: colors.text }]}>What to do:</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>1. Drink plenty of water to help flush excess glucose</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>2. Take a correction insulin dose if prescribed</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>3. Avoid food until levels improve</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>4. Check for ketones if above 250 mg/dL (13.9 mmol/L)</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>5. Seek emergency help if over 300 mg/dL or you feel very unwell</Text>
          </>
        )}
      </SectionCard>

      {/* ── 6. DO'S AND DON'TS ── */}
      <SectionCard>
        <TouchableOpacity onPress={() => setDosOpen(v => !v)} activeOpacity={0.8}>
          <View style={s.rowBetween}>
            <SectionTitle text="Do's & Don'ts During a Crisis" />
            <Text style={s.chevron}>{dosOpen ? '▲' : '▼'}</Text>
          </View>
          <Text style={[s.symptomThreshold, { color: colors.textMuted }]}>Quick reference for any diabetic emergency</Text>
          {!dosOpen && <Text style={[s.clickForMore, { color: colors.textFaint }]}>Click for more</Text>}
        </TouchableOpacity>
        {dosOpen && (
          <View style={s.dosGrid}>
            {DOS.map((item, i) => (
              <View key={i} style={[s.dosRow, i > 0 && s.dosRowBorder]}>
                <Text style={[s.dosText, { color: item.do ? '#2e7d32' : '#e53935' }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 14 },

  emergencyCallCard: { borderRadius: 14, borderWidth: 2, padding: 18, marginBottom: 14, alignItems: 'center' },
  emergencyCallTitle:{ fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emergencyCallSub:  { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 14 },
  callBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13, marginBottom: 10 },
  callBtnIcon:       { fontSize: 18 },
  callBtnText:       { fontSize: 16, fontWeight: '800', color: '#fff', backgroundColor: 'transparent' },
  locationBlock:     { marginTop: 14, alignItems: 'center' },
  locationLabel:     { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  locationLine:      { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  hospitalBtn:       { marginTop: 14, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, alignItems: 'center' },
  hospitalBtnText:   { fontSize: 13, fontWeight: '700' },
  refreshBtn:        { marginTop: 8, paddingVertical: 4, paddingHorizontal: 12 },
  refreshBtnText:    { fontSize: 12, fontWeight: '600' },

  sectionCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  divider:      { height: 1, marginVertical: 10 },
  rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevron:      { fontSize: 12 },
  emptyText:    { fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  input:        { borderWidth: 1.5, borderRadius: 6, paddingVertical: Platform.OS === 'ios' ? 9 : 7, paddingHorizontal: 12, fontSize: 14, marginBottom: 10 },

  mapBtnRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' }, 
  mapBtn: { flex: 1, borderRadius: 7, paddingVertical: 10, alignItems: 'center', height: 42 },  mapBtnOutline:{ borderWidth: 1.5 },
  mapBtnText:   { fontSize: 13, fontWeight: '700', color: '#fff', backgroundColor: 'transparent' },
  mapBtnOutlineText: { backgroundColor: 'transparent' },

  addBtnRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addFromPhoneBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5 },
  addFromPhoneBtnText: { fontSize: 12, fontWeight: '700', backgroundColor: 'transparent' },
  addContactLink:    { fontSize: 13, fontWeight: '700' },

  contactRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  contactRowBorder:  { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  contactInfo:       { flex: 1 },
  contactName:       { fontSize: 14, fontWeight: '700' },
  contactMeta:       { fontSize: 12, marginTop: 1 },
  contactActions:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactCallBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: 'transparent', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  contactCallBtnText:{ fontSize: 16 },
  contactDeleteBtn:  { fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },

  addForm:       { marginTop: 4 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignSelf: 'stretch' },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'transparent' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', backgroundColor: 'transparent' },
  saveBtn:   { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  saveBtnText:   { fontSize: 14, color: '#fff', fontWeight: '700', backgroundColor: 'transparent' },

  symptomTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  symptomDot:       { width: 10, height: 10, borderRadius: 5 },
  symptomThreshold: { fontSize: 11, marginBottom: 10, marginTop: -4 },
  symptomsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  symptomChip:      { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  symptomChipText:  { fontSize: 12 },
  actionTitle:      { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  actionItem:       { fontSize: 13, lineHeight: 20, marginBottom: 3 },
  dosGrid:      { marginTop: 8 },
  dosRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  dosRowBorder: { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  dosText:      { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  clickForMore: { fontSize: 11, marginBottom: 4 },

  // Phone contacts picker
  pickerOverlay: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  pickerHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pickerTitle:   { fontSize: 15, fontWeight: '700' },
  pickerClose:   { fontSize: 13, fontWeight: '700' },
  pickerSearch:  { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 7 : 5, fontSize: 14, marginBottom: 8 },
  pickerEmpty:   { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  pickerRow:     { paddingVertical: 12, borderBottomWidth: 1 },
  pickerName:    { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  pickerPhone:   { fontSize: 12 },

  // ── Shadows ──────────────────────────────────────────────────────────────────
  callBtnShadow: {
    shadowColor: '#7a1010',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 6,
  },
  primaryBtnShadow: {
    shadowColor: '#7a1010',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 0,
    elevation: 4,
  },
  outlineBtnShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
});