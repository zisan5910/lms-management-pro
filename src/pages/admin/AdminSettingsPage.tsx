import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { PaymentMethod, SocialLink, UsefulLink } from "@/types";
import { uploadToImgBB } from "@/lib/imgbb";
import { toast } from "sonner";
import { X, Plus, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const settings = useAppSettings();
  const [appName, setAppName] = useState(settings.appName);
  const [appLogo, setAppLogo] = useState(settings.appLogo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [youtubeChannel, setYoutubeChannel] = useState(settings.youtubeChannel);
  const [googleDrive, setGoogleDrive] = useState(settings.googleDrive);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(settings.paymentMethods?.length ? settings.paymentMethods : [{ name: "", number: "" }]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(settings.socialLinks?.length ? settings.socialLinks : [{ name: "", link: "" }]);
  const [usefulLinks, setUsefulLinks] = useState<UsefulLink[]>(settings.usefulLinks?.length ? settings.usefulLinks : [{ name: "", link: "" }]);
  const [saving, setSaving] = useState(false);

  useState(() => {
    setAppName(settings.appName);
    setAppLogo(settings.appLogo);
    setYoutubeChannel(settings.youtubeChannel);
    setGoogleDrive(settings.googleDrive);
    if (settings.paymentMethods?.length) setPaymentMethods(settings.paymentMethods);
    if (settings.socialLinks?.length) setSocialLinks(settings.socialLinks);
    if (settings.usefulLinks?.length) setUsefulLinks(settings.usefulLinks);
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      let logo = appLogo;
      if (logoFile) logo = await uploadToImgBB(logoFile);

      await setDoc(doc(db, "settings", "app"), {
        appName, appLogo: logo, youtubeChannel, googleDrive,
        paymentMethods: paymentMethods.filter((p) => p.name && p.number),
        socialLinks: socialLinks.filter((s) => s.name && s.link),
        usefulLinks: usefulLinks.filter((u) => u.name && u.link),
      });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto animate-fade-in overflow-x-hidden" style={{ maxWidth: '100vw' }}>
      <h2 className="text-xl font-semibold text-foreground mb-4">App Settings</h2>

      <div className="space-y-6">
        {/* App Info */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <h3 className="text-sm font-medium text-foreground">App Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">App Name</label>
              <input type="text" placeholder="App Name" value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">App Logo</label>
              {appLogo && <img src={appLogo} alt="" className="w-10 h-10 rounded-md object-contain mt-1" />}
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full text-sm mt-1" />
            </div>
          </div>
        </div>

        {/* Admin Shortcuts */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Admin Shortcuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">YouTube Channel</label>
              <input type="text" placeholder="YouTube Channel Link" value={youtubeChannel} onChange={(e) => setYoutubeChannel(e.target.value)} className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Google Drive</label>
              <input type="text" placeholder="Google Drive Link" value={googleDrive} onChange={(e) => setGoogleDrive(e.target.value)} className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm mt-1" />
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Payment Methods</h3>
          {paymentMethods.map((pm, i) => (
            <div key={i} className="flex gap-2 mt-2 items-center">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                <input value={pm.name} onChange={(e) => { const a = [...paymentMethods]; a[i] = { ...a[i], name: e.target.value }; setPaymentMethods(a); }} placeholder="Method Name" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={pm.number} onChange={(e) => { const a = [...paymentMethods]; a[i] = { ...a[i], number: e.target.value }; setPaymentMethods(a); }} placeholder="Number" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {paymentMethods.length > 1 && <button type="button" onClick={() => setPaymentMethods(paymentMethods.filter((_, j) => j !== i))} className="p-2 text-destructive flex-shrink-0"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          <button type="button" onClick={() => setPaymentMethods([...paymentMethods, { name: "", number: "" }])} className="text-xs text-primary mt-2">+ Add</button>
        </div>

        {/* Social Links */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Social Media Links</h3>
          {socialLinks.map((sl, i) => (
            <div key={i} className="flex gap-2 mt-2 items-center">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                <input value={sl.name} onChange={(e) => { const a = [...socialLinks]; a[i] = { ...a[i], name: e.target.value }; setSocialLinks(a); }} placeholder="Name" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={sl.link} onChange={(e) => { const a = [...socialLinks]; a[i] = { ...a[i], link: e.target.value }; setSocialLinks(a); }} placeholder="Link" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {socialLinks.length > 1 && <button type="button" onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))} className="p-2 text-destructive flex-shrink-0"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          <button type="button" onClick={() => setSocialLinks([...socialLinks, { name: "", link: "" }])} className="text-xs text-primary mt-2">+ Add</button>
        </div>

        {/* Useful Links */}
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Useful Links</h3>
          {usefulLinks.map((ul, i) => (
            <div key={i} className="flex gap-2 mt-2 items-center">
              <div className="flex-1 min-w-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
                <input value={ul.name} onChange={(e) => { const a = [...usefulLinks]; a[i] = { ...a[i], name: e.target.value }; setUsefulLinks(a); }} placeholder="Name" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={ul.link} onChange={(e) => { const a = [...usefulLinks]; a[i] = { ...a[i], link: e.target.value }; setUsefulLinks(a); }} placeholder="Link" className="w-full sm:flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {usefulLinks.length > 1 && <button type="button" onClick={() => setUsefulLinks(usefulLinks.filter((_, j) => j !== i))} className="p-2 text-destructive flex-shrink-0"><X className="h-4 w-4" /></button>}
            </div>
          ))}
          <button type="button" onClick={() => setUsefulLinks([...usefulLinks, { name: "", link: "" }])} className="text-xs text-primary mt-2">+ Add</button>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
