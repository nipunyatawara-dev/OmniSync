import { NextResponse } from "next/server";
import {
  getProfiles,
  createProfile,
  updateProfile,
  getActiveProfileId,
  setActiveProfileId,
  deleteProfile,
} from "@/lib/profiles";

export async function GET() {
  const profiles = await getProfiles();
  const activeProfileId = await getActiveProfileId();
  return NextResponse.json({ profiles, activeProfileId });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "create") {
      const { name, profession, email, phone, businessName, profilePic, gitToken, password } = body;
      const newProfile = await createProfile({
        name,
        profession,
        email,
        phone,
        businessName,
        profilePic,
        gitToken,
        password,
      });
      return NextResponse.json({ success: true, profile: newProfile });
    }

    if (action === "select") {
      const { id } = body;
      await setActiveProfileId(id);
      return NextResponse.json({ success: true });
    }

    if (action === "update") {
      const { id, updates } = body;
      const updated = await updateProfile(id, updates);
      return NextResponse.json({ success: true, profile: updated });
    }

    if (action === "delete") {
      const { id } = body;
      await deleteProfile(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
