"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getBusinessProfile(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function loginAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  const business = data.user ? await getBusinessProfile(data.user.id) : null;
  redirect(business ? "/dashboard" : "/onboarding");
}

export async function registerAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const businessName = readString(formData, "businessName");
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        business_name: businessName
      }
    }
  });

  if (error) {
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/auth/login?message=Check your email to confirm your account, then sign in.");
  }

  redirect(`/onboarding?businessName=${encodeURIComponent(businessName)}`);
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function saveBusinessProfileAction(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const payload = {
    user_id: user.id,
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    opening_hours: readString(formData, "openingHours"),
    location: readString(formData, "location"),
    contact_info: readString(formData, "contactInfo"),
    whatsapp_number: readString(formData, "whatsappNumber")
  };

  const { error } = await supabase
    .from("businesses")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
