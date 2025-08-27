import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Database, Eye, EyeOff, ListTree, XCircle } from "lucide-react";

type OperationBucket = {
  created?: number;
  updated?: number;
  deleted?: number;
  upserted?: number;
  fetched?: number;
  existing?: number;
  errors?: string[] | number;
  // optional item lists
  itemsCreated?: string[];
  itemsUpdated?: string[];
  itemsDeleted?: string[];
  items?: string[];
};

type Operations = Record<string, OperationBucket>;

export type SyncDetails = {
  timestamp: string;
  synced: number;
  errors: number;
  operations?: Operations;
  // passthrough for extra meta your functions may include
  meta?: Record<string, any>;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncDetails: SyncDetails | null;
  integrationName: string;
}

const number = (n: any) => (typeof n === "number" && !isNaN(n) ? n : 0);
const isNonEmptyArray = (v: any) => Array.isArray(v) && v.length > 0;

const Section: React.FC<{ title: string; children?: React.ReactNode; }> = ({ title, children }) => {
  return (
    <div className="rounded-md border p-3 mb-3">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <ListTree className="w-4 h-4" /> {title}
      </div>
      <div>{children}</div>
    </div>
  );
};

const KeyVal: React.FC<{ label: string; value: React.ReactNode; tone?: "ok"|"warn"|"danger"|"muted" }>
= ({ label, value, tone }) => {
  const toneClass =
    tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "danger" ? "text-red-700"
    : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${toneClass}`}>{value}</span>
    </div>
  );
};

const Collapser: React.FC<{title: string; children: React.ReactNode}> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <Button variant="ghost" size="sm" className="px-2" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
        {title}
      </Button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
};

const Pill: React.FC<{label: string; value: number; tone?: "ok"|"warn"|"danger"|"muted"}> = ({label, value, tone}) => {
  const palette =
    tone === "ok" ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : tone === "warn" ? "bg-amber-50 text-amber-800 border-amber-200"
    : tone === "danger" ? "bg-red-50 text-red-800 border-red-200"
    : "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border ${palette}`}>
      <span className="text-lg font-semibold">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
};

const renderBucket = (bucket: OperationBucket) => {
  const created = number(bucket.created);
  const updated = number(bucket.updated);
  const upserted = number(bucket.upserted);
  const deleted = number(bucket.deleted);
  const fetched = number(bucket.fetched || bucket.existing);
  const errCount = Array.isArray(bucket.errors) ? bucket.errors.length : number(bucket.errors);
  const hasAny = created || updated || upserted || deleted || fetched || errCount;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <Pill label="Created" value={created} tone="ok" />
      <Pill label="Updated" value={updated} tone="warn" />
      <Pill label="Deleted" value={deleted} tone="danger" />
      <Pill label="Upserted" value={upserted} />
      <Pill label="Fetched" value={fetched} />
      {typeof errCount === "number" && <Pill label="Errors" value={errCount} tone="danger" />}
      {!hasAny && <span className="text-sm text-muted-foreground col-span-full">No counters available for this entity.</span>}

      {isNonEmptyArray(bucket.itemsCreated) && (
        <Collapser title={`Show created items (${bucket.itemsCreated!.length})`}>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {bucket.itemsCreated!.map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </Collapser>
      )}
      {isNonEmptyArray(bucket.itemsUpdated) && (
        <Collapser title={`Show updated items (${bucket.itemsUpdated!.length})`}>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {bucket.itemsUpdated!.map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </Collapser>
      )}
      {isNonEmptyArray(bucket.itemsDeleted) && (
        <Collapser title={`Show deleted items (${bucket.itemsDeleted!.length})`}>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {bucket.itemsDeleted!.map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </Collapser>
      )}
      {isNonEmptyArray(bucket.items) && (
        <Collapser title={`Show items (${bucket.items!.length})`}>
          <ul className="text-xs list-disc pl-5 space-y-1">
            {bucket.items!.map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </Collapser>
      )}
      {Array.isArray(bucket.errors) && isNonEmptyArray(bucket.errors) && (
        <Collapser title={`Show error messages (${(bucket.errors as string[]).length})`}>
          <ul className="text-xs list-disc pl-5 space-y-1 text-red-700">
            {(bucket.errors as string[]).map((s, i) => (<li key={i}>{s}</li>))}
          </ul>
        </Collapser>
      )}
    </div>
  );
};

const SyncDetailsModal: React.FC<Props> = ({ open, onOpenChange, syncDetails, integrationName }) => {
  const [showRaw, setShowRaw] = useState(false);

  const ops = useMemo<Operations>(() => (syncDetails?.operations || {}) as Operations, [syncDetails]);
  const entities = useMemo(() => Object.keys(ops || {}).sort(), [ops]);

  if (!syncDetails) return null;

  const dateStr = new Date(syncDetails.timestamp).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sync Details - {integrationName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <Card><CardContent className="p-4">
            <KeyVal label="Items Synced" value={<span className="text-xl">{syncDetails.synced || 0}</span>} tone="ok" />
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <KeyVal label="Errors" value={<span className="text-xl">{syncDetails.errors || 0}</span>} tone={number(syncDetails.errors) ? "danger" : "ok"} />
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <KeyVal label="Sync Time" value={dateStr} />
          </CardContent></Card>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Operation Details</h3>
          <Button size="sm" variant="outline" onClick={() => setShowRaw(v => !v)}>
            {showRaw ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showRaw ? "Hide raw JSON" : "Show raw JSON"}
          </Button>
        </div>

        {entities.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <div className="flex items-center justify-center">
              <XCircle className="w-8 h-8 mb-2 text-slate-300" />
            </div>
            No operation details available
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {entities.map((entity) => (
              <Section key={entity} title={entity}>
                {renderBucket(ops[entity] || {})}
              </Section>
            ))}
          </div>
        )}

        {showRaw && (
          <div className="mt-2">
            <Section title="Raw payload">
              <pre className="text-xs bg-slate-50 rounded-md p-3 overflow-auto max-h-72">
                {JSON.stringify(syncDetails, null, 2)}
              </pre>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SyncDetailsModal;
