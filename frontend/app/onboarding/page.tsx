import { redirect } from "next/navigation";
import { saveBusinessProfileAction } from "@/app/actions";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: {
    error?: string;
    businessName?: string;
  };
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Set up your business profile</CardTitle>
            <CardDescription>
              This information powers your dashboard and future WhatsApp assistant replies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveBusinessProfileAction} className="grid gap-5">
              <FormMessage error={searchParams.error} />
              <div className="grid gap-2">
                <Label htmlFor="name">Business name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={business?.name ?? searchParams.businessName ?? ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={business?.description ?? ""}
                  placeholder="What do you sell or support?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openingHours">Opening hours</Label>
                <Input
                  id="openingHours"
                  name="openingHours"
                  defaultValue={business?.opening_hours ?? ""}
                  placeholder="Mon-Fri, 9 AM - 6 PM"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={business?.location ?? ""}
                    placeholder="City, country"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactInfo">Contact info</Label>
                  <Input
                    id="contactInfo"
                    name="contactInfo"
                    defaultValue={business?.contact_info ?? ""}
                    placeholder="Email, phone, website"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                <Input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  defaultValue={business?.whatsapp_number ?? ""}
                  placeholder="+94771234567"
                />
              </div>
              <Button type="submit" className="w-full md:w-fit">
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
