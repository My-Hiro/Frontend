'use client';

import { Save, Globe, Store } from "lucide-react";
import { useState, useEffect } from "react";
import { useMerchant } from "@/lib/state/merchantContext";
import { useStoreProfile } from "@/hooks/useStoreProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const { storeId } = useMerchant();
  const { profile, updateProfile, isMutating } = useStoreProfile(storeId);
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    if (profile) setDraft(profile);
  }, [profile]);

  if (!draft) return null;

  const handleSave = async () => {
    try {
      await updateProfile(draft);
      alert("Settings saved successfully!");
    } catch (err) {
      alert("Failed to save settings.");
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your store profile, team, and account preferences.</p>
        </div>
        <Button onClick={handleSave} disabled={isMutating}>
          <Save className="mr-2 h-4 w-4" /> {isMutating ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Store Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" /> Basic Information
                </CardTitle>
                <CardDescription>Public details about your store.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Store Name</label>
                  <Input 
                    value={draft.name} 
                    onChange={(e) => setDraft({...draft, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact Email</label>
                  <Input 
                    type="email"
                    value={draft.contactEmail} 
                    onChange={(e) => setDraft({...draft, contactEmail: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> Regional & Localization
                </CardTitle>
                <CardDescription>Currency, language and timezone settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Currency</label>
                  <Input value={draft.currency} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Timezone</label>
                  <Input value={draft.timezone} disabled />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Low Stock Alerts</p>
                  <p className="text-xs text-muted-foreground">Receive a notification when items fall below their minimum threshold.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold">Daily Sales Reports</p>
                  <p className="text-xs text-muted-foreground">Get a summary of your sales at the end of each day.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
