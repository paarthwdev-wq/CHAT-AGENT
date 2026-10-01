# 📱 WhatsApp Antigravity AI Agent (OpenWA + Render)

यह प्रोजेक्ट आपके **Antigravity (Google DeepMind / Gemini AI Engine)** को आपके **WhatsApp** से सीधे जोड़ता है।

---

## 🌟 फीचर्स (Features)

1. **डायरेक्ट WhatsApp इंटिग्रेशन**:
   - OpenWA (`@open-wa/wa-automate`) के जरिए आपके पर्सनल WhatsApp नंबर से ऑटोमेशन।
2. **स्मार्ट AI प्रोसेसिंग (Antigravity Engine)**:
   - आपकी Gemini API Key और लेटेस्ट हाई-स्पीड `gemini-3.5-flash` इंजन द्वारा संचालित।
3. **ऑन-डिमांड PDF और फाइल डिलीवरी**:
   - WhatsApp पर जब भी आप लिखेंगे *"मुझे नोट्स की PDF बना दो"* या *"IBPS / कोडिंग गाइड की PDF भेजो"*, बॉट ऑटोमैटिकली स्टाइल की हुई PDF फ़ाइल जनरेट करके सीधे WhatsApp पर सेंड कर देगा।
4. **Apper कंपेनियन**:
   - डेस्कटॉप से सर्विस मॉनिटरिंग और क्विक टेस्ट सपोर्ट।
5. **Render क्लाउड डिप्लॉयमेंट**:
   - `Dockerfile` और `render.yaml` ब्लूप्रिंट रेडी है, जिससे आप Render पर 1-क्लिक में फ्री डिप्लॉय कर सकते हैं।

---

## 📂 प्रोजेक्ट डायरेक्टरी संरचना

```text
whatsapp_antigravity/
├── server.js            # मुख्य OpenWA WhatsApp गेटवे और एक्सप्रेस सर्वर
├── engine.js            # Antigravity / Gemini AI क्वेरी एवं फ़ाइल प्रोसेसिंग इंजन
├── generate_pdf.py      # ऑन-डिमांड PDF जनरेटर (ReportLab)
├── companion.py         # Apper डेस्कटॉप कंपेनियन और टेस्टिंग टूल
├── package.json         # Node.js डिपेंडेंसीज
├── Dockerfile           # प्रोडक्शन डॉकर कंटेनर (Chromium + Node + Python)
├── render.yaml          # Render 1-क्लिक ब्लूप्रिंट
└── .env                 # आपकी Gemini API Key एवं कॉन्फ़िगरेशन
```

---

## 🚀 लोकल मशीन पर कैसे चलाएं (How to Run Locally)

### 1. डिपेंडेंसीज इंस्टॉल करें:
```bash
cd whatsapp_antigravity
npm install
```

### 2. बॉट स्टार्ट करें:
```bash
npm start
```
- पहली बार रन करने पर टर्मिनल में एक **QR Code** आएगा।
- अपने फ़ोन के WhatsApp में जाएं -> **Linked Devices** -> **Link a Device** -> QR Code स्कैन करें।
- स्कैन होते ही बॉट एक्टिव हो जाएगा!

### 3. टेस्ट करें:
- अपने WhatsApp से किसी भी चैट में बॉट को मैसेज करें:
  - *“नमस्ते, तुम क्या कर सकते हो?”* -> तुरंत टेक्स्ट जवाब मिलेगा।
  - *“पायथन सीखने के लिए पूरा रोडमैप का PDF बना के दो”* -> बॉट पूरी गाइड की **PDF फ़ाइल** बनाकर WhatsApp पर सेंड करेगा।

---

## ☁️ Render पर डिप्लॉय कैसे करें (Deploy on Render)

1. इस `whatsapp_antigravity` फोल्डर को अपने GitHub रिपॉजिटरी में पुश (Push) करें:
   ```bash
   git add .
   git commit -m "Add WhatsApp Antigravity Bot"
   git push origin main
   ```
2. [Render Dashboard](https://dashboard.render.com/) पर जाएं।
3. **New +** पर क्लिक करें और **Blueprint** चुनें।
4. अपनी GitHub रिपोजिटरी कनेक्ट करें — Render अपने आप `render.yaml` को पहचान लेगा।
5. Environment Variables में:
   - `GEMINI_API_KEY`: आपकी API Key (पहले से सेट है)
   - `ALLOWED_NUMBERS`: (वैकल्पिक) अगर सिर्फ अपना नंबर रखना चाहते हैं (जैसे `919876543210@c.us`)।
6. **Apply** पर क्लिक करें। Render ऑटोमैटिकली डॉकर इमेज बिल्ड करेगा और आपका बॉट 24/7 लाइव हो जाएगा।
