import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Linking, Alert, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../context/AppContext';

const RED = '#EC5557';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[s.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>{children}</View>;
}

function SectionTitle({ text, color }: { text: string; color?: string }) {
  const { colors } = useTheme();
  return <Text style={[s.sectionTitle, { color: color ?? colors.textMuted }]}>{text}</Text>;
}

function Divider() {
  return <View style={s.divider} />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EmergencyScreen() {
  const { colors } = useTheme();
  // ── Contacts state ─────────────────────────────────────────────────────────
  const [contacts,      setContacts]      = useState<EmergencyContact[]>([
    { id: '1', name: 'Mom', phone: '+40700000001', relation: 'Parent' },
    { id: '2', name: 'Dr. Ionescu', phone: '+40700000002', relation: 'Doctor' },
  ]);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [newName,       setNewName]       = useState('');
  const [newPhone,      setNewPhone]      = useState('');
  const [newRelation,   setNewRelation]   = useState('');
  const [nameFocus,     setNameFocus]     = useState(false);
  const [phoneFocus,    setPhoneFocus]    = useState(false);
  const [relationFocus, setRelationFocus] = useState(false);

  // ── Hospital search state ───────────────────────────────────────────────────
  const [address, setAddress] = useState('');
  const [addrFocus, setAddrFocus] = useState(false);

  // ── Symptom checklist expand ────────────────────────────────────────────────
  const [hypoOpen, setHypoOpen] = useState(false);
  const [hyperOpen, setHyperOpen] = useState(false);
  const [dosOpen, setDosOpen] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const callEmergency = () => {
    Linking.openURL('tel:112');
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
      { id: Date.now().toString(), name: newName.trim(),
        phone: newPhone.trim(), relation: newRelation.trim() },
    ]);
    setNewName(''); setNewPhone(''); setNewRelation('');
    setShowAddForm(false);
  };

  const searchHospitals = () => {
    const query = address.trim()
      ? `hospitals near ${encodeURIComponent(address)}`
      : 'hospitals nearby';
    Linking.openURL(`https://www.google.com/maps/search/${query}`);
  };

  const useMyLocation = async () => {
    // 1. Ask for permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission denied',
        'Location access was denied. Please enable it in your device settings to use this feature.',
      );
      return;
    }

    // 2. Get current coords
    let coords: { latitude: number; longitude: number };
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      coords = loc.coords;
    } catch {
      Alert.alert('Error', 'Unable to retrieve your location. Please try again.');
      return;
    }

    // 3. Reverse geocode to get a human-readable address and fill the input
    try {
      const [place] = await Location.reverseGeocodeAsync(coords);
      if (place) {
        const parts = [place.street, place.city, place.region, place.country].filter(Boolean);
        setAddress(parts.join(', '));
      }
    } catch {
      // Non-fatal — coords are enough for the map search
    }

    // 4. Open Google Maps searching hospitals near the coordinates
    Linking.openURL(
      `https://www.google.com/maps/search/hospitals/@${coords.latitude},${coords.longitude},14z`
    );
  };

  // ── Data ───────────────────────────────────────────────────────────────────

  const HYPO_SYMPTOMS = [
    'Shakiness or trembling', 'Sweating', 'Rapid heartbeat',
    'Dizziness or lightheadedness', 'Hunger', 'Irritability or anxiety',
    'Blurry or double vision', 'Confusion or difficulty concentrating',
    'Pale skin', 'Weakness or fatigue', 'Headache', 'Tingling lips',
  ];

  const HYPER_SYMPTOMS = [
    'Excessive thirst', 'Frequent urination', 'Fatigue',
    'Blurred vision', 'Headache', 'Dry mouth and skin',
    'Nausea or vomiting', 'Difficulty concentrating',
    'Fruity-smelling breath (possible DKA)', 'Slow-healing wounds',
    'Breathlessness', 'Abdominal pain',
  ];

  const DOS = [
    { do: true,  text: 'Stay calm and sit or lie down safely' },
    { do: true,  text: 'Eat 15–20g fast carbs if low (juice, glucose tabs)' },
    { do: true,  text: 'Recheck blood sugar after 15 minutes' },
    { do: true,  text: 'Tell someone nearby what is happening' },
    { do: true,  text: 'Use glucagon kit if unconscious and one is available' },
    { do: true,  text: 'Call 112 if you feel it is a genuine emergency' },
    { do: false, text: 'Do NOT drive if blood sugar is low' },
    { do: false, text: 'Do NOT take insulin if already hypoglycemic' },
    { do: false, text: 'Do NOT eat large meals to treat a low — use fast carbs only' },
    { do: false, text: 'Do NOT ignore symptoms hoping they will pass on their own' },
    { do: false, text: 'Do NOT double-dose insulin without medical advice' },
    { do: false, text: 'Do NOT leave a hypoglycemic person alone if they are confused' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[s.title, { color: colors.text }]}>SOS & Emergency</Text>

      {/* ── 1. EMERGENCY CALL ── */}
      <View style={[s.emergencyCallCard, { backgroundColor: colors.lowBg, borderColor: colors.red }]}>
        <Text style={[s.emergencyCallTitle, { color: colors.red }]}>Need immediate help?</Text>
        <Text style={[s.emergencyCallSub, { color: colors.textMuted }]}>
          If your condition is life-threatening or you cannot treat yourself, call emergency services now.
        </Text>
        <TouchableOpacity style={[s.callBtn, { backgroundColor: colors.red }]} onPress={callEmergency} activeOpacity={0.8}>
          <Text style={s.callBtnIcon}>📞</Text>
          <Text style={s.callBtnText}>Call 112 — Emergency Services</Text>
        </TouchableOpacity>
        <Text style={[s.emergencyCallNote, { color: colors.textFaint }]}>
          Never ignore the warning signs of a diabetic emergency.
        </Text>
      </View>

      {/* ── 2. HOSPITAL FINDER ── */}
      <SectionCard>
        <SectionTitle text="Find Nearby Hospitals" />
        <TextInput
          style={[s.input, { borderColor: addrFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
          placeholder="Enter your location (or leave empty)"
          placeholderTextColor="#aaa"
          value={address}
          onChangeText={setAddress}
          onFocus={() => setAddrFocus(true)}
          onBlur={() => setAddrFocus(false)}
          returnKeyType="search"
        />
        <View style={s.mapBtnRow}>
          <TouchableOpacity 
            style={[s.mapBtn, { backgroundColor: colors.red }]} 
            onPress={searchHospitals} 
            activeOpacity={0.75}
          >
            <Text style={s.mapBtnText}>🔍 Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.mapBtn, s.mapBtnOutline, { borderColor: colors.red, backgroundColor: colors.bgCard }]}
            onPress={useMyLocation}
            activeOpacity={0.75}
          >
            <Text style={[s.mapBtnOutlineText, { color: colors.text }]}>📍 Use My Location</Text>
          </TouchableOpacity>
        </View>
      </SectionCard>

      {/* ── 3. EMERGENCY CONTACTS ── */}
      <SectionCard>
        <View style={s.rowBetween}>
          <SectionTitle text="Emergency Contacts" />
          {!showAddForm && (
            <TouchableOpacity onPress={() => setShowAddForm(true)} activeOpacity={0.75}>
              <Text style={[s.addContactLink, { color: colors.red }]}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {contacts.length === 0 && !showAddForm && (
          <Text style={[s.emptyText, { color: colors.textMuted }]}>No contacts saved yet. Tap "+ Add" to add one.</Text>
        )}

        {contacts.map((c, idx) => (
          <View key={c.id} style={[s.contactRow, idx > 0 && s.contactRowBorder]}>
            <View style={s.contactInfo}>
              <Text style={[s.contactName, { color: colors.text }]}>{c.name}</Text>
              <Text style={[s.contactMeta, { color: colors.textMuted }]}>{c.relation ? `${c.relation} · ` : ''}{c.phone}</Text>
            </View>
            <View style={s.contactActions}>
              <TouchableOpacity
                style={[s.contactCallBtn, { borderColor: colors.red }]}
                onPress={() => callContact(c.phone, c.name)}
                activeOpacity={0.75}
              >
                <Text style={s.contactCallBtnText}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteContact(c.id)} activeOpacity={0.75}>
                <Text style={[s.contactDeleteBtn, { color: colors.red }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showAddForm && (
          <View style={s.addForm}>
            <Divider />
            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Name</Text>
            <TextInput
              style={[s.input, { borderColor: nameFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="e.g. Mom"
              placeholderTextColor="#aaa"
              value={newName}
              onChangeText={setNewName}
              onFocus={() => setNameFocus(true)}
              onBlur={() => setNameFocus(false)}
              returnKeyType="next"
            />
            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Phone number</Text>
            <TextInput
              style={[s.input, { borderColor: phoneFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="e.g. +40700000000"
              placeholderTextColor="#aaa"
              value={newPhone}
              onChangeText={setNewPhone}
              onFocus={() => setPhoneFocus(true)}
              onBlur={() => setPhoneFocus(false)}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Relation (optional)</Text>
            <TextInput
              style={[s.input, { borderColor: relationFocus ? colors.red : colors.border, color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="e.g. Parent, Doctor"
              placeholderTextColor="#aaa"
              value={newRelation}
              onChangeText={setNewRelation}
              onFocus={() => setRelationFocus(true)}
              onBlur={() => setRelationFocus(false)}
              returnKeyType="done"
            />
            <View style={s.formBtnRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowAddForm(false); setNewName(''); setNewPhone(''); setNewRelation(''); }}
                activeOpacity={0.75}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.red }]} onPress={handleAddContact} activeOpacity={0.75}>
                <Text style={s.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SectionCard>

      {/* ── 4. HYPO SYMPTOMS ── */}
      <SectionCard>
        <TouchableOpacity style={s.rowBetween} onPress={() => setHypoOpen(v => !v)} activeOpacity={0.8}>
          <View style={s.symptomTitleRow}>
            <View style={[s.symptomDot, { backgroundColor: '#e53935' }]} />
            <SectionTitle text="Hypoglycemia Symptoms" color="#e53935" />
          </View>
          <Text style={s.chevron}>{hypoOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <Text style={[s.symptomThreshold, { color: colors.textMuted }]}>Low blood sugar — below 75 mg/dL / 4.2 mmol/L</Text>
        {!hypoOpen && <Text style={[s.clickForMore, { color: colors.textFaint }]}>Click for more</Text>}

        {hypoOpen && (
          <>
            <View style={s.symptomsGrid}>
              {HYPO_SYMPTOMS.map((sym, i) => (
                <View key={i} style={[s.symptomChip, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[s.symptomChipText, { color: colors.textMuted }]}>• {sym}</Text>
                </View>
              ))}
            </View>
            <Divider />
            <Text style={[s.actionTitle, { color: colors.text }]}>What to do:</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>1. Eat 15–20g of fast-acting carbs (juice, glucose tabs, candy)</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>2. Wait 15 minutes and recheck blood sugar</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>3. If still low, repeat step 1</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>4. Once normal, eat a small snack to prevent another dip</Text>
            <Text style={[s.actionItem, { color: colors.textMuted }]}>5. If unconscious or unable to swallow — call 112 immediately</Text>
          </>
        )}
      </SectionCard>

      {/* ── 5. HYPER SYMPTOMS ── */}
      <SectionCard>
        <TouchableOpacity style={s.rowBetween} onPress={() => setHyperOpen(v => !v)} activeOpacity={0.8}>
          <View style={s.symptomTitleRow}>
            <View style={[s.symptomDot, { backgroundColor: '#ef6c00' }]} />
            <SectionTitle text="Hyperglycemia Symptoms" color="#ef6c00" />
          </View>
          <Text style={s.chevron}>{hyperOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <Text style={[s.symptomThreshold, { color: colors.textMuted }]}>High blood sugar — above 150 mg/dL / 8.3 mmol/L</Text>
        {!hyperOpen && <Text style={[s.clickForMore, { color: colors.textFaint }]}>Click for more</Text>}

        {hyperOpen && (
          <>
            <View style={s.symptomsGrid}>
              {HYPER_SYMPTOMS.map((sym, i) => (
                <View key={i} style={[s.symptomChip, { backgroundColor: colors.bgSecondary }]}>
                  <Text style={[s.symptomChipText, { color: colors.textMuted }]}>• {sym}</Text>
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
        <TouchableOpacity style={s.rowBetween} onPress={() => setDosOpen(v => !v)} activeOpacity={0.8}>
          <SectionTitle text="Do's & Don'ts During a Crisis" />
          <Text style={s.chevron}>{dosOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        <Text style={[s.symptomThreshold, { color: colors.textMuted }]}>Quick reference for any diabetic emergency</Text>
        {!dosOpen && <Text style={[s.clickForMore, { color: colors.textFaint }]}>Click for more</Text>}

        {dosOpen && (
          <View style={s.dosGrid}>
            {DOS.map((item, i) => (
              <View key={i} style={[s.dosRow, i > 0 && s.dosRowBorder]}>
                <Text style={[s.dosText, { color: item.do ? '#2e7d32' : '#e53935' }]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:        { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 48 },

  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 14 },

  emergencyCallCard: { borderRadius: 14, borderWidth: 2, padding: 18, marginBottom: 14, alignItems: 'center' },
  emergencyCallTitle:{ fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emergencyCallSub:  { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 14 },
  callBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#9c2522', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13, marginBottom: 10 },
  callBtnIcon:       { fontSize: 18 },
  callBtnText:       { fontSize: 16, fontWeight: '800', color: '#fff' },
  emergencyCallNote: { fontSize: 11, textAlign: 'center' },

  sectionCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  divider:      { height: 1, marginVertical: 10 },
  rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevron:      { fontSize: 12 },
  emptyText:    { fontSize: 13, textAlign: 'center', paddingVertical: 10 },

  input:         { borderWidth: 1.5, borderRadius: 6, paddingVertical: Platform.OS === 'ios' ? 9 : 7, paddingHorizontal: 12, fontSize: 14, marginBottom: 10 },
  inputFocused:  { borderColor: '#EC5557' },
  mapBtnRow:     { flexDirection: 'row', gap: 10 },
  mapBtn:        { flex: 1, backgroundColor: '#EC5557', borderRadius: 7, paddingVertical: 10, alignItems: 'center' },
  mapBtnOutline: { backgroundColor: '#888888', borderWidth: 1.5, borderColor: '#EC5557' },
  mapBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },
  mapBtnOutlineText: { color: '#EC5557' },

  addContactLink:    { fontSize: 13, color: '#9c2522', fontWeight: '700' },
  contactRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  contactRowBorder:  { borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  contactAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EC5557', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  contactAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  contactInfo:       { flex: 1 },
  contactName:       { fontSize: 14, fontWeight: '700' },
  contactMeta:       { fontSize: 12, marginTop: 1 },
  contactActions:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactCallBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: 'transparent', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  contactCallBtnText:{ fontSize: 16 },
  contactDeleteBtn:  { fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },

  addForm:       { marginTop: 4 },
  fieldLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  formBtnRow:    { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn:     { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn:       { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  saveBtnText:   { fontSize: 14, color: '#fff', fontWeight: '700' },

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
  dosBadge:     { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  dosBadgeText: { fontSize: 13, fontWeight: '800' },
  dosText:      { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  clickForMore: { fontSize: 11, marginBottom: 4 },
});