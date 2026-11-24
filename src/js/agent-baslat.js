// Asistan Agent (ortak-cekirdek/web/dist/fc-agent.js): bütün uygulamalardaki çalışmayı izler (yalnız sayılar), öneri verir.
// Bildirim + sağ altta ✦ panel; Ayarlar'da "Admin ile iletişim" kartının önünde kendi kartı. fc-agent.js'yi çekirdekten yeniden kopyalayarak güncellenir.
(function () {
  if (!window.FCAgent) return;
  FCAgent.mount({
    app: "comm-calc",
    version: (function () { try { return App.version; } catch (e) { return ''; } })(),
    lang: function () { try { return (I18N.lang) || document.documentElement.lang || 'tr'; } catch (e) { return document.documentElement.lang || 'tr'; } },
    theme: 'auto',
    sync: true,
    settingsBefore: ["Yöneticiye mesaj gönder", "Send a message to the admin", "إرسال رسالة إلى المسؤول"],
    ai: function () { try { return (Store.data && Store.data.settings.geminiKey) ? {provider:'gemini', key: Store.data.settings.geminiKey, model: Store.data.settings.aiModel || undefined} : null; } catch (e) { return null; } },
    firebase: function () { try { return (function(){var f=Store.data&&Store.data.settings.firebase; if(!f) return null; if(typeof f==='string'){var m=f.match(/\{[\s\S]*\}/); f=JSON.parse(m?m[0].replace(/(\w+)\s*:/g,'"$1":').replace(/'/g,'"').replace(/,\s*}/,'}'):'{}');} return f&&f.projectId&&f.apiKey?{projectId:f.projectId,apiKey:f.apiKey}:null;})(); } catch (e) { return null; } }
  });
})();
