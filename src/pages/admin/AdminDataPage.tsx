import { useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const COLLECTIONS = ["users", "courses", "videos", "settings", "enrollRequests"];

export default function AdminDataPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [selectedExport, setSelectedExport] = useState<string[]>([...COLLECTIONS]);
  const [importTarget, setImportTarget] = useState<string>("all");

  const toggleExport = (col: string) => {
    setSelectedExport(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const handleExport = async (cols: string[]) => {
    if (cols.length === 0) { toast.error("Select at least one collection"); return; }
    setExporting("all");
    try {
      const data: Record<string, any[]> = {};
      await Promise.all(cols.map(async (col) => {
        const snap = await getDocs(collection(db, col));
        data[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = cols.length === 1 ? cols[0] : "all";
      a.download = `lms-${label}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err: any) { toast.error(err.message || "Export failed"); }
    setExporting(null);
  };

  const handleExportSingle = async (col: string) => {
    setExporting(col);
    try {
      const snap = await getDocs(collection(db, col));
      const data = { [col]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lms-${col}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${col} exported`);
    } catch (err: any) { toast.error(err.message); }
    setExporting(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>, target: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(target);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      for (const [colName, docs] of Object.entries(data) as [string, any[]][]) {
        if (target !== "all" && colName !== target) continue;
        for (const docData of docs) {
          const { id, ...rest } = docData;
          if (id) await setDoc(doc(db, colName, id), rest, { merge: true });
        }
      }
      toast.success(`Data imported successfully (merged)`);
    } catch (err: any) { toast.error(err.message || "Import failed"); }
    setImporting(null);
    e.target.value = "";
  };

  return (
    <div className="p-4 max-w-2xl mx-auto animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground mb-6">Backup</h2>

      {/* Export Section */}
      <div className="p-4 bg-card rounded-lg border border-border mb-4">
        <h3 className="font-medium text-foreground mb-3">Export Data</h3>
        
        <div className="space-y-2 mb-4">
          {COLLECTIONS.map((col) => (
            <div key={col} className="flex items-center justify-between p-2 rounded-md border border-border bg-background">
              <label className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleExport(col)}>
                <Checkbox checked={selectedExport.includes(col)} onCheckedChange={() => toggleExport(col)} />
                <span className="text-sm text-foreground capitalize">{col}</span>
              </label>
              <button
                onClick={() => handleExportSingle(col)}
                disabled={!!exporting}
                className="text-xs px-2 py-1 rounded bg-accent text-foreground hover:bg-accent/80 disabled:opacity-50"
              >
                <Download className="h-3 w-3 inline mr-1" />
                Export
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => handleExport(selectedExport)}
          disabled={!!exporting || selectedExport.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 w-full justify-center"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : `Export Selected (${selectedExport.length})`}
        </button>
      </div>

      {/* Import Section */}
      <div className="p-4 bg-card rounded-lg border border-border">
        <h3 className="font-medium text-foreground mb-3">Import Data</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Import a JSON backup file. Data will be merged with existing records.
        </p>

        <div className="space-y-2">
          {/* Import All */}
          <div className="p-2 rounded-md border border-border bg-background flex items-center justify-between">
            <span className="text-sm text-foreground font-medium">All Collections</span>
            <label className={`text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground cursor-pointer ${importing === "all" ? "opacity-50" : ""}`}>
              <Upload className="h-3 w-3 inline mr-1" />
              {importing === "all" ? "Importing..." : "Import"}
              <input type="file" accept=".json" onChange={(e) => handleImport(e, "all")} className="hidden" />
            </label>
          </div>

          {COLLECTIONS.map((col) => (
            <div key={col} className="p-2 rounded-md border border-border bg-background flex items-center justify-between">
              <span className="text-sm text-foreground capitalize">{col}</span>
              <label className={`text-xs px-3 py-1.5 rounded bg-accent text-foreground cursor-pointer ${importing === col ? "opacity-50" : ""}`}>
                <Upload className="h-3 w-3 inline mr-1" />
                {importing === col ? "Importing..." : "Import"}
                <input type="file" accept=".json" onChange={(e) => handleImport(e, col)} className="hidden" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
